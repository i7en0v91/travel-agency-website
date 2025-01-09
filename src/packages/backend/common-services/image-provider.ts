import { CachedResultsInAppServicesEnabled, type PreviewMode, type EntityId, type ImageCategory, type IAppLogger, type IImageCategoryInfo, AppConfig, EntityChangeSubscribersOrder, type IImageProcessor} from '@golobe-demo/shared';
import { type IEntityChangeNotificationTask, type IImageCategoryLogic, type ImageBytesOptions, type IImageBytes, type IImageFileInfoUnresolved, type EntityChangeNotificationCallback, type EntityChangeNotificationCallbackArgs, type EntityChangeNotificationSubscriberId, type IImageProvider, type IImageLogic } from '../types';
import { convertRawToBuffer } from '../helpers/nitro';
import { type Storage, type StorageValue } from 'unstorage';
import { type H3Event } from 'h3';

interface IImageMetaCache {
  mimeType: string,
  modifiedUtc: number
}

export class ImageProvider implements IImageProvider {
  private readonly logger: IAppLogger;
  private readonly imageLogic: IImageLogic;
  private readonly imageProcessor: IImageProcessor;
  private readonly srcsetCache: Storage<StorageValue>;
  private readonly imageCategoryLogic: IImageCategoryLogic;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['imageLogic', 'imageCategoryLogic', 'imageProcessor', 'entityChangeNotifications', 'srcsetCache', 'logger'] as const;
  constructor (imageLogic: IImageLogic, imageCategoryLogic: IImageCategoryLogic, imageProcessor: IImageProcessor, entityChangeNotifications: IEntityChangeNotificationTask, srcsetCache: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger;
    this.imageLogic = imageLogic;
    this.imageProcessor = imageProcessor;
    this.srcsetCache = srcsetCache;
    this.imageCategoryLogic = imageCategoryLogic;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('(ImageProvider) subscribing for image entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'Image',
        ids: 'all'
      }, {
        entity: 'ImageCategory',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.ImageProvider
    }, this.entityChangeCallback);

    this.logger.verbose(`(ImageProvider) subscribed image entities changes, subscriberId=${subscriberId}`);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('(ImageProvider) entities change callback');

    if(args.target === 'too-much') {
      this.logger.warn('(ImageProvider) recevied too much image entities change notification, clearing entire image cache');
      await this.clearAllCacheSafe();
    } else {
      for(let i = 0; i < args.target.length; i++) {
        const entity = args.target[i].entity;
        const ids = args.target[i].ids;
        if(entity === 'Image') {
          let imageInfos: IImageFileInfoUnresolved[];
          try {
            imageInfos = await this.imageLogic.getImagesByIds(ids, false);
          } catch(err: any) {
            this.logger.warn(`(ImageProvider) exception while clearing changed images cache - cannot load image infos, ids=[${ids.join(',')}]`, err);
            continue;
          }

          for(let j = 0; j < imageInfos.length; j++) {
            const imageInfo = imageInfos[j];
            await this.clearImageCacheSafe(imageInfo.id, imageInfo.slug, imageInfo.category);
          }
        } else {
          for(let j = 0; j < ids.length; j++) {
            const categoryId: EntityId = ids[j] as EntityId;
            await this.clearCacheForImageCategorySafe(categoryId);
          }
        }
      }
    }

    this.logger.debug('(ImageProvider) entities change callback completed');
  };

  async clearCacheForImageCategorySafe(imageCategoryId: EntityId): Promise<void> {
    this.logger.verbose(`(ImageProvider) clearing image cache for category, imageCategoryId=${imageCategoryId}`);

    let images: IImageFileInfoUnresolved[] = [];
    let category: IImageCategoryInfo | undefined;
    try {
      category = await this.imageCategoryLogic.findCategory(imageCategoryId);
      if(!category) {
        this.logger.warn(`(ImageProvider) cannot clear image cache for category - not found, imageCategoryId=${imageCategoryId}`);  
        return;
      }
  
      images = await this.imageLogic.getAllImagesByCategory(category.kind, true, false);
    } catch(err: any) {
      this.logger.warn(`(ImageProvider) exception while obtaining all images for category, imageCategoryId=${imageCategoryId}, kind=${category!.kind}`, err);  
      return;
    }

    let succeeded = 0;
    let failed = 0;
    for(let i = 0; i < images.length; i++) {
      const imageInfo = images[i];
      const isOk = await this.clearImageCacheSafe(imageInfo.id, imageInfo.slug, category.kind);
      if(isOk) { 
        succeeded++;
      } else {
        failed++;
      }
    }

    this.logger.verbose(`(ImageProvider) cache for image category cleared, imageCategoryId=${imageCategoryId}, deleted count=${succeeded}, failed count=${failed}`);
  };

  async clearImageCacheSafe(id: EntityId, slug: string, category: ImageCategory): Promise<boolean> {
    try {
      await this.clearImageCache(id, category);
      await this.clearImageCache(slug, category);
      return true;
    } catch(err: any) {
      this.logger.warn(`(ImageProvider) exception while clearing image cache, id=${id}, category=${category}`, err);  
      return false;
    }
  }

  async clearAllCacheSafe(): Promise<void> {
    this.logger.info('(ImageProvider) clearing entire image cache');
    
    let count = -1;
    try {
      count = (await this.srcsetCache.getKeys()).length;
      await this.srcsetCache.clear();
    } catch(err: any) {
      this.logger.warn('(ImageProvider) exception occured while clearing entire cache', err);
    }

    this.logger.info(`(ImageProvider) clearing entire image cache - completed, count=${count}`);
  };

  getImageBytesMetaCacheKey = (idOrSlug: EntityId | string, category: ImageCategory, bytesOptions: ImageBytesOptions) => {
    return `meta:${idOrSlug}-${category}-${bytesOptions}`;
  };

  getImageBytesDataCacheKey = (idOrSlug: EntityId | string, category: ImageCategory, bytesOptions: ImageBytesOptions) => {
    return `data:${idOrSlug}-${category}-${bytesOptions}`;
  };

  async getImageBytesFromCache (dataCacheKey: string, category: ImageCategory, bytesOptions: ImageBytesOptions): Promise<Buffer | undefined> {
    this.logger.debug(`(ImageProvider) checking image bytes data cache: key=${dataCacheKey}, category=${category}, options=${bytesOptions}`);

    const imageBytesRaw = await this.srcsetCache.getItemRaw(dataCacheKey);
    if (!imageBytesRaw) {
      this.logger.debug(`(ImageProvider) cache miss for image bytes, key=${dataCacheKey}, category=${category}, options=${bytesOptions}`);
      return undefined;
    }
    const result = convertRawToBuffer(imageBytesRaw, this.logger);

    this.logger.debug(`(ImageProvider) cache hit for image bytes, key=${dataCacheKey}, category=${category}, options=${bytesOptions}, size=${result.length}`);
    return result;
  }

  async setImageBytesToCache (dataCacheKey: string, category: ImageCategory, bytesOptions: ImageBytesOptions, data: Buffer): Promise<void> {
    this.logger.verbose(`(ImageProvider) setting image bytes to cache: key=${dataCacheKey}, category=${category}, options=${bytesOptions}, length=${data.length}`);

    try {
      await this.srcsetCache.setItemRaw(dataCacheKey, data);
    } catch(err: any) {
      this.logger.warn(`(ImageProvider) failed to set image bytes to cache: key=${dataCacheKey}, category=${category}, options=${bytesOptions}, length=${data.length}`, err);
      return;
    }

    this.logger.verbose(`(ImageProvider) image bytes set to cache: key=${dataCacheKey}, category=${category}, options=${bytesOptions}`);
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, bytesOptions: ImageBytesOptions, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined> {
    this.logger.debug(`(ImageProvider) accessing image bytes: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
    
    const metaCacheKey = this.getImageBytesMetaCacheKey((id ?? slug)!, category, bytesOptions);
    const dataCacheKey = this.getImageBytesDataCacheKey((id ?? slug)!, category, bytesOptions);
    if(!previewMode) {
      const cachedBytes = await this.getImageBytesFromCache(dataCacheKey, category, bytesOptions);
      if (cachedBytes) {
        this.logger.debug(`(ImageProvider) image bytes cache hit: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
        let meta = await this.srcsetCache.getItem(metaCacheKey) as IImageMetaCache | null;
        if (!meta) {
          const imageInfo = await this.imageLogic.findImage(id, slug, category, event, previewMode);
          if (imageInfo) {
            meta = { mimeType: imageInfo.file.mime, modifiedUtc: imageInfo.file.modifiedUtc.getTime() };
            await this.srcsetCache.setItem(metaCacheKey, meta);
          }
        }
        if (meta) {
          return { bytes: cachedBytes, mimeType: meta.mimeType, modifiedUtc: new Date(meta.modifiedUtc) };
        }
        this.logger.warn(`(ImageProvider) cannot find image in DB while bytes exist in cache: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
        return undefined;
      }
    }

    const imageBytes = await this.imageLogic.getImageBytes(id, slug, category, event, previewMode);
    if (!imageBytes) {
      this.logger.warn(`(ImageProvider) image bytes not found: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      return undefined;
    }

    const result: IImageBytes = { bytes: imageBytes.bytes, mimeType: imageBytes.mimeType, modifiedUtc: imageBytes.modifiedUtc };
    if (bytesOptions === 'leave-as-is') {
      this.logger.verbose(`(ImageProvider) image bytes created - left as-is: id=${id}, slug=${slug}, options=${bytesOptions}, previewMode=${previewMode}`);
    } else {
      this.logger.verbose(`(ImageProvider) processing image bytes: id=${id}, slug=${slug}, options=${bytesOptions}, previewMode=${previewMode}`);
      const scale = bytesOptions;
      result.bytes = await this.scaleImage(result.bytes, scale, (id ?? slug)!, category);
      this.logger.verbose(`(ImageProvider) image bytes created, id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      if(!previewMode) {
        const meta: IImageMetaCache = {
          mimeType: imageBytes.mimeType,
          modifiedUtc: imageBytes.modifiedUtc.getTime()
        };
        await this.srcsetCache.setItem(metaCacheKey, meta);
        await this.setImageBytesToCache(dataCacheKey, category, bytesOptions, result.bytes);
        this.logger.debug(`(ImageProvider) image bytes cached, id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      }
    }

    return result;
  }

  async scaleImage (bytes: Buffer, scale: number, idOrSlug: EntityId | string, category: ImageCategory): Promise<Buffer> {
    this.logger.verbose(`(ImageProvider) scaling image: id=${idOrSlug}, category=${category}, scale=${scale}`);
    try {
      const categoryInfo = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(category)!;
      return await this.imageProcessor.scaleImage(bytes, scale, categoryInfo.width);
    } catch (err) {
      this.logger.warn(`(ImageProvider) failed to scale image: id=${idOrSlug}, category=${category}, scale=${scale}`, err);
      return bytes;
    }
  }

  getAllPossibleImageBytesOptions = (): ImageBytesOptions[] => {
    const result = [] as ImageBytesOptions[];

    const scaleStep = AppConfig.images.scaleStep;
    const numSteps = Math.round(1.0 / scaleStep);
    for (let i = 0; i <= numSteps; i++) {
      result.push(i * scaleStep);
    }
    result.push('leave-as-is');

    return result;
  };

  async clearImageCache (idOrSlug: EntityId | string, category: ImageCategory): Promise<void> {
    this.logger.verbose(`(ImageProvider) clearing image cache: id=${idOrSlug}, category=${category}`);

    const bytesOptions = this.getAllPossibleImageBytesOptions();
    for (let i = 0; i < bytesOptions.length; i++) {
      const options = bytesOptions[i];
      const metaCacheKey = this.getImageBytesMetaCacheKey(idOrSlug, category, options);
      const dataCacheKey = this.getImageBytesDataCacheKey(idOrSlug, category, options);
      await this.srcsetCache.removeItem(metaCacheKey);
      await this.srcsetCache.removeItem(dataCacheKey);
    }

    this.logger.verbose(`(ImageProvider) image cache cleared: id=${idOrSlug}, category=${category}`);
  }
}
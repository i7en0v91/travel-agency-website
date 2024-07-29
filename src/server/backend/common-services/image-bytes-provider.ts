import { access, mkdir, readdir, readFile, writeFile, rm } from 'fs/promises';
import sharp from 'sharp';
import { join } from 'pathe';
import { type Storage, type StorageValue } from 'unstorage';
import { type PreviewMode, type IImageFileInfoUnresolved, type EntityChangeNotificationCallback, type EntityChangeNotificationCallbackArgs, type EntityChangeNotificationSubscriberId, type IImageBytesProvider, type IImageLogic, type EntityId, type ImageBytesOptions, type IImageBytes, type ImageCategory, type IImageCategoryLogic, type IAppLogger, type IEntityChangeNotificationTask, type IImageCategoryInfo } from '../app-facade/interfaces';
import { CachedResultsInAppServicesEnabled, AppConfig, EntityChangeSubscribersOrder } from '../app-facade/implementation';
import { type H3Event } from 'h3';

interface IImageMetaCache {
  mimeType: string,
  modifiedUtc: number
}

export class ImageBytesProvider implements IImageBytesProvider {
  private readonly MaxCacheClearAttempsCount = 3;
  private readonly MaxCacheClearAttempsDelay = 500;

  private readonly logger: IAppLogger;
  private readonly imageLogic: IImageLogic;
  private readonly imageCacheDir: string;
  private readonly cache: Storage<StorageValue>;
  private readonly imageCategoryLogic: IImageCategoryLogic;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['imageLogic', 'imageCategoryLogic', 'entityChangeNotifications', 'cache', 'imageCacheDir', 'logger'] as const;
  constructor (imageLogic: IImageLogic, imageCategoryLogic: IImageCategoryLogic, entityChangeNotifications: IEntityChangeNotificationTask, cache: Storage<StorageValue>, imageCacheDir: string, logger: IAppLogger) {
    this.logger = logger;
    this.imageLogic = imageLogic;
    this.cache = cache;
    this.imageCacheDir = imageCacheDir;
    this.imageCategoryLogic = imageCategoryLogic;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('(ImageBytesProvider) subscribing for image entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'Image',
        ids: 'all'
      }, {
        entity: 'ImageCategory',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.ImageBytesProvider
    }, this.entityChangeCallback);

    this.logger.verbose(`(ImageBytesProvider) subscribed image entities changes, subscriberId=${subscriberId}`);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('(ImageBytesProvider) entities change callback');

    if(args.target === 'too-much') {
      this.logger.warn('(ImageBytesProvider) recevied too much image entities change notification, clearing entire image cache');
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
            this.logger.warn(`(ImageBytesProvider) exception while clearing changed images cache - cannot load image infos, ids=[${ids.join(',')}]`, err);
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

    this.logger.debug('(ImageBytesProvider) entities change callback completed');
  };

  async clearCacheForImageCategorySafe(imageCategoryId: EntityId): Promise<void> {
    this.logger.verbose(`(ImageBytesProvider) clearing image cache for category, imageCategoryId=${imageCategoryId}`);

    let images: IImageFileInfoUnresolved[] = [];
    let category: IImageCategoryInfo | undefined;
    try {
      category = await this.imageCategoryLogic.findCategory(imageCategoryId);
      if(!category) {
        this.logger.warn(`(ImageBytesProvider) cannot clear image cache for category - not found, imageCategoryId=${imageCategoryId}`);  
        return;
      }
  
      images = await this.imageLogic.getAllImagesByCategory(category.kind, true, false);
    } catch(err: any) {
      this.logger.warn(`(ImageBytesProvider) exception while obtaining all images for category, imageCategoryId=${imageCategoryId}, kind=${category!.kind}`, err);  
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

    this.logger.verbose(`(ImageBytesProvider) cache for image category cleared, imageCategoryId=${imageCategoryId}, deleted count=${succeeded}, failed count=${failed}`);
  };

  async clearImageCacheSafe(id: EntityId, slug: string, category: ImageCategory): Promise<boolean> {
    try {
      await this.clearImageCache(id, category);
      await this.clearImageCache(slug, category);
      return true;
    } catch(err: any) {
      this.logger.warn(`(ImageBytesProvider) exception while clearing image cache, id=${id}, category=${category}`);  
      return false;
    }
  }

  async clearAllCacheSafe(): Promise<void> {
    this.logger.info('(ImageBytesProvider) clearing entire image cache');

    let dirFiles: string[];
    try {
      dirFiles = await readdir(this.imageCacheDir);
    } catch(err: any) {
      this.logger.warn(`(ImageBytesProvider) failed to read cache directory content, path=${this.imageCacheDir}`, err);
      return;
    }
     
    let succeeded = 0;
    let failed = 0;
    for(let i = 0; i < dirFiles.length; i++) {
      const fileName = dirFiles[i];
      const imgDir = join(this.imageCacheDir, fileName);
      try {
        await rm(imgDir, { force: true, recursive: true, maxRetries: 3, retryDelay: 250 });
        succeeded++;
      } catch(err: any) {
        this.logger.warn(`(ImageBytesProvider) exception occured while clearing entire cache - failed to delete dir=[${imgDir}]`, err);
        failed++;
      }
    }

    this.logger.info(`(ImageBytesProvider) clearing entire image cache - completed, deleted count=${succeeded}, failed count=${failed}`);
  };

  async getImageSize (imgData: Buffer): Promise<{width: number, height: number}> {
    const sharpObj = sharp(imgData);
    const metadata = await sharpObj.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('failed to parse image');
    }
    return { width: metadata.width!, height: metadata.height! };
  }

  async ensureImageCacheDir (dir: string): Promise<void> {
    this.logger.debug(`(ImageBytesProvider) ensuring image cache dir=${dir}`);
    try {
      await access(dir);
    } catch (err: any) {
      this.logger.verbose(`(ImageBytesProvider) creating image cache directory dir=${dir}`);
      await mkdir(dir, { recursive: true });
    }
  }

  async getImageBytesFromCache (idOrSlug: string | undefined, category: ImageCategory, bytesOptions: ImageBytesOptions): Promise<Buffer | undefined> {
    this.logger.debug(`(ImageBytesProvider) checking image bytes cache: idOrSlug=${idOrSlug}, category=${category}, options=${bytesOptions}`);

    const cacheFile = join(this.imageCacheDir, `${idOrSlug}-${category}`, `${idOrSlug}-${category}-${bytesOptions}`);
    try {
      await access(cacheFile);
    } catch (err: any) {
      this.logger.debug(`(ImageBytesProvider) cache miss for image bytes, idOrSlug=${idOrSlug}, category=${category}, options=${bytesOptions}`);
      return undefined;
    }

    this.logger.debug(`(ImageBytesProvider) cache hit for image bytes, idOrSlug=${idOrSlug}, category=${category}, options=${bytesOptions}`);
    return await readFile(cacheFile);
  }

  getImageCacheDir = (idOrSlug: EntityId | string, category: ImageCategory): string => {
    return join(this.imageCacheDir, `${idOrSlug}-${category}`);
  };

  getImageBytesCacheKey = (idOrSlug: EntityId | string, category: ImageCategory, bytesOptions: ImageBytesOptions) => {
    return `imgbytes:${idOrSlug}-${category}-${bytesOptions}`;
  };

  async setImageBytesToCache (idOrSlug: EntityId | string, category: ImageCategory, bytesOptions: ImageBytesOptions, data: Buffer): Promise<void> {
    this.logger.verbose(`(ImageBytesProvider) setting image bytes to cache: id=${idOrSlug}, category=${category}, options=${bytesOptions}, length=${data.length}`);

    const cacheDir = this.getImageCacheDir(idOrSlug, category);
    await this.ensureImageCacheDir(cacheDir);
    const cacheFile = join(this.imageCacheDir, `${idOrSlug}-${category}`, `${idOrSlug}-${category}-${bytesOptions}`);
    await writeFile(cacheFile, data);

    this.logger.verbose(`(ImageBytesProvider) image bytes set to cache: id=${idOrSlug}, category=${category}, options=${bytesOptions}`);
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, bytesOptions: ImageBytesOptions, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined> {
    this.logger.debug(`(ImageBytesProvider) accessing image bytes: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
    
    const cacheKey = this.getImageBytesCacheKey((id ?? slug)!, category, bytesOptions);
    if(!previewMode) {
      const cachedBytes = await this.getImageBytesFromCache((id ?? slug)!, category, bytesOptions);
      if (cachedBytes) {
        this.logger.debug(`(ImageBytesProvider) image bytes cache hit: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
        let meta = await this.cache.getItem(cacheKey) as IImageMetaCache | null;
        if (!meta) {
          const imageInfo = await this.imageLogic.findImage(id, slug, category, event, previewMode);
          if (imageInfo) {
            meta = { mimeType: imageInfo.file.mime, modifiedUtc: imageInfo.file.modifiedUtc.getTime() };
            await this.cache.setItem(cacheKey, meta);
          }
        }
        if (meta) {
          return { bytes: cachedBytes, mimeType: meta.mimeType, modifiedUtc: new Date(meta.modifiedUtc) };
        }
        this.logger.warn(`(ImageBytesProvider) cannot find image in DB while bytes exist in cache: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
        return undefined;
      }
    }

    const imageBytes = await this.imageLogic.getImageBytes(id, slug, category, event, previewMode);
    if (!imageBytes) {
      this.logger.warn(`(ImageBytesProvider) image bytes not found: id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      return undefined;
    }

    const result: IImageBytes = { bytes: imageBytes.bytes, mimeType: imageBytes.mimeType, modifiedUtc: imageBytes.modifiedUtc };
    if (bytesOptions === 'leave-as-is') {
      this.logger.verbose(`(ImageBytesProvider) image bytes created - left as-is: id=${id}, slug=${slug}, options=${bytesOptions}, previewMode=${previewMode}`);
    } else {
      this.logger.verbose(`(ImageBytesProvider) processing image bytes: id=${id}, slug=${slug}, options=${bytesOptions}, previewMode=${previewMode}`);
      const scale = bytesOptions;
      result.bytes = await this.scaleImage(result.bytes, scale, (id ?? slug)!, category);
      this.logger.verbose(`(ImageBytesProvider) image bytes created, id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      if(!previewMode) {
        const meta: IImageMetaCache = {
          mimeType: imageBytes.mimeType,
          modifiedUtc: imageBytes.modifiedUtc.getTime()
        };
        await this.cache.setItem(cacheKey, meta);
        await this.setImageBytesToCache((id ?? slug)!, category, bytesOptions, result.bytes);
        this.logger.debug(`(ImageBytesProvider) image bytes cached, id=${id}, slug=${slug}, category=${category}, options=${bytesOptions}, previewMode=${previewMode}`);
      }
    }

    return result;
  }

  async scaleImage (bytes: Buffer, scale: number, idOrSlug: EntityId | string, category: ImageCategory): Promise<Buffer> {
    this.logger.verbose(`(ImageBytesProvider) scaling image: id=${idOrSlug}, category=${category}, scale=${scale}`);
    try {
      const sharpObj = sharp(bytes);
      const metadata = await sharpObj.metadata();
      if (!metadata.width) {
        this.logger.warn(`(ImageBytesProvider) failed to parse image: id=${idOrSlug}, category=${category}`);
        return bytes;
      }

      const categoryInfo = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(category)!;
      const scaleAdj = Math.min(Math.max(1.0, categoryInfo.width / metadata.width) * scale, 1.0);
      this.logger.verbose(`(ImageBytesProvider) image scaling coef will be adjusted: id=${idOrSlug}, category=${category}, realWidth=${metadata.width}, categoryWidth=${categoryInfo.width}, originalScale=${scale}, adjScale=${scaleAdj}`);

      const targetWidth = Math.ceil(metadata.width * scaleAdj);
      return await sharpObj.resize(targetWidth).toBuffer();
    } catch (err) {
      this.logger.warn(`(ImageBytesProvider) failed to scale image: id=${idOrSlug}, category=${category}, scale=${scale}`, err);
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
    this.logger.verbose(`(ImageBytesProvider) clearing image cache: id=${idOrSlug}, category=${category}`);

    const cacheDir = this.getImageCacheDir(idOrSlug, category);
    await rm(cacheDir, { recursive: true, force: true, maxRetries: this.MaxCacheClearAttempsCount, retryDelay: this.MaxCacheClearAttempsDelay });

    const bytesOptions = this.getAllPossibleImageBytesOptions();
    for (let i = 0; i < bytesOptions.length; i++) {
      const cacheKey = this.getImageBytesCacheKey(idOrSlug, category, bytesOptions[i]);
      await this.cache.removeItem(cacheKey);
    }

    this.logger.verbose(`(ImageBytesProvider) image cache cleared: id=${idOrSlug}, category=${category}`);
  }
}

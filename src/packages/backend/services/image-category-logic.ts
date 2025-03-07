import { formatAppCacheKey, EntityIdTestRegEx, EntityChangeSubscribersOrder, ImageCategory, newUniqueId, DbVersionInitial, lookupKeyByValueOrThrow, tryLookupKeyByValue, type IImageCategoryInfo, type EntityId, type IAppLogger } from '@golobe-demo/shared';
import type { PrismaClient } from '@prisma/client';
import type { Storage, StorageValue } from 'unstorage';
import { ImageCategoryInfosCacheKey } from './../helpers/utils';
import type { EntityChangeNotificationCallbackArgs, EntityChangeNotificationCallback, EntityChangeNotificationSubscriberId, IEntityChangeNotificationTask, IImageCategoryLogic } from './../types';
import { mapEnumDbValue } from '../helpers/db';

export class ImageCategoryLogic implements IImageCategoryLogic {
  private readonly CacheKey = formatAppCacheKey(ImageCategoryInfosCacheKey);

  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly cache: Storage<StorageValue>;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['dbRepository', 'entityChangeNotifications', 'cache', 'logger'] as const;
  constructor (dbRepository: PrismaClient, entityChangeNotifications: IEntityChangeNotificationTask, cache: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'ImageCategoryLogic' });
    this.dbRepository = dbRepository;
    this.cache = cache;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('subscribing for image category entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'ImageCategory',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.ImageCategoryLogic
    }, this.entityChangeCallback);

    this.logger.verbose('subscribed for image category entities changes', subscriberId);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('entities change callback');
    if(args.target === 'too-much' || (args.target.find(x => x.entity === 'ImageCategory')?.ids.length ?? 0) > 0) {
      await this.clearCategoriesCache();
    }
    this.logger.debug('entities change callback completed');
  };

  async findCategory (category: ImageCategory | EntityId): Promise<IImageCategoryInfo | undefined> {
    this.logger.debug('finding category', category);
    const categoryEntity = EntityIdTestRegEx.test(category) ? 
      (
        await this.dbRepository.imageCategory.findUnique({
          where: { id: category },
          select: { id: true, width: true, height: true, kind: true, createdUtc: true, modifiedUtc: true }
        })
      ) :
      (
        await this.dbRepository.imageCategory.findFirst({
          where: { kind: mapEnumDbValue(category) },
          select: { id: true, width: true, height: true, kind: true, createdUtc: true, modifiedUtc: true }
        })
      );
    
    if (!categoryEntity) {
      this.logger.warn('category not found', undefined, category);
      return undefined;
    }

    const result: IImageCategoryInfo = {
      id: categoryEntity.id,
      width: categoryEntity.width,
      height: categoryEntity.height,
      kind: lookupKeyByValueOrThrow(ImageCategory, categoryEntity.kind),
      createdUtc: categoryEntity.createdUtc,
      modifiedUtc: categoryEntity.modifiedUtc
    };
    this.logger.debug('category found', { category: result.kind, id: result.id });
    return result;
  }

  async createCategory (type: ImageCategory, width: number, height: number): Promise<EntityId> {
    this.logger.info('creating category', { type, width, height });
    const categoryId = (await this.dbRepository.imageCategory.create({ 
      data: { 
        id: newUniqueId(),
        kind: mapEnumDbValue(type), 
        version: DbVersionInitial,
        width, 
        height 
      }, 
      select: { 
        id: true 
      } 
    })).id as EntityId;
    await this.clearCategoriesCache();
    this.logger.info('category created', { type, id: categoryId });
    return categoryId;
  }

  async getImageCategoryInfos (allowCachedValue: boolean): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>> {
    this.logger.debug('accessing image category infos', allowCachedValue);

    let entries = allowCachedValue ? (await this.cache.getItem(this.CacheKey) as [ImageCategory, IImageCategoryInfo][]) : undefined;
    if (!entries) {
      entries = [];
      this.logger.verbose('image category infos - cache miss, loading from db');
      const categoryEntities = await this.dbRepository.imageCategory.findMany({ select: { id: true, kind: true, width: true, height: true, createdUtc: true, modifiedUtc: true } });
      for (let i = 0; i < categoryEntities.length; i++) {
        const entity = categoryEntities[i];
        const enumValue = tryLookupKeyByValue(ImageCategory, entity.kind) as ImageCategory; // ignoring e.g. unit test categories
        if(enumValue) {
          entries.push([enumValue, { width: entity.width, height: entity.height, id: entity.id, kind: enumValue, createdUtc: entity.createdUtc, modifiedUtc: entity.modifiedUtc }]);  
        }
      }
      this.logger.debug('image category infos - updating cache', { count: entries.length, allowCachedValue });
      await this.cache.setItem(this.CacheKey, entries);
    }

    const result = new Map<ImageCategory, IImageCategoryInfo>(entries);
    this.logger.debug('image category infos', { count: entries.length, allowCachedValue });
    return result;
  }

  async clearCategoriesCache(): Promise<void> {
    this.logger.verbose('clearing categories cache');
    await this.cache.removeItem(this.CacheKey);
  }
}

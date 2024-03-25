import { type Storage, type StorageValue } from 'unstorage';
import dayjs from 'dayjs';
import isString from 'lodash-es/isString';
import { type IAppLogger } from '../shared/applogger';
import { type IEntityCache, type IEntityCacheItem, type IEntityCacheSlugItem, type CacheEntityType, type EntityId } from '../shared/interfaces';
import { WebApiRoutes } from '../shared/constants';
import { get } from '../shared/rest-utils';

declare interface IEntityCacheItemEntry<TCacheItem extends { type: CacheEntityType; } & IEntityCacheItem> {
  item: TCacheItem,
  expireAt?: Date
}

export class EntityCache implements IEntityCache {
  cache: Storage<StorageValue>;
  logger: IAppLogger;

  public static inject = ['logger', 'cache'] as const;
  constructor (logger: IAppLogger, cache: Storage<StorageValue>) {
    this.logger = logger;
    this.cache = cache;
  }

  getItemKey = (idOrSlug: EntityId | string, type: CacheEntityType): string => {
    return `EntityCache-${type}-${idOrSlug}`;
  };

  fetchFromServer = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType; } & IEntityCacheItem>(idsOrSlugs: EntityId[] | string[], type: TEntityType): Promise<TCacheItem[]> => {
    this.logger.verbose(`(entity-cache) fetching from server: idsOrSlugs=${JSON.stringify(idsOrSlugs)}, type=${type}`);
    const dtos = await get<TCacheItem[]>(WebApiRoutes.EntityCache, isString(idsOrSlugs[0]) ? { slugs: idsOrSlugs, type: type.toLowerCase() } : { ids: idsOrSlugs, type: type.toLowerCase() }, 'default', false, 'throw');
    this.logger.verbose(`(entity-cache) item fetched: idsOrSlugs=${JSON.stringify(idsOrSlugs)}, type=${type}, item=${JSON.stringify(dtos)}`);
    return dtos!;
  };

  set = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType; } & IEntityCacheItem>(item: TCacheItem, expireInSeconds: number | undefined): Promise<void> => {
    const slug = ((item as any) as IEntityCacheSlugItem)?.slug;
    this.logger.debug(`(entity-cache) set: id=${item.id}, slug=${slug}, item=${JSON.stringify(item)}, expireInSeconds=${expireInSeconds ?? '[none]'}`);
    const keys = [slug ? this.getItemKey(slug, item.type) : undefined, item.id ? this.getItemKey(item.id, item.type) : undefined].filter(k => k);
    const cacheEntry : IEntityCacheItemEntry<TCacheItem> = {
      item,
      expireAt: expireInSeconds ? dayjs(new Date()).add(expireInSeconds!, 'second').toDate() : undefined
    };
    for (let i = 0; i < keys.length; i++) {
      await this.cache!.setItem(keys[i]!, cacheEntry);
    }
  };

  remove = async <TEntityType extends CacheEntityType>(idOrSlug: EntityId | string, type: TEntityType): Promise<void> => {
    this.logger.debug(`(entity-cache) remove: idOrSlug=${idOrSlug}, type=${type}`);
    const key = this.getItemKey(idOrSlug, type);
    await this.cache?.removeItem(key);
  };

  getSingle = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType; } & IEntityCacheItem>(idOrSlug: EntityId | string, type: TEntityType): Promise<TCacheItem | undefined> => {
    this.logger.debug(`(entity-cache) getSingle: idOrSlug=${idOrSlug}, type=${type}`);
    const key = this.getItemKey(idOrSlug, type);
    const cacheEntry = await this.cache?.getItem<IEntityCacheItemEntry<TCacheItem>>(key);
    if (cacheEntry) {
      if (cacheEntry.expireAt) {
        if (dayjs(new Date()).isBefore(cacheEntry.expireAt)) {
          this.logger.debug(`(entity-cache) getSingle, hit: idOrSlug=${idOrSlug}, item=${JSON.stringify(cacheEntry.item)}, expiration=${cacheEntry.expireAt}`);
          return cacheEntry.item;
        } else {
          this.logger.debug(`(entity-cache) getSingle, miss, expired: idOrSlug=${idOrSlug}, item=${JSON.stringify(cacheEntry.item)}, expiration=${cacheEntry.expireAt}`);
          return undefined;
        }
      } else {
        this.logger.debug(`(entity-cache) getSingle, hit (no expiration): idOrSlug=${idOrSlug}, item=${JSON.stringify(cacheEntry.item)}`);
        return cacheEntry.item;
      }
    } else {
      this.logger.debug(`(entity-cache) getSingle, miss: idOrSlug=${idOrSlug}, type=${type}`);
      return undefined;
    }
  };

  get = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType; } & IEntityCacheItem>(idsOrSlugs: EntityId[] | string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }): Promise<TCacheItem[] | undefined> => {
    this.logger.debug(`(entity-cache) get: idsOrSlugs=${JSON.stringify(idsOrSlugs)}, type=${type}, fetchOnCacheMiss=${JSON.stringify(fetchOnCacheMiss)}`);
    if (idsOrSlugs.length === 0) {
      return [];
    }

    const result : (TCacheItem | undefined)[] = [];
    const idsOrSlugsMissed : (EntityId | string)[] = [];
    const missedIndices: number[] = [];
    for (let i = 0; i < idsOrSlugs.length; i++) {
      const item = await this.getSingle<TEntityType, TCacheItem>(idsOrSlugs[i], type);
      result.push(item);
      if (!item) {
        idsOrSlugsMissed.push(idsOrSlugs[i]);
        missedIndices.push(i);
      }
    }

    if (idsOrSlugsMissed.length) {
      if (fetchOnCacheMiss) {
        const fetchedItems = await this.fetchFromServer<TEntityType, TCacheItem>(idsOrSlugsMissed as any, type);
        for (let i = 0; i < fetchedItems.length; i++) {
          const fetchedItem = fetchedItems[i];
          await this.set(fetchedItem, fetchOnCacheMiss.expireInSeconds);
          result[missedIndices[i]] = fetchedItem;
        }
        this.logger.debug(`(entity-cache) get, some hits, rest were fetched: idsOrSlugs=${JSON.stringify(idsOrSlugs)}`);
        return result as TCacheItem[];
      } else {
        this.logger.debug(`(entity-cache) get, got cache misses: idsOrSlugs=${JSON.stringify(idsOrSlugs)}, missed=${JSON.stringify(idsOrSlugsMissed)}`);
        return undefined;
      }
    } else {
      this.logger.debug(`(entity-cache) get, all hits: idsOrSlugs=${JSON.stringify(idsOrSlugs)}`);
      return result as TCacheItem[];
    }
  };
};

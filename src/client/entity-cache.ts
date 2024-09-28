import { type IEntityCacheItem, type IEntityCacheSlugItem, type CacheEntityType, type EntityId, type GetEntityCacheItem, type IAppLogger } from '@golobe-demo/shared';
import { type Storage, type StorageValue } from 'unstorage';
import { ApiEndpointEntityCache } from './../server/api-definitions';
import { getObject } from './../helpers/rest-utils';
import { type IEntityCache } from './../types';
import dayjs from 'dayjs';

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

  fetchFromServer = async <TEntityType extends CacheEntityType>(ids: EntityId[], slugs: string[], type: TEntityType): Promise<GetEntityCacheItem<TEntityType>[]> => {
    this.logger.verbose(`(entity-cache) fetching from server: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}, type=${type}`);
    const dtos = await getObject<GetEntityCacheItem<TEntityType>[]>(`/${ApiEndpointEntityCache}`, slugs.length ? { slugs, type: type.toLowerCase() } : { ids, type: type.toLowerCase() }, 'default', false, undefined, 'throw');
    this.logger.verbose(`(entity-cache) item fetched: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}, type=${type}, item=${JSON.stringify(dtos)}`);
    return dtos!;
  };

  set = async <TEntityType extends CacheEntityType>(item: GetEntityCacheItem<TEntityType>, expireInSeconds: number | undefined): Promise<void> => {
    const slug = ((item as any) as IEntityCacheSlugItem)?.slug;
    this.logger.debug(`(entity-cache) set: id=${item.id}, slug=${slug}, item=${JSON.stringify(item)}, expireInSeconds=${expireInSeconds ?? '[none]'}`);
    const keys = [slug ? this.getItemKey(slug, item.type) : undefined, item.id ? this.getItemKey(item.id, item.type) : undefined].filter(k => k);
    const cacheEntry = {
      item,
      expireAt: expireInSeconds ? dayjs(new Date()).add(expireInSeconds!, 'second').toDate() : undefined
    };
    for (let i = 0; i < keys.length; i++) {
      await this.cache!.setItem(keys[i]!, cacheEntry);
    }
  };

  remove = async <TEntityType extends CacheEntityType>(id: EntityId | undefined, slug: string | undefined, type: TEntityType): Promise<void> => {
    this.logger.debug(`(entity-cache) remove: id=${id}, slug=${slug}, type=${type}`);
    const key = this.getItemKey((id ?? slug)!, type);
    await this.cache?.removeItem(key);
  };

  getSingle = async <TEntityType extends CacheEntityType>(id: EntityId | undefined, slug: string | undefined, type: TEntityType): Promise<GetEntityCacheItem<TEntityType> | undefined> => {
    this.logger.debug(`(entity-cache) getSingle: id=${id}, slug=${slug}, type=${type}`);
    const key = this.getItemKey((id ?? slug)!, type);
    const cacheEntry = await this.cache?.getItem<IEntityCacheItemEntry<GetEntityCacheItem<TEntityType>>>(key);
    if (cacheEntry) {
      if (cacheEntry.expireAt) {
        if (dayjs(new Date()).isBefore(cacheEntry.expireAt)) {
          this.logger.debug(`(entity-cache) getSingle, hit: id=${id}, slug=${slug}, item=${JSON.stringify(cacheEntry.item)}, expiration=${cacheEntry.expireAt}`);
          return cacheEntry.item;
        } else {
          this.logger.debug(`(entity-cache) getSingle, miss, expired: id=${id}, slug=${slug}, item=${JSON.stringify(cacheEntry.item)}, expiration=${cacheEntry.expireAt}`);
          return undefined;
        }
      } else {
        this.logger.debug(`(entity-cache) getSingle, hit (no expiration): id=${id}, slug=${slug}, item=${JSON.stringify(cacheEntry.item)}`);
        return cacheEntry.item;
      }
    } else {
      this.logger.debug(`(entity-cache) getSingle, miss: id=${id}, slug=${slug}, type=${type}`);
      return undefined;
    }
  };

  get = async <TEntityType extends CacheEntityType>(ids: EntityId[], slugs: string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }): Promise<GetEntityCacheItem<TEntityType>[] | undefined> => {
    this.logger.debug(`(entity-cache) get: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}, type=${type}, fetchOnCacheMiss=${JSON.stringify(fetchOnCacheMiss)}`);
    if (ids.length === 0 && slugs.length === 0) {
      return [];
    }

    const useIds = ids.length > 0;

    const result : (GetEntityCacheItem<TEntityType> | undefined)[] = [];
    const idsOrSlugsMissed : (EntityId | string)[] = [];
    const missedIndices: number[] = [];
    for (let i = 0; i < (useIds ? ids.length : slugs.length); i++) {
      const item = await this.getSingle<TEntityType>(useIds ? ids[i] : undefined, useIds ? undefined : slugs[i], type);
      result.push(item);
      if (!item) {
        idsOrSlugsMissed.push(useIds ? ids[i] : slugs[i]);
        missedIndices.push(i);
      }
    }

    if (idsOrSlugsMissed.length) {
      if (fetchOnCacheMiss) {
        const fetchedItems = await this.fetchFromServer<TEntityType>(useIds ? idsOrSlugsMissed : [], useIds ? [] : idsOrSlugsMissed, type);
        for (let i = 0; i < fetchedItems.length; i++) {
          const fetchedItem = fetchedItems[i];
          await this.set(fetchedItem, fetchOnCacheMiss.expireInSeconds);
          result[missedIndices[i]] = fetchedItem;
        }
        this.logger.debug(`(entity-cache) get, some hits, rest were fetched: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}`);
        return result as GetEntityCacheItem<TEntityType>[];
      } else {
        this.logger.debug(`(entity-cache) get, got cache misses: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}, missed=${JSON.stringify(idsOrSlugsMissed)}`);
        return undefined;
      }
    } else {
      this.logger.debug(`(entity-cache) get, all hits: ids=${JSON.stringify(ids)}, slugs=${JSON.stringify(slugs)}`);
      return result as GetEntityCacheItem<TEntityType>[];
    }
  };
};

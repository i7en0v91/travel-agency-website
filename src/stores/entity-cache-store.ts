import { QueryPagePreviewModeParam, delay, AppException, AppExceptionCodeEnum, AppConfig, type EntityId, type CacheEntityType, type GetEntityCacheItem } from '@golobe-demo/shared';
import { StoreOperationTimeout, StoreKindEnum } from './../helpers/constants';
import { getServerServices } from '../helpers/service-accessors';
import { type IEntityCacheQuery, ApiEndpointEntityCache } from './../server/api-definitions';
import { buildStoreDefinition, type PublicStore } from './../helpers/stores/pinia';
import dayjs from 'dayjs';
import has from 'lodash-es/has';
import set from 'lodash-es/set';
import type { Raw } from 'vue';

const StoreId = StoreKindEnum.EntityCache;
const DefaultExpirationSeconds = AppConfig.caching.entities.expiration.default;
const YieldExecutionFlowInterval = 50;

type CacheKey = string;
type CacheEntry<TCacheEntityType extends CacheEntityType = CacheEntityType> = {
  key: CacheKey,
  item: GetEntityCacheItem<TCacheEntityType>,
  expireAt: Date | null
}
type EntryFetchArgs = {
  keys: { ids: EntityId[] } | { slugs: string[] }, 
  type: CacheEntityType, 
  dedupe: false | 'skip-if-cached-locally'
};

type EntryEndpointResponseItemDto = GetEntityCacheItem<CacheEntityType>;
type EntryEndpointResponseDto = EntryEndpointResponseItemDto[];

declare type State = {
  s_cachedItems: Map<CacheKey, Raw<CacheEntry>>,
  s_pendingQueue: EntryFetchArgs[]
};

type CacheGetReturn<TEntityType extends CacheEntityType, T> = T extends true ?
  GetEntityCacheItem<TEntityType>[] : (GetEntityCacheItem<TEntityType>[] | null);

function getItemKey(idOrSlug: EntityId | string, type: CacheEntityType): string {
  return `EntityCache-${type}-${idOrSlug}`;
};

function isExpired<TEntityType extends CacheEntityType>(entry: CacheEntry<TEntityType>) {
  if (entry.expireAt) {
    if (dayjs(new Date()).isBefore(entry.expireAt)) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  (clientSideOptions) => {
    const { enabled } = usePreviewState();
    const fetchQuery = ref<IEntityCacheQuery>();
    /** KB: optimization - keep items outside of state to gain performance 
     * by not tracking potentially thousands of objects in cache */
    const clientBackplane: Map<CacheKey, CacheEntry> = new Map([]);
    const vars = {
      nuxtApp: clientSideOptions.nuxtApp,
      fetchQuery,
      preview: enabled,
      clientBackplane,
      entriesFetch:
        useFetch(`/${ApiEndpointEntityCache}`, {
          server: false,
          lazy: true,
          immediate: false,
          cache: enabled ? 'no-store' : 'default',
          dedupe: 'cancel',
          query: fetchQuery,
          watch: false,
          default: () => [],
          transform: (response: EntryEndpointResponseDto) => {
            const logger = useEntityCacheStore().getLogger();
            logger.verbose(`cache items fetched`, { response });
            const result: GetEntityCacheItem<CacheEntityType>[] = response;
            return result;
          },
          $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
        })
      };

    watch(vars.entriesFetch.status, () => {
      const logger = useEntityCacheStore().getLogger();
      logger.verbose(`entries fetch status changed`, { status : vars.entriesFetch.status.value });
      const fetchStatus = vars.entriesFetch.status.value;
      if(fetchStatus === 'success') {
        useEntityCacheStore().fetchCompleted(vars.entriesFetch.data.value);
      } else if(fetchStatus === 'error') {
        const store = useEntityCacheStore();
        store.fetchFailed();
        const err = vars.entriesFetch.error.value ??
          new AppException(AppExceptionCodeEnum.UNKNOWN, 'entity cache data fetch failed', 'error-stub');
        store.displayError(err);
      }
    }, { immediate: false });

    return vars;
  },
  {
    state: (): State => { 
      return {
        s_cachedItems: new Map<CacheKey, CacheEntry>([]),
        s_pendingQueue: []
      };
    },
    getters: { },
    actions: {
      /**
       * @param expireInSeconds item expiration time. If {@constant null} is used, 
       * then item won't expire. If {@constant undefined} specified then fallback to
       * default {@link AppConfig.caching.entities.expiration.default} value 
       */
      async set<TEntityType extends CacheEntityType>(
        item: GetEntityCacheItem<TEntityType>, 
        expireInSeconds?: number | null | undefined
      ): Promise<void> {
        const slug = ('slug' in item) ? item.slug : undefined;
        const keys = [slug ? getItemKey(slug, item.type) : undefined, item.id ? getItemKey(item.id, item.type) : undefined].filter(k => k);
        const expireAt = expireInSeconds === undefined ? null :
          dayjs(new Date())
            .add(expireInSeconds ? expireInSeconds : DefaultExpirationSeconds, 'second')
            .toDate();
        const cacheEntryCommon = {
          item,
          expireAt
        };

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]!;
          const cacheEntry: CacheEntry = {
            key,
            ...cacheEntryCommon
          };
          if(import.meta.server) {
            await getServerServices()!.getCache().setItemRaw(key, cacheEntry);
          }          
          this.addItem({ key, entry: cacheEntry });
        }
      },

      async remove<TEntityType extends CacheEntityType>(
        key: { id: EntityId } | { slug: string },
        type: TEntityType
      ): Promise<void> {
        const cacheKey = getItemKey((has(key, 'id')) ? key.id : (key as any).slug!, type);
        if(import.meta.server) {
          await getServerServices()!.getCache().removeItem(cacheKey);
        }
        this.deleteItem(cacheKey);
      },

      /**
       * Forcefully loads data from backend and populates local cache with result.
       * Throws if some of requested entities not found 
       * @param expireInSeconds see {@param expireInSeconds} in {@link set} method
       */
      async load<TEntityType extends CacheEntityType>(
        keys: { ids: EntityId[] } | { slugs: string[] }, 
        type: TEntityType,
        timeout: number = StoreOperationTimeout
      ): Promise<GetEntityCacheItem<TEntityType>[]> {
        const logger = this.getLogger();
        logger.verbose(`load requested`, { keys, type });

        let result: GetEntityCacheItem<TEntityType>[];
        if(import.meta.client) {
          const started = dayjs();
          this.enqueueFetch({ keys, type, dedupe: false });

          const itemsFetch = this.clientSetupVariables().entriesFetch;
          while(true) {
            const elapsedMs = dayjs().diff(started, 'millisecond');
            if(elapsedMs > timeout) {
              new AppException(AppExceptionCodeEnum.UNKNOWN, 'timeout loading entity cache', 'error-stub');
            }

            logger.debug(`load - checking fetch progress`, { elapsedMs });
            switch(itemsFetch.status.value) {
              case 'pending':
                logger.debug(`load - fetch pending`, { elapsedMs });
                await itemsFetch;
                break;
              case 'error':
                throw itemsFetch.error.value ?? 
                  new AppException(
                    AppExceptionCodeEnum.UNKNOWN, 
                    'entity cache data fetch failed', 
                    'error-stub'
                  );
            }           
            
            const completeStatus = await nextTick(async () => {
              logger.debug(`load - checking complete status`, { keys, type });
              const pendingQueueProcessed = itemsFetch.status.value !== 'pending' && this.s_pendingQueue.length === 0;
              const locallyCached = await this.get(keys, type, false);
              if(locallyCached && (('ids' in keys) ? keys.ids.length : keys.slugs.length) === locallyCached.length) {
                return locallyCached;
              }

              if(pendingQueueProcessed) {
                return false;
              } else if(itemsFetch.status.value === 'error') {
                throw new AppException(
                  AppExceptionCodeEnum.UNKNOWN, 
                  'execption fetching entity cache data', 
                  'error-stub'
                );
              } else {
                return 'processing-queue';
              }
            });

            if(!completeStatus) {
              logger.warn(`load finished with failed status`, undefined, { keys, type });
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'entity cache data fetch failed', 'error-stub');
            }

            if(completeStatus === 'processing-queue') {
              logger.debug(`load - more fetch requests to process in queue`, { total: this.s_pendingQueue.length });
              // TODO: should stuck on awaiting fetch on next loop iteration, 
              // but probably need to add some timeout guard for such flow
              await delay(YieldExecutionFlowInterval);
              continue;
            }

            result = completeStatus;
            logger.verbose(`load - fetch finished`, { keys, type });
            break;
          }
        } else {
          const serverCachingLogic = getServerServices()!.getEntityCacheLogic();
          // TODO: uncomment preview state
          // const { enabled } = usePreviewState();
          const enabled = false;
          const serverCacheGetResult = await serverCachingLogic.get(('ids' in keys) ? keys.ids : [], ('ids' in keys) ? [] : keys.slugs, type, enabled);
          result = (('ids' in keys) ? keys.ids : keys.slugs)
            .map(k => serverCacheGetResult.find(ci => ('ids' in keys) ? (ci.id === k) : (ci.slug === k))!);
        }  

        logger.debug(`load - updating cache state`, { result });
        for(const resultItem of result) {
          await this.set(resultItem);
        }

        logger.verbose(`load completed`, { keys, type });
        return result;
      },

      /**
       * @param fetchOnCacheMiss whether to request entities from server on 
       * cache miss ({@link load} method).If set to {@constant false} then method 
       * may return {@const null} if local cache doesn't contain any of entities 
       * specified by {@param keys}
       */
      async get<TEntityType extends CacheEntityType, TFetchOnMiss extends boolean>(
        keys: { ids: EntityId[] } | { slugs: string[] }, 
        type: TEntityType, 
        fetchOnCacheMiss: TFetchOnMiss
      ): Promise<CacheGetReturn<TEntityType, TFetchOnMiss>> {
        const logger = this.getLogger();
        logger.debug(`get`, { keys, type, fetchOnCacheMiss });

        const useIds = 'ids' in keys;
        if ((useIds && !keys.ids.length) || (!useIds && !keys.slugs.length)) {
          return [];
        }

        const result : (GetEntityCacheItem<TEntityType> | null)[] = [];
        const idsOrSlugsMissed : (EntityId | string)[] = [];
        const missedIndices: number[] = [];
        for (let i = 0; i < (useIds ? keys.ids.length : keys.slugs.length); i++) {
          const key = getItemKey(useIds ? keys.ids[i] : keys.slugs[i], type);
          let cacheEntry = this.s_cachedItems.get(key);
          if(!cacheEntry) {
            if(import.meta.server) {
              cacheEntry = await getServerServices()!.getCache().getItemRaw(key) as CacheEntry<TEntityType>;
            } else {
              cacheEntry = this.clientSetupVariables().clientBackplane.get(key);
            }
          }

          if(!cacheEntry || isExpired(cacheEntry)) {
            if(cacheEntry) {
              logger.debug(`get, expired entry`, { cacheEntry });
            }
            idsOrSlugsMissed.push(useIds ? keys.ids[i] : keys.slugs[i]);
            missedIndices.push(i);
            continue;
          }
          result.push(cacheEntry.item as GetEntityCacheItem<TEntityType>);
          if(import.meta.server) {
            // add state to html payload
            await this.set(cacheEntry.item);
          }
        }
        if (!idsOrSlugsMissed.length) {
          logger.debug(`get, all hits`, { keys });
          return result as GetEntityCacheItem<TEntityType>[];
        }

        if(import.meta.client && !fetchOnCacheMiss) {
          logger.debug(`get, got cache misses`, { keys, missed: idsOrSlugsMissed});
          return null as CacheGetReturn<TEntityType, TFetchOnMiss>;
        }

        logger.verbose(`get, not all hits, some remained`,  { keys: idsOrSlugsMissed, cacheSize: this.s_cachedItems.size });
        const loadResult = await this.load(useIds ? { ids: idsOrSlugsMissed } : { slugs: idsOrSlugsMissed }, type);
        for (let i = 0; i < loadResult.length; i++) {
          const loadedItem = loadResult[i];
          await this.set(loadedItem);
          result[missedIndices[i]] = loadedItem;
        }
         
        return result as GetEntityCacheItem<TEntityType>[];
      }
    },
    patches: {
      enqueueFetch(args: EntryFetchArgs) {
        if(import.meta.server) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'fetch queue not available on server', 'error-page');
        }
        
        const logger = this.getLogger();
        logger.debug(`enqueueing fetch request`, { keys: args.keys, type: args.type });

        this.$patch(() => {
          this.s_pendingQueue.push(args);
        });
        this.advanceFetchQueue();
      },

      advanceFetchQueue() {
        if(import.meta.server) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'fetch queue not available on server', 'error-page');
        }
        
        const logger = this.getLogger();
        const fetchStatus = this.clientSetupVariables().entriesFetch.status.value;
        logger.verbose(`advancing fetch queue`, { length: this.s_pendingQueue.length, fetchStatus });

        // TODO: optimization
        // 1. look through the entire queue and merge/collapse 
        // requests logic with respect to EntryFetchArgs.dedupe option
        // (yet, this will interfere with caching by url queries)
        // 2. if request is pending and queue became large enough then
        // cancel outstanding fetch and re-execute it with grouped request
        // ids
        if(!this.s_pendingQueue.length || fetchStatus === 'pending') {
          return;
        }

        let nextFetchArgs: EntryFetchArgs | undefined;
        while(true) {
          if(this.s_pendingQueue.length) {
            this.$patch(() => {
              nextFetchArgs = this.s_pendingQueue.pop();
            });
          } else {
            nextFetchArgs = undefined;
          }
          if(!nextFetchArgs) {
            logger.verbose(`fetch queue become empty, nothing to fetch`);
            return;
          }
          
          if(nextFetchArgs.dedupe) {
            logger.debug(`advancing queue, performing locally cached check`);
            const locallyCached = (('ids' in nextFetchArgs.keys) ?
              nextFetchArgs.keys.ids.map(id => { 
                const itemKey = getItemKey(id, nextFetchArgs!.type);
                let cachedItem = this.s_cachedItems.get(itemKey);
                if(!cachedItem && import.meta.client) {
                  cachedItem = this.clientSetupVariables().clientBackplane.get(itemKey);
                }
                return cachedItem;
              }) :
              nextFetchArgs.keys.slugs.map(slug => {
                const itemKey = getItemKey(slug, nextFetchArgs!.type);
                let cachedItem = this.s_cachedItems.get(itemKey);
                if(!cachedItem && import.meta.client) {
                  cachedItem = this.clientSetupVariables().clientBackplane.get(itemKey);
                }
                return cachedItem;
              })
            ).filter(i => !!i);
            
            const hasExpired = locallyCached.some(e => isExpired(e));
            const allPresentLocally = locallyCached.length === 
              (('ids' in nextFetchArgs.keys) ? 
                nextFetchArgs.keys.ids : 
                nextFetchArgs.keys.slugs
              ).length;
            if(!hasExpired && allPresentLocally) {
              logger.verbose(`advancing queue - locally chached check succeeded`, { params: nextFetchArgs });
              continue;
            }
          }
          break;
        }

        logger.debug(`advancing queue - executing fetch request`, { params: nextFetchArgs });
        this.clientSetupVariables().fetchQuery.value = set({
          ids: ('ids' in nextFetchArgs.keys) ? nextFetchArgs.keys.ids : undefined,
          slugs: ('ids' in nextFetchArgs.keys) ? undefined : nextFetchArgs.keys.slugs,
          type: nextFetchArgs.type
        }, QueryPagePreviewModeParam, this.clientSetupVariables().preview);
        this.clientSetupVariables().entriesFetch.execute();
      },

      fetchCompleted(data: GetEntityCacheItem<CacheEntityType>[]) {
        const logger = this.getLogger();
        logger.debug(`fetch completed, updating state`, { items: data });

        for(const item of data) {
          const expireInSeconds = has(AppConfig.caching.entities.expiration, item.type) ? 
            AppConfig.caching.entities.expiration[item.type]! : DefaultExpirationSeconds;
          const expireAt = dayjs(new Date())
            .add( expireInSeconds, 'second')
            .toDate();
          const cacheEntryCommon = {
            item,
            expireAt
          };

          const idKey = getItemKey(item.id, item.type);
          this.addItem( {
            key: idKey,
            entry: {
              ...cacheEntryCommon,
              key: idKey
            }
          } );

          const slugKey = getItemKey(item.slug, item.type);
          this.addItem( {
            key: slugKey,
            entry: {
              ...cacheEntryCommon,
              key: slugKey
            }
          });
        }

        logger.verbose(`state updated with new fetch data`, { items: data });
        this.advanceFetchQueue();
      },

      fetchFailed(err: any) {
        const logger = this.getLogger();
        const currentFetchParams = this.clientSetupVariables().fetchQuery.value;
        logger.warn(`entities cache data fetch failed`, err, { params: currentFetchParams });

        // reset pending queue
        this.$patch((s) => {
          s.s_pendingQueue = [];
        });
      },

      deleteItem(key: CacheKey) {
        const logger = this.getLogger();
        logger.debug(`deleting item`, { key });
        if(import.meta.client) {
          this.clientSetupVariables().clientBackplane.delete(key);
        }
        this.$patch((s) => {
          s.s_cachedItems.delete(key);
        });
      },

      addItem(args: { key: CacheKey, entry: CacheEntry }) {
        const logger = this.getLogger();
        logger.debug(`adding item`, { key: args.key, item: args.entry.item });
        if(import.meta.client) {
          this.clientSetupVariables().clientBackplane.set(args.key, args.entry);
        } else {
          this.$patch((s) => {
            s.s_cachedItems.set(
              args.key, 
              markRaw(args.entry)
            );
          });
        }
      }
    }
  }
);
const StoreDef = storeDefBuilder();

const useEntityCacheStoreInternal = defineStore(StoreId, StoreDef);
export declare type EntityCacheStoreInternal = ReturnType<typeof useEntityCacheStoreInternal>;
export declare type EntityCacheStore = ReturnType<PublicStore<typeof storeDefBuilder>>;
export const useEntityCacheStore = useEntityCacheStoreInternal as PublicStore<typeof storeDefBuilder>;

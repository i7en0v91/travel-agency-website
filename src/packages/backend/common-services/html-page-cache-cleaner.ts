import { type PageCacheVaryOptions, type UninitializedPageTimestamp, OgImagePathSegment, type Locale, DefaultLocale, AvailableLocaleCodes, AppConfig, delay , AppException, AppExceptionCodeEnum, OgImageExt, spinWait, lookupValueOrThrow, DbVersionInitial, AppPage, type IAppLogger, type EntityId, type IAppConfig, getPagePath, AllHtmlPages, type Timestamp, EntityChangeSubscribersOrder } from '@golobe-demo/shared';
import { type EntityChangeNotificationCallbackArgs, type EntityChangeNotificationSubscriberId, type IHtmlPageCacheCleaner, type IEntityChangeNotificationTask, type EntityChangeNotificationCallback } from './../types';
import { type PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'ohash';
import type { Storage, StorageValue } from 'unstorage';
import { AllEntityModels, type EntityModel, type IChangeDependencyTracker } from './change-dependency-tracker';
import { type HtmlPageModel, type IHtmlPageModelMetadata } from './html-page-model-metadata';
import { parseURL, joinURL, stringifyParsedURL, stringifyQuery } from 'ufo';
import flattenDeep from 'lodash-es/flattenDeep';
import uniq from 'lodash-es/uniq';
import omit from 'lodash-es/omit';
import toPairs from 'lodash-es/toPairs';
import fromPairs from 'lodash-es/fromPairs';
import chunk from 'lodash-es/chunk';
import groupBy from 'lodash-es/groupBy';
import dayjs from 'dayjs';
import isString from 'lodash-es/isString';

const AverageEntityTypesPerPage = 10;
const CleanTaskWarnTimeoutSecs = 10;

declare type ScheduledItem = {
  page: AppPage,
  id: EntityId | undefined,
  timestamp: Date
};

declare type AffectedPageInfo = {
  page: AppPage;
  id: EntityId | undefined,
  timestamp: Date
};

export class HtmlPageCacheCleaner implements IHtmlPageCacheCleaner {
  private readonly PageCacheBase = ['cache:nitro:routes', AppConfig.caching.invalidation.ogImageCachePrefix]; // e.g. 'cache:nitro:routes:_' or 'cache:nitro:routes:no-store'

  private readonly logger: IAppLogger;
  private readonly nitroCache: Storage<StorageValue>;
  private readonly changeDependencyTracker: IChangeDependencyTracker;
  private readonly pageMetadata: IHtmlPageModelMetadata;
  private readonly dbRepository: PrismaClient;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  private taskStatus: 'idle' | 'in-progress';
  private scheduledItems: ScheduledItem[];
  private lastChangedPagesRevision: Date;

  public static inject = ['entityChangeNotifications', 'changeDependencyTracker', 'htmlPageModelMetadata', 'nitroCache', 'dbRepository', 'logger'] as const;
  constructor (entityChangeNotifications: IEntityChangeNotificationTask, changeDependencyTracker: IChangeDependencyTracker, htmlPageModelMetadata: IHtmlPageModelMetadata, nitroCache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.nitroCache = nitroCache;
    this.changeDependencyTracker = changeDependencyTracker;
    this.pageMetadata = htmlPageModelMetadata;
    this.dbRepository = dbRepository;
    this.entityChangeNotifications = entityChangeNotifications;
    this.taskStatus = 'idle';
    this.scheduledItems = [];
    this.lastChangedPagesRevision = dayjs().toDate();
  }

  async initialize(): Promise<void> {
    if(this.isCachingEnabled()) {
      this.subscribeForEntityChanges();
    }
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('(HtmlPageCacheCleaner) subscribing for entity changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: AllEntityModels.map(e => { 
        return {
          entity: e, 
          ids: 'all'
        };
      }),
      order: EntityChangeSubscribersOrder.HtmlPageCleaner
    }, this.entityChangeCallback);

    this.logger.verbose(`(HtmlPageCacheCleaner) subscribed entity changes, subscriberId=${subscriberId}`);
  };

  isCachingEnabled = () => AppConfig.caching.intervalSeconds;

  joinRunningCleanup = async(): Promise<boolean> => {
    const CLEANUP_TIMEOUT_SEC = 5 * 60;
    if(this.taskStatus === 'in-progress') {
      this.logger.debug(`(HtmlPageCacheCleaner) joining currently running cleanup`);
      const completed = await spinWait(() => {
        return Promise.resolve(this.taskStatus === 'idle');
      }, CLEANUP_TIMEOUT_SEC * 1000);
      if(!completed) {
        this.logger.warn(`(HtmlPageCacheCleaner) timeout waiting for cleanup to complete, current status=${this.taskStatus}`);
      }
      return true;
    }
    return false;
  };

  performCleanup = async(): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) cleanup requested, current status=${this.taskStatus}`);
    if(!this.isCachingEnabled()) {
      return;
    }

    if(await this.joinRunningCleanup()) {
      return;
    }

    const maxCount = AppConfig.caching.invalidation.maxChangedPagesForPurge * AverageEntityTypesPerPage;
    const since = this.lastChangedPagesRevision;
    const changedEntities = await this.changeDependencyTracker.getChangedEntities(since, maxCount);
    this.logger.debug(`(HtmlPageCacheCleaner) list of changed entities obtained, since=${since.toISOString()}, count=${changedEntities.length}`);

    if(await this.joinRunningCleanup()) {
      return;
    }

    await this.invalidatePagesOnEntityChanges(changedEntities, AppConfig.caching.invalidation!);
    this.logger.verbose(`(HtmlPageCacheCleaner) cleanup request completed, current status=${this.taskStatus}`);
  };

  date2Timestamp = (date: Date): Timestamp => date.getTime();

  getPageTimestampDbId = (page: AppPage, id: EntityId | undefined): string => `${page.toString()}_${id ?? ''}`;

  getAllKeysInCache = async (): Promise<string[]> => {
    const result: string[] = [];
    for(let i = 0; i < this.PageCacheBase.length; i++) {
      result.push(...(await this.nitroCache.getKeys(this.PageCacheBase[i])));
    }
    return result;
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.verbose('(HtmlPageCacheCleaner) entity change callback');

    const changedEntities: {entity: EntityModel, id: EntityId}[] | 'too-much' = 
      args.target === 'too-much' ? 'too-much' : 
        flattenDeep(args.target.map(x => (x.ids as EntityId[]).map(id => {
          return {
            entity: x.entity,
            id: id
          };
        })));
    await this.invalidatePagesOnEntityChanges(changedEntities, AppConfig.caching.invalidation);

    this.logger.verbose('(HtmlPageCacheCleaner) entity change callback completed');
  };

  invalidatePagesOnEntityChanges = async (changedEntities: {entity: EntityModel, id: EntityId}[] | 'too-much', options: NonNullable<IAppConfig['caching']['invalidation']>): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) invalidating pages on entity on changes, current status=${this.taskStatus}, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`);
    const now = dayjs().toDate();
    this.taskStatus = 'in-progress';

    try {
      const allKeys = await this.getAllKeysInCache();
      const itemsToProcess = this.scheduledItems.splice(0, this.scheduledItems.length);

      let needPurge: boolean = false;
      let newLastRevision = now;
      try {
        if(changedEntities !== 'too-much') {
          const recentlyChangedPages = await this.getAffectedPagesOnEntityChanges(changedEntities, options.maxChangedPagesForPurge);
          if(recentlyChangedPages === 'too-much') {
            needPurge = true;
          } else {
            itemsToProcess.push(...recentlyChangedPages.pages);
          }
        } else {
          needPurge = true;
        }
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) exception occured while trying to obtain list of recently changed pages, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`, err);
        newLastRevision = this.lastChangedPagesRevision;
      }
      if(itemsToProcess.length > options.maxChangedPagesForPurge) {
        needPurge = true;
      }
      
      if(needPurge) {
        this.logger.warn(`(HtmlPageCacheCleaner) too much pages have been changed, cache purge will be performed, last revision=${this.lastChangedPagesRevision.toISOString()}, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`);
        const timestamp = now;
        await this.doPurge(timestamp, false);
        newLastRevision = now;
      } else {
        const cachedByTimestampPages: {page: AppPage, id: EntityId | undefined, timestamp: Date}[] = [];
        for(let i = 0; i < itemsToProcess.length; i++) {
          const invalidateItem = itemsToProcess[i];
          const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(invalidateItem.page));
          const cacheVaryOptions = pageMetadata.getCacheVaryOptions();
          if(cacheVaryOptions === 'UseEntityChangeTimestamp') {
            cachedByTimestampPages.push(invalidateItem);
          } 
            
          const queryVariants = pageMetadata.getAllCachingQueryVariants();
          await this.doInvalidatePage(allKeys, this.htmlPageType2Enum(invalidateItem.page), invalidateItem.id, options, cacheVaryOptions, queryVariants, false);
        }
        newLastRevision = now;
        await this.updatePageTimestamps(cachedByTimestampPages, false);
      }

      this.lastChangedPagesRevision = newLastRevision;
      const elapsedSecs = dayjs().diff(dayjs(now), 'second');
      const logMsg = `(HtmlPageCacheCleaner) pages invalidation on entity changes completed, elapsed ${elapsedSecs} secs., count: ${needPurge ? 'purge' : itemsToProcess.length}, set revision=${newLastRevision.toISOString()}`;
      if(elapsedSecs > CleanTaskWarnTimeoutSecs || needPurge) {
        this.logger.warn(logMsg);
      } else {
        this.logger.verbose(logMsg);
      }
    } catch(err: any) {
      this.logger.warn(`(HtmlPageCacheCleaner) unexpected exception occured during pages invalidation on entity changes, last revision=${this.lastChangedPagesRevision.toISOString()}, numChanges=${isString(changedEntities) ? changedEntities : changedEntities.length}`, err);
    } finally {
      this.taskStatus = 'idle';
    }
  };

  getAffectedPagesOnEntityChanges = async(changedEntities: {entity: EntityModel, id: EntityId}[], maxCount: number): Promise<{ pages: ScheduledItem[] } | 'too-much'> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) obtaining list of recently changed pages, num changes=${changedEntities.length}, maxCount=${maxCount}`);

    const resultMap = new Map<string, ScheduledItem>([]);
    const affectedPages = await this.getAffectedPagesOnChange(changedEntities);
    for(let j = 0; j < affectedPages.length; j++) {
      const affectedPage = affectedPages[j];
      const affectedPageKey = hash({ id: affectedPage.id ?? '', page: affectedPage.page.valueOf() });
      if(resultMap.has(affectedPageKey)) {
        continue;
      }
      resultMap.set(affectedPageKey, affectedPage);
      if(resultMap.size > maxCount) {
        const result = Array.from(resultMap.entries()).map(e => e[1]);
        this.logger.warn(`(HtmlPageCacheCleaner) too much pages have changed, maxCount=${maxCount}, affected pages=[${JSON.stringify(this.getStatsByKeyForLogMessage(result, i => i.page.valueOf()))}], num changes=${changedEntities.length}`);
        return 'too-much';
      }
    }
    
    const result = Array.from(resultMap.values());
    this.logger.verbose(`(HtmlPageCacheCleaner) list of recently changed pages obtained, count=${result.length}, maxCount=${maxCount}, num changes=${changedEntities.length}`);
    return { pages: result };
  };

  async getAffectedPagesOnChange(changedEntities: {entity: EntityModel, id: EntityId}[]): Promise<AffectedPageInfo[]> {
    this.logger.debug(`(HtmlPageCacheCleaner) get affected pages, totalCount=${changedEntities.length}, stats=${JSON.stringify(this.getStatsByKeyForLogMessage(changedEntities, e => e.entity))}`);

    const changedEntityChain = await this.changeDependencyTracker.getChangedEntityChain(changedEntities);

    const resultMap = new Map<ReturnType<typeof hash>, AffectedPageInfo>();
    const changesByEntityType = groupBy(changedEntityChain, (e) => e.changedEntity);
    for(let p = 0; p < AllHtmlPages.length; p++) {
      const page = AllHtmlPages[p];
      const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(page));
      if(!pageMetadata.identity && !(pageMetadata.associatedWith?.length ?? 0)) {
        continue;
      }

      const relatedEntityTypes = [pageMetadata.identity!, ...(pageMetadata.associatedWith ?? [])].filter(t => !!t);
      for(let i = 0; i < relatedEntityTypes.length; i++) {
        const relatedEntityType = relatedEntityTypes[i];
        const changedEntities = changesByEntityType[relatedEntityType];
        if(!(changedEntities?.length ?? 0)) {
          continue;
        }

        changedEntities.forEach(ip => {
          const pageId = (pageMetadata.identity && pageMetadata.identity === relatedEntityType) ? ip.id : undefined;
          
          const pageInfoHash = hash({ page, id: pageId });
          const existingPageInfoHash = resultMap.get(pageInfoHash);
          const affectedPageInfoTimestamp = ip.modifiedUtc;
          if(existingPageInfoHash && existingPageInfoHash.timestamp.getTime() >= affectedPageInfoTimestamp.getTime()) {
            return;
          }

          this.logger.verbose(`(HtmlPageCacheCleaner) new affected page found, page=${page.valueOf()}, pageId=${pageId ?? ''}, modifiedUtc=${ip.modifiedUtc.toISOString()}, related entity=${relatedEntityType}, related entity id=${ip.id}`);
          const affectedPageInfo: AffectedPageInfo = {
            page,
            id: pageId,
            timestamp: affectedPageInfoTimestamp
          };
          resultMap.set(pageInfoHash, affectedPageInfo);
        });
      }
    }

    const result = Array.from(resultMap.values());
    this.logger.debug(`(HtmlPageCacheCleaner) affected pages obtained, totalCount=${changedEntities.length}, result=[${JSON.stringify(this.getStatsByKeyForLogMessage(result, i => i.page.valueOf()))}]`);
    return result;
  };

  htmlPage2Type = (page: AppPage): keyof typeof AppPage => {
    return page.toString() as keyof typeof AppPage;
  };

  htmlPageType2Enum = (page: keyof typeof AppPage): AppPage => {
    return lookupValueOrThrow(AppPage, page) as AppPage;
  };

  touchPageTimestamps = async (timestamp: Date, throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) touching page timestamps, timestamp=${timestamp.toISOString()}`);

    try {
      const count = await this.dbRepository.htmlPageTimestamp.updateMany({
        data: {
          timestamp: timestamp,
          version: { increment: 1 }
        }
      });

      this.logger.verbose(`(HtmlPageCacheCleaner) touching page timestamps - completed, timestamp=${timestamp.toISOString()}, count=${count}`);
    } catch(err: any) {
      this.logger.warn(`(HtmlPageCacheCleaner) failed to touch page timestamps, timestamp=${timestamp.toISOString()}`, err);
      if(throwOnError) {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to touch page timestamps', 'error-page');
      }
    }
  };

  calculatePageTimestamp = async (page: AppPage, id: EntityId | undefined, pageMetadata: HtmlPageModel<typeof page>): Promise<Date | UninitializedPageTimestamp> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) calculating page timestamp, page=${page}, id=${id ?? ''}`);

    let result: Date | UninitializedPageTimestamp = 0;
    if(pageMetadata.identity) {
      this.logger.debug(`(HtmlPageCacheCleaner) loading page identity entity modified utc, page=${page}, id=${id ?? ''}, entity=${pageMetadata.identity}`);
      result = await this.changeDependencyTracker.loadEntityModifiedUtc(pageMetadata.identity, id ?? 'most-recent', false);
    }

    if((pageMetadata.associatedWith?.length ?? 0) > 0) {
      for(let i = 0; i < pageMetadata.associatedWith!.length; i++) {
        const associatedEntity = pageMetadata.associatedWith![i];
        this.logger.debug(`(HtmlPageCacheCleaner) loading page associated entity most recent modified utc, page=${page}, id=${id ?? ''}, entity=${associatedEntity}`);
        const modifiedUtc = await this.changeDependencyTracker.loadEntityModifiedUtc(associatedEntity, 'most-recent', false);
        if(modifiedUtc === 0) {
          continue;
        }
        if(result === 0 || dayjs(modifiedUtc).isAfter(result)) {
          result = modifiedUtc;
        }
      }
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) page timestamp calculated, page=${page}, id=${id ?? ''}, result=${result === 0 ? result : result.toISOString()}`);
    return result;
  };

  getPageTimestamp = async (page: AppPage, id: EntityId | undefined, initializeIfNotExists: boolean): Promise<Date | UninitializedPageTimestamp | (Exclude<PageCacheVaryOptions, 'UseEntityChangeTimestamp'>)> => {
    this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp, page=${page}, id=${id ?? ''}, initializeIfNotExists=${initializeIfNotExists}`);

    const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(page)) as HtmlPageModel<typeof page>;
    const cacheVaryOptions = pageMetadata.getCacheVaryOptions();
    if(cacheVaryOptions !== 'UseEntityChangeTimestamp') {
      this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp - not applicable, page=${page}, id=${id ?? ''}, initializeIfNotExists=${initializeIfNotExists}, vary=${cacheVaryOptions}`);
      return cacheVaryOptions;
    }

    let timestamp: Date | UninitializedPageTimestamp | undefined = (await this.dbRepository.htmlPageTimestamp.findFirst({
      where: {
        id: this.getPageTimestampDbId(page, id)
      },
      select: {
        timestamp: true
      }
    }))?.timestamp;
    if(!timestamp) {
      this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp - no timestamp stored, page=${page}, id=${id ?? ''}, initializeIfNotExists=${initializeIfNotExists}`);
      if(initializeIfNotExists) {
        timestamp = await this.calculatePageTimestamp(page, id, pageMetadata);
        if(timestamp !== 0) {
          await this.updatePageTimestampsOneByOne([{ page, id, timestamp }], true);
          timestamp = (await this.getPageTimestamp(page, id, false)) as Date;
        }
      } else {
        return 0;
      }
    }

    if(timestamp === 0) {
      this.logger.warn(`(HtmlPageCacheCleaner) cannot calculate page timestamp, page=${page}, id=${id ?? ''}, initializeIfNotExists=${initializeIfNotExists}, result=${timestamp}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'failed to calculate page timestamp', 'error-page');
    } else {
      this.logger.debug(`(HtmlPageCacheCleaner) page current timestamp - obtained, page=${page}, id=${id ?? ''}, initializeIfNotExists=${initializeIfNotExists}, result=${timestamp.toISOString()}`);
    }
    
    return timestamp;
  };

  updatePageTimestamps = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) updating page timestamps, size=${timestamps.length}`);
    if(timestamps.length) {
      const isBatchingSupported = true; // may depend on DB provider 
      if(isBatchingSupported) {
        await this.updatePageTimestampsWithBatches(timestamps, throwOnError);
      } else {
        await this.updatePageTimestampsOneByOne(timestamps, throwOnError);
      }
    }
    this.logger.verbose(`(HtmlPageCacheCleaner) page timestamps update completed, size=${timestamps.length}`);
  };

  updatePageTimestampsWithBatches = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.debug(`(HtmlPageCacheCleaner) updating page timestamps (in batches), count=${timestamps.length}`);

    let succeeded = 0;
    let failed = 0;

    const MaxBatchPortionSize = AppConfig.caching.invalidation.batching.pageTimestampsUpdateBatch;
    const timestampChunks = chunk(timestamps, MaxBatchPortionSize);
    for(let i = 0; i < timestampChunks.length; i++) {
      const chunkItems = timestampChunks[i];
      let chunkSucceeded = 0;
      let chunkFailed = chunkItems.length;
      try {
        const existingIds = new Set<string>((await this.dbRepository.htmlPageTimestamp.findMany({
          where: {
            id: {
              in: chunkItems.map(c => this.getPageTimestampDbId(c.page, c.id))
            }
          },
          select: {
            id: true
          }
        })).map(x => x.id));
  
        const createList = chunkItems.filter(c => !existingIds.has(this.getPageTimestampDbId(c.page, c.id)));
        if(createList.length) {
          this.logger.debug(`(HtmlPageCacheCleaner) creating new timestamps (in batches), chunk #${i} count=${createList.length}`);
          const numCreated = (await this.dbRepository.htmlPageTimestamp.createMany({
            data: createList.map(c => {
              return {
                id: this.getPageTimestampDbId(c.page, c.id),
                timestamp: c.timestamp,
                version: DbVersionInitial
              };
            })
          })).count;

          chunkSucceeded += numCreated;
          chunkFailed -= numCreated;
        }

        const updateList = chunkItems.filter(c => existingIds.has(this.getPageTimestampDbId(c.page, c.id)));
        if(updateList.length) {
          this.logger.debug(`(HtmlPageCacheCleaner) updating existing timestamps, chunk #${i} count=${updateList.length}`);
          // TODO: find safe way to update multiple timestamps in one request
          await this.updatePageTimestampsOneByOne(updateList, throwOnError);
          chunkSucceeded += updateList.length;
          chunkFailed -= updateList.length;
        }
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) failed to update existing timestamps, count=${timestamps.length}`, err);
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update existing page timestamps', 'error-page');
        }
      } finally {
        succeeded += chunkSucceeded;
        failed += chunkFailed;
      }
    }

    this.logger.debug(`(HtmlPageCacheCleaner) page timestamps updated (in batches), succeeded=${succeeded}, failed=${failed}`);
  };

  updatePageTimestampsOneByOne = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.debug(`(HtmlPageCacheCleaner) updating page timestamps (one-by-one), count=${timestamps.length}`);
    
    let succeeded = 0;
    let failed = 0;
    for(let i = 0; i < timestamps.length; i++) {
      const pageUpdateData = timestamps[i];
      try {
        // TODO: rewrite to upsert-like
        const exists = (await this.dbRepository.htmlPageTimestamp.count({
          where: {
            id: this.getPageTimestampDbId(pageUpdateData.page, pageUpdateData.id)
          }
        })) > 0;
        if(exists) {
          await this.dbRepository.htmlPageTimestamp.update({
            where: {
              id: this.getPageTimestampDbId(pageUpdateData.page, pageUpdateData.id)
            },
            data: {
              timestamp: pageUpdateData.timestamp,
              version: {  increment: 1 }
            }
          });
        } else {
          await this.dbRepository.htmlPageTimestamp.create({
            data: {
              id: this.getPageTimestampDbId(pageUpdateData.page, pageUpdateData.id),
              timestamp: pageUpdateData.timestamp,
              version: DbVersionInitial
            }
          });
        }
        succeeded++;
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) failed to update all page timestamps (one-by-one), page=${pageUpdateData.page}, id=${pageUpdateData.id}, timestamp=${pageUpdateData.timestamp.toISOString()}`, err);
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update page timestamp', 'error-page');
        } else {
          failed++;
        }
      }
    };

    this.logger.debug(`(HtmlPageCacheCleaner) page timestamps updated (one-by-one), succeeded=${succeeded}, failed=${failed}`);
  };

  doInvalidatePage = async (allKeys: string[], page: AppPage, id: EntityId | undefined, options: NonNullable<IAppConfig['caching']['invalidation']>, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) invalidating..., page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}`);

    if(!queryVariants.length && cacheVaryOptions === 'VaryByIdAndSystemParamsOnly') {
      queryVariants.push({});
    }

    let attempCount = 0;
    while(++attempCount <= options.retries.attemptsCount) {
      try {
        this.logger.debug(`(HtmlPageCacheCleaner) page invalidation attemptNo=${attempCount}, page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}`);
        const keys = await this.getMatchedKeys(allKeys, page, id, cacheVaryOptions, queryVariants);
      
        for(let i = 0; i < keys.length; i++) {
          const key = keys[i];
          this.logger.verbose(`(HtmlPageCacheCleaner) removing key=${key}, page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}`);
          await this.nitroCache.removeItem(key);
        }
        break;  
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) failed to invalidate page cache, page=${page.valueOf()}, id=${id ?? ''}, attemptNo=${attempCount}, numAllKeys=${allKeys.length}`, err);
        if(attempCount === options.retries.attemptsCount) {
          if(throwOnError) {
            throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to invalidate page cache', 'error-page');
          } else {
            return;
          }
        } else {
          await delay(options.retries.intervalMs);
        }
      }
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) invalidation completed, page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}`);
  };

  invalidatePage = async (mode: 'schedule' | 'immediate', page: AppPage, id: EntityId | undefined): Promise<void> => {
    if(!this.isCachingEnabled()) {
      return;
    }

    this.logger.debug(`(HtmlPageCacheCleaner) invalidate page, mode=${mode}, page=${page.valueOf()}, id=${id ?? ''}`);

    const timestamp = new Date();
    if(mode === 'immediate') {
      const allKeys = await this.getAllKeysInCache();
      const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(page));
      const cacheVaryOptions = pageMetadata.getCacheVaryOptions();
      if(cacheVaryOptions === 'UseEntityChangeTimestamp') {
        await this.updatePageTimestamps([{
          id,
          page,
          timestamp
        }], true);
      } 
      const queryVariants = pageMetadata.getAllCachingQueryVariants();
      await this.doInvalidatePage(allKeys, page, id, AppConfig.caching.invalidation!, cacheVaryOptions, queryVariants, true);
    } else {
      this.scheduledItems.push({
        page,
        id,
        timestamp: timestamp
      });
    }

    this.logger.debug(`(HtmlPageCacheCleaner) invalidate page - exit, mode=${mode}, page=${page.valueOf()}, id=${id ?? ''}`);
  };
  
  escapeKey = (key: string | string[]): string => {
    return String(key).replace(/\W/g, "");
  };

  /**
   * Nitro 2.9.6
   * Based on https://github.com/unjs/nitro/blob/b2831dd505864c91589373613e92d53e3c4c40e1/src/runtime/cache.ts#L247
   */
  getKeyWithoutHeadersVary = (url: string): string => {
    const _pathname = this.getKeyWithoutHash(url);
    return `${_pathname}.${hash(url)}`;
  };

  getKeyWithoutHash = (url: string): string => {
    return this.escapeKey(decodeURI(parseURL(url).pathname)).slice(0, 16) || "index";
  };

  getOgImageKey = (page: AppPage, id: EntityId): string => {
    return `${AppConfig.caching.invalidation.ogImageCachePrefix}:${getPagePath(page)}:${id}`;
  };

  formatKeyUrl = (siteUrl: string | undefined, page: AppPage, id: EntityId | undefined, keyObj: { locale: Locale }, insertOgImagePathSegment: boolean, addOgImageFileExtension: boolean) => {
    const locale = keyObj.locale as Locale;
    const url = parseURL(joinURL(siteUrl ?? '/', insertOgImagePathSegment ? OgImagePathSegment : '', locale === DefaultLocale ? '' :locale, getPagePath(page), id ?? '', addOgImageFileExtension ? `og.${OgImageExt}` : ''));
    if(keyObj) {
      url.search = stringifyQuery(omit(keyObj, 'locale'));
    }
    const path = stringifyParsedURL(url);
    return path;
  };

  removeFieldsWithEmptyValues = (queryObj: any): any => {
    if(!queryObj) {
      return {};
    };
    const nonEmptyTuples = toPairs(queryObj).filter(t => !!t[1]);
    if(!nonEmptyTuples.length) {
      return {};
    }
    return fromPairs(nonEmptyTuples);
  };


  getPossibleKeyPathParts = (page: AppPage, id: EntityId | undefined, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[]): string[] => {
    this.logger.debug(`(HtmlPageCacheCleaner) get possible key path parts, page=${page.valueOf()}, id=${id ?? ''}, cacheVaryOptions=${cacheVaryOptions}, numQueryVariants=${queryVariants.length}`);

    const paths = [];
    const result = [];
    
    const cacheKeyCreator: (url: string) => string = 
      cacheVaryOptions === 'PathAndPredefinedVariants' ? this.getKeyWithoutHeadersVary : this.getKeyWithoutHash;
    if(queryVariants.length) {
      for(let n = 0; n < AvailableLocaleCodes.length; n++) {
        for(let i = 0; i < queryVariants.length; i++) {
          const queryVariant = this.removeFieldsWithEmptyValues(queryVariants[i]);
          const cacheObj = { ...queryVariant, locale: AvailableLocaleCodes[n] };
          const urls =  [
            //this.formatKeyUrl(AppConfig.siteUrl, page, undefined, cacheObj, false, false),
            this.formatKeyUrl(undefined, page, id, cacheObj, false, false),
          ];
          for(let p = 0; p < urls.length; p++) {
            paths.push(urls[p]);
            result.push(cacheKeyCreator(urls[p]));
          }
        }
      }
    } else {
      for(let k = 0; k < AvailableLocaleCodes.length; k++) {
        const varyObj = { locale: AvailableLocaleCodes[k] };
        const urls =  [
          //this.formatKeyUrl(AppConfig.siteUrl, page, id, localeObj, false, false),
          this.formatKeyUrl(undefined, page, id, varyObj, false, false),
        ];
        for(let i = 0; i < urls.length; i++) {
          paths.push(urls[i]);
          result.push(cacheKeyCreator(urls[i]));
        }
      }
    }

    this.logger.debug(`(HtmlPageCacheCleaner) possible key path parts computed, page=${page.valueOf()}, id=${id ?? ''}, cacheVaryOptions=${cacheVaryOptions}, numQueryVariants=${queryVariants.length}, urls=[${paths.join('; ')}], result=[${result.join('; ')}]`);
    return result;    
  };

  getMatchedKeys = async (allKeys: string[], page: AppPage, id: EntityId | undefined, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[]): Promise<string[]> => {
    this.logger.debug(`(HtmlPageCacheCleaner) get matched keys, page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}, cacheVaryOptions=${cacheVaryOptions}, numQueryVariants=${queryVariants.length}`);
    const possibleKeyParts = this.getPossibleKeyPathParts(page, id, cacheVaryOptions, queryVariants);

    let matchedKeys: string[] = [];
    for(let i = 0; i < possibleKeyParts.length; i++) {
      matchedKeys.push(...(allKeys.filter(k => k.includes(possibleKeyParts[i]))));
    }
    matchedKeys = uniq(matchedKeys);

    this.logger.debug(`(HtmlPageCacheCleaner) matched keys obtained, page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}, cacheVaryOptions=${cacheVaryOptions}, numQueryVariants=${queryVariants.length}, result=[${matchedKeys.join('; ')}]`);
    return matchedKeys;
  };

  private doPurge = async (htmlPageTimestamp: Date, throwOnError: boolean): Promise<void> => {
    this.logger.info(`(HtmlPageCacheCleaner) purge, timestamp=${htmlPageTimestamp.toISOString()}`);

    let allKeys: string[] = [];
    try {
      allKeys = await this.getAllKeysInCache();
    } catch(err: any) {
      this.logger.error(`(HtmlPageCacheCleaner) failed to list all cache keys, timestamp=${htmlPageTimestamp.toISOString()}`, err);
      if(throwOnError) {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to purge nitro cache', 'error-page');
      } else {
        return;
      }
    }

    for(let i = 0; i < allKeys.length; i++) {
      try {
        await this.nitroCache.removeItem(allKeys[i]);
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) failed to remove item from cache, timestamp=${htmlPageTimestamp.toISOString()}`, err);
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to purge nitro cache', 'error-page');
        }
      }
    }

    await this.touchPageTimestamps(htmlPageTimestamp, throwOnError);
    
    this.logger.info(`(HtmlPageCacheCleaner) purge completed, timestamp=${htmlPageTimestamp.toISOString()}, num keys=${allKeys.length}`);
  };

  purge = async (): Promise<void> => {
    if(!this.isCachingEnabled()) {
      return;
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) purge - enter`);

    const htmlPageTimestamp = new Date();
    await this.doPurge(htmlPageTimestamp, true);

    this.logger.verbose(`(HtmlPageCacheCleaner) purge - exit`);
  };

  getStatsByKeyForLogMessage = <TItem>(items: TItem[], keySelector: (item: TItem) => string): [EntityModel, number][] => toPairs(groupBy(items, e => keySelector(e))).map(p => [p[0] as EntityModel, p[1].length]);
}

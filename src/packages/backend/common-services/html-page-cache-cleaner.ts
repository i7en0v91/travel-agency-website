import { type PageCacheVaryOptions, type UninitializedPageTimestamp, OgImagePathSegment, type Locale, DefaultLocale, AvailableLocaleCodes, AppConfig, delay , AppException, AppExceptionCodeEnum, OgImageExt, spinWait, lookupValueOrThrow, DbVersionInitial, AppPage, type IAppLogger, type EntityId, type IAppConfig, getPagePath, AllHtmlPages, type Timestamp, EntityChangeSubscribersOrder } from '@golobe-demo/shared';
import type { EntityChangeNotificationCallbackArgs, EntityChangeNotificationSubscriberId, IHtmlPageCacheCleaner, IEntityChangeNotificationTask, EntityChangeNotificationCallback } from './../types';
import type { PrismaClient } from '@prisma/client';
import { hash } from 'ohash';
import type { Storage, StorageValue } from 'unstorage';
import { AllEntityModels, type EntityModel, type IChangeDependencyTracker } from './change-dependency-tracker';
import type { HtmlPageModel, IHtmlPageModelMetadata } from './html-page-model-metadata';
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
    this.logger = logger.addContextProps({ component: 'HtmlPageCacheCleaner' });
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
    this.logger.verbose('subscribing for entity changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: AllEntityModels.map(e => { 
        return {
          entity: e, 
          ids: 'all'
        };
      }),
      order: EntityChangeSubscribersOrder.HtmlPageCleaner
    }, this.entityChangeCallback);

    this.logger.verbose('subscribed entity changes', subscriberId);
  };

  isCachingEnabled = () => AppConfig.caching.intervalSeconds;

  joinRunningCleanup = async(): Promise<boolean> => {
    const CLEANUP_TIMEOUT_SEC = 5 * 60;
    if(this.taskStatus === 'in-progress') {
      this.logger.debug('joining currently running cleanup');
      const completed = await spinWait(() => {
        return Promise.resolve(this.taskStatus === 'idle');
      }, CLEANUP_TIMEOUT_SEC * 1000);
      if(!completed) {
        this.logger.warn('timeout waiting for cleanup to complete', undefined, { status: this.taskStatus });
      }
      return true;
    }
    return false;
  };

  performCleanup = async(): Promise<void> => {
    this.logger.verbose('cleanup requested, current', { status: this.taskStatus });
    if(!this.isCachingEnabled()) {
      return;
    }

    if(await this.joinRunningCleanup()) {
      return;
    }

    const maxCount = AppConfig.caching.invalidation.maxChangedPagesForPurge * AverageEntityTypesPerPage;
    const since = this.lastChangedPagesRevision;
    const changedEntities = await this.changeDependencyTracker.getChangedEntities(since, maxCount);
    this.logger.debug('list of changed entities obtained', { since: since.toISOString(), count: changedEntities.length });

    if(await this.joinRunningCleanup()) {
      return;
    }

    await this.invalidatePagesOnEntityChanges(changedEntities, AppConfig.caching.invalidation!);
    this.logger.verbose('cleanup request completed, current', { status: this.taskStatus });
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
    this.logger.verbose('entity change callback');

    const changedEntities: {entity: EntityModel, id: EntityId}[] | 'too-much' = 
      args.target === 'too-much' ? 'too-much' : 
        flattenDeep(args.target.map(x => (x.ids as EntityId[]).map(id => {
          return {
            entity: x.entity,
            id: id
          };
        })));
    await this.invalidatePagesOnEntityChanges(changedEntities, AppConfig.caching.invalidation);

    this.logger.verbose('entity change callback completed');
  };

  invalidatePagesOnEntityChanges = async (changedEntities: {entity: EntityModel, id: EntityId}[] | 'too-much', options: NonNullable<IAppConfig['caching']['invalidation']>): Promise<void> => {
    this.logger.verbose('invalidating pages on entity on changes, current', { status: this.taskStatus, numChanges: changedEntities });
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
        const numChanges = isString(changedEntities) ? changedEntities : changedEntities.length;
        this.logger.warn('exception occured while trying to obtain list of recently changed pages', err, numChanges);
        newLastRevision = this.lastChangedPagesRevision;
      }
      if(itemsToProcess.length > options.maxChangedPagesForPurge) {
        needPurge = true;
      }
      
      if(needPurge) {
        const numChanges = isString(changedEntities) ? changedEntities : changedEntities.length;
        this.logger.warn('too much pages have been changed, cache purge will be performed, last', undefined, { revision: this.lastChangedPagesRevision.toISOString(), numChanges });
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
      const logCount = needPurge ? 'purge' : itemsToProcess.length;
      if(elapsedSecs > CleanTaskWarnTimeoutSecs || needPurge) {
        this.logger.warn('pages invalidation on entity changes completed', undefined, { elapsedSec: elapsedSecs, count: logCount, revision: newLastRevision.toISOString() });
      } else {
        this.logger.verbose('pages invalidation on entity changes completed', { elapsedSec: elapsedSecs, count: logCount, revision: newLastRevision.toISOString() });
      }
    } catch(err: any) {
      const numChanges = isString(changedEntities) ? changedEntities : changedEntities.length;
      this.logger.warn('unexpected exception occured during pages invalidation on entity changes, last', err, { revision: this.lastChangedPagesRevision.toISOString(), numChanges });
    } finally {
      this.taskStatus = 'idle';
    }
  };

  getAffectedPagesOnEntityChanges = async(changedEntities: {entity: EntityModel, id: EntityId}[], maxCount: number): Promise<{ pages: ScheduledItem[] } | 'too-much'> => {
    this.logger.verbose('obtaining list of recently changed pages, num', { changes: changedEntities.length, maxCount });

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
        const affectedPages = this.getStatsByKeyForLogMessage(result, i => i.page.valueOf());
        this.logger.warn('too much pages have changed', undefined, { maxCount, pages: affectedPages, numChanges: changedEntities.length });
        return 'too-much';
      }
    }
    
    const result = Array.from(resultMap.values());
    this.logger.verbose('list of recently changed pages obtained', { count: result.length, maxCount, changes: changedEntities.length });
    return { pages: result };
  };

  async getAffectedPagesOnChange(changedEntities: {entity: EntityModel, id: EntityId}[]): Promise<AffectedPageInfo[]> {
    const statsLog = this.getStatsByKeyForLogMessage(changedEntities, e => e.entity);
    this.logger.debug('get affected pages', { totalCount: changedEntities.length, stats: statsLog });

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

          this.logger.verbose('new affected page found', { page: page.valueOf(), pageId: pageId ?? '', modifiedUtc: ip.modifiedUtc.toISOString(), entity: relatedEntityType, id: ip.id });
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
    const affectedPages = this.getStatsByKeyForLogMessage(result, i => i.page);
    this.logger.debug('affected pages obtained', { totalCount: changedEntities.length, result: affectedPages });
    return result;
  };

  htmlPage2Type = (page: AppPage): keyof typeof AppPage => {
    return page.toString() as keyof typeof AppPage;
  };

  htmlPageType2Enum = (page: keyof typeof AppPage): AppPage => {
    return lookupValueOrThrow(AppPage, page) as AppPage;
  };

  touchPageTimestamps = async (timestamp: Date, throwOnError: boolean): Promise<void> => {
    this.logger.verbose('touching page timestamps', { timestamp: timestamp.toISOString() });

    try {
      const count = await this.dbRepository.htmlPageTimestamp.updateMany({
        data: {
          timestamp: timestamp,
          version: { increment: 1 }
        }
      });

      this.logger.verbose('touching page timestamps - completed', { timestamp: timestamp.toISOString(), count });
    } catch(err: any) {
      this.logger.warn('failed to touch page timestamps', err, { timestamp: timestamp.toISOString() });
      if(throwOnError) {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to touch page timestamps', 'error-page');
      }
    }
  };

  calculatePageTimestamp = async (page: AppPage, id: EntityId | undefined, pageMetadata: HtmlPageModel<typeof page>): Promise<Date | UninitializedPageTimestamp> => {
    this.logger.verbose('calculating page timestamp', { page, id: id ?? '' });

    let result: Date | UninitializedPageTimestamp = 0;
    if(pageMetadata.identity) {
      this.logger.debug('loading page identity entity modified utc', { page, id: id ?? '', entity: pageMetadata.identity });
      result = await this.changeDependencyTracker.loadEntityModifiedUtc(pageMetadata.identity, id ?? 'most-recent', false);
    }

    if((pageMetadata.associatedWith?.length ?? 0) > 0) {
      for(let i = 0; i < pageMetadata.associatedWith!.length; i++) {
        const associatedEntity = pageMetadata.associatedWith![i];
        this.logger.debug('loading page associated entity most recent modified utc', { page, id: id ?? '', entity: associatedEntity });
        const modifiedUtc = await this.changeDependencyTracker.loadEntityModifiedUtc(associatedEntity, 'most-recent', false);
        if(modifiedUtc === 0) {
          continue;
        }
        if(result === 0 || dayjs(modifiedUtc).isAfter(result)) {
          result = modifiedUtc;
        }
      }
    }

    this.logger.verbose('page timestamp calculated', { page, id, result });
    return result;
  };

  getPageTimestamp = async (page: AppPage, id: EntityId | undefined, initializeIfNotExists: boolean): Promise<Date | UninitializedPageTimestamp | (Exclude<PageCacheVaryOptions, 'UseEntityChangeTimestamp'>)> => {
    this.logger.debug('obtaining page current timestamp', { page, id: id ?? '', initializeIfNotExists });

    const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(page)) as HtmlPageModel<typeof page>;
    const cacheVaryOptions = pageMetadata.getCacheVaryOptions();
    if(cacheVaryOptions !== 'UseEntityChangeTimestamp') {
      this.logger.debug('obtaining page current timestamp - not applicable', { page, id: id ?? '', initializeIfNotExists, vary: cacheVaryOptions });
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
      this.logger.debug('obtaining page current timestamp - no timestamp stored', { page, id: id ?? '', initializeIfNotExists });
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
      this.logger.warn('cannot calculate page timestamp', undefined, { page, id: id ?? '', initializeIfNotExists, result: timestamp });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'failed to calculate page timestamp', 'error-page');
    } else {
      this.logger.debug('page current timestamp - obtained', { page, id: id ?? '', initializeIfNotExists, result: timestamp.toISOString() });
    }
    
    return timestamp;
  };

  updatePageTimestamps = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose('updating page timestamps', { size: timestamps.length });
    if(timestamps.length) {
      const isBatchingSupported = true; // may depend on DB provider 
      if(isBatchingSupported) {
        await this.updatePageTimestampsWithBatches(timestamps, throwOnError);
      } else {
        await this.updatePageTimestampsOneByOne(timestamps, throwOnError);
      }
    }
    this.logger.verbose('page timestamps update completed', { size: timestamps.length });
  };

  updatePageTimestampsWithBatches = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.debug('updating page timestamps (in batches', { count: timestamps.length });

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
          this.logger.debug('creating new timestamps (in batches', { chunk: i, count: createList.length });
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
          this.logger.debug('updating existing timestamps', { chunk: i, count: updateList.length });
          // TODO: find safe way to update multiple timestamps in one request
          await this.updatePageTimestampsOneByOne(updateList, throwOnError);
          chunkSucceeded += updateList.length;
          chunkFailed -= updateList.length;
        }
      } catch(err: any) {
        this.logger.warn('failed to update existing timestamps', err, { count: timestamps.length });
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update existing page timestamps', 'error-page');
        }
      } finally {
        succeeded += chunkSucceeded;
        failed += chunkFailed;
      }
    }

    this.logger.debug('page timestamps updated (in batches', { succeeded, failed });
  };

  updatePageTimestampsOneByOne = async (timestamps: {page: AppPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.debug('updating page timestamps (one-by-one', { count: timestamps.length });
    
    let succeeded = 0;
    let failed = 0;
    for(let i = 0; i < timestamps.length; i++) {
      const pageUpdateData = timestamps[i];
      try {
        await this.dbRepository.htmlPageTimestamp.upsert({
          create: {
            id: this.getPageTimestampDbId(pageUpdateData.page, pageUpdateData.id),
            timestamp: pageUpdateData.timestamp,
            version: DbVersionInitial
          },
          update: {
            timestamp: pageUpdateData.timestamp,
            version: {  increment: 1 }
          },
          where: {
            id: this.getPageTimestampDbId(pageUpdateData.page, pageUpdateData.id)
          }
        });
        succeeded++;
      } catch(err: any) {
        this.logger.warn('failed to update all page timestamps (one-by-one', err, { page: pageUpdateData.page, id: pageUpdateData.id, timestamp: pageUpdateData.timestamp.toISOString() });
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update page timestamp', 'error-page');
        } else {
          failed++;
        }
      }
    };

    this.logger.debug('page timestamps updated (one-by-one', { succeeded, failed });
  };

  doInvalidatePage = async (allKeys: string[], page: AppPage, id: EntityId | undefined, options: NonNullable<IAppConfig['caching']['invalidation']>, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose('invalidating', { page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length });

    if(!queryVariants.length && cacheVaryOptions === 'VaryByIdAndSystemParamsOnly') {
      queryVariants.push({});
    }

    let attempCount = 0;
    while(++attempCount <= options.retries.attemptsCount) {
      try {
        this.logger.debug('page invalidation', { attemptNo: attempCount, page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length });
        const keys = await this.getMatchedKeys(allKeys, page, id, cacheVaryOptions, queryVariants);
      
        for(let i = 0; i < keys.length; i++) {
          const key = keys[i];
          this.logger.verbose('removing', { key, page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length });
          await this.nitroCache.removeItem(key);
        }
        break;  
      } catch(err: any) {
        this.logger.warn('failed to invalidate page cache', err, { page: page.valueOf(), id: id ?? '', attemptNo: attempCount, numAllKeys: allKeys.length });
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

    this.logger.verbose('invalidation completed', { page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length });
  };

  invalidatePage = async (mode: 'schedule' | 'immediate', page: AppPage, id: EntityId | undefined): Promise<void> => {
    if(!this.isCachingEnabled()) {
      return;
    }

    this.logger.debug('invalidate page', { mode, page: page.valueOf(), id: id ?? '' });

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

    this.logger.debug('invalidate page - exit', { mode, page: page.valueOf(), id: id ?? '' });
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
    this.logger.debug('get possible key path parts', { page: page.valueOf(), id: id ?? '', cacheVaryOptions, numQueryVariants: queryVariants.length });

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

    this.logger.debug('possible key path parts computed', { page: page.valueOf(), id: id ?? '', cacheVaryOptions, numQueryVariants: queryVariants.length });
    return result;    
  };

  getMatchedKeys = async (allKeys: string[], page: AppPage, id: EntityId | undefined, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[]): Promise<string[]> => {
    this.logger.debug('get matched keys', { page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length, cacheVaryOptions, numQueryVariants: queryVariants.length });
    const possibleKeyParts = this.getPossibleKeyPathParts(page, id, cacheVaryOptions, queryVariants);

    let matchedKeys: string[] = [];
    for(let i = 0; i < possibleKeyParts.length; i++) {
      matchedKeys.push(...(allKeys.filter(k => k.includes(possibleKeyParts[i]))));
    }
    matchedKeys = uniq(matchedKeys);

    this.logger.debug('matched keys obtained', { page: page.valueOf(), id: id ?? '', numAllKeys: allKeys.length, cacheVaryOptions, numQueryVariants: queryVariants.length });
    return matchedKeys;
  };

  private doPurge = async (htmlPageTimestamp: Date, throwOnError: boolean): Promise<void> => {
    this.logger.info('purge', { timestamp: htmlPageTimestamp.toISOString() });

    let allKeys: string[] = [];
    try {
      allKeys = await this.getAllKeysInCache();
    } catch(err: any) {
      this.logger.error('failed to list all cache keys', err, { timestamp: htmlPageTimestamp.toISOString() });
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
        this.logger.warn('failed to remove item from cache', err, { timestamp: htmlPageTimestamp.toISOString() });
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to purge nitro cache', 'error-page');
        }
      }
    }

    await this.touchPageTimestamps(htmlPageTimestamp, throwOnError);
    
    this.logger.info('purge completed', { timestamp: htmlPageTimestamp.toISOString(), keys: allKeys.length });
  };

  purge = async (): Promise<void> => {
    if(!this.isCachingEnabled()) {
      return;
    }

    this.logger.verbose('purge - enter');

    const htmlPageTimestamp = new Date();
    await this.doPurge(htmlPageTimestamp, true);

    this.logger.verbose('purge - exit');
  };

  getStatsByKeyForLogMessage = <TItem>(items: TItem[], keySelector: (item: TItem) => string): [EntityModel, number][] => toPairs(groupBy(items, e => keySelector(e))).map(p => [p[0] as EntityModel, p[1].length]);
}

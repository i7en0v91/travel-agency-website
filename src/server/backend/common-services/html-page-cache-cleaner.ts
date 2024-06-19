import { hash } from 'ohash';
import type { Storage, StorageValue } from 'unstorage';
import { type PageCacheVaryOptions, type IHtmlPageCacheCleaner, type IAppLogger, type EntityId, type IAppConfig, getHtmlPagePath, AllHtmlPages, type Timestamp } from '../app-facade/interfaces';
import { type EntityModel, type IChangeDependencyTracker } from './../common-services/change-dependency-tracker';
import { type IHtmlPageModelMetadata } from './../common-services/html-page-model-metadata';
import { OgImagePathSegment, type Locale, DefaultLocale, AvailableLocaleCodes, AppConfig, delay , AppException, AppExceptionCodeEnum, OgImageExt, spinWait, parseEnumOrThrow, DbVersionInitial } from '../app-facade/implementation';
import { HtmlPage } from './../app-facade/interfaces';
import { parseURL, joinURL, stringifyParsedURL } from 'ufo';
import { setInterval as scheduleTimer } from 'timers';
import { stringifyQuery } from 'vue-router';
import uniq from 'lodash-es/uniq';
import omit from 'lodash-es/omit';
import toPairs from 'lodash-es/toPairs';
import fromPairs from 'lodash-es/fromPairs';
import groupBy from 'lodash-es/groupBy';
import dayjs from 'dayjs';
import { Prisma, type PrismaClient } from '@prisma/client';

const AverageEntityTypesPerPage = 10;
const CleanTaskWarnTimeoutSecs = 10;
const MaxTimerIntervalSec = 2147483;

declare type ScheduledItem = {
  page: HtmlPage,
  id: EntityId | undefined,
  timestamp: Date
};

declare type AffectedPageInfo = {
  page: HtmlPage;
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

  private taskStatus: 'idle' | 'in-progress';
  private scheduledItems: ScheduledItem[];
  private lastChangedPagesRevision: Date;

  public static inject = ['changeDependencyTracker', 'htmlPageModelMetadata', 'nitroCache', 'dbRepository', 'logger'] as const;
  constructor (changeDependencyTracker: IChangeDependencyTracker, htmlPageModelMetadata: IHtmlPageModelMetadata, nitroCache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.nitroCache = nitroCache;
    this.changeDependencyTracker = changeDependencyTracker;
    this.pageMetadata = htmlPageModelMetadata;
    this.dbRepository = dbRepository;
    this.taskStatus = 'idle';
    this.scheduledItems = [];
    this.lastChangedPagesRevision = dayjs().toDate();
  }

  isCachingEnabled = () => AppConfig.caching.imagesCachingSeconds || AppConfig.caching.htmlPageCachingSeconds;

  initialize = (): void => {
    if(this.isCachingEnabled()) {
      this.logger.verbose('(HtmlPageCacheCleaner) starting in background...');
      if(!AppConfig.caching.invalidation) {
        this.logger.warn('(HtmlPageCacheCleaner) caching enabled, but invalidation options are not specified');
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'incorrect server configuration', 'error-page');
      }
      this.startTaskTimerLoop(AppConfig.caching.invalidation);
      this.logger.verbose('(HtmlPageCacheCleaner) started');
    }
  };

  startTaskTimerLoop = (options: NonNullable<IAppConfig['caching']['invalidation']>) => {
    this.logger.verbose(`(HtmlPageCacheCleaner) starting invalidation task timer loop`, options);
    if(options.intervalSeconds > MaxTimerIntervalSec) {
      this.logger.warn(`(HtmlPageCacheCleaner) too large interval value speficified - ${options.intervalSeconds}, max allowed = ${MaxTimerIntervalSec}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'incorrect server configuration', 'error-page');
    }
    scheduleTimer(() => this.invalidationTimerCallback(options), options.intervalSeconds * 1000);
  };

  invalidationTimerCallback = async (options: NonNullable<IAppConfig['caching']['invalidation']>): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) invalidation timer callback, current status=${this.taskStatus}`);
    if(this.taskStatus === 'in-progress') {
      this.logger.verbose(`(HtmlPageCacheCleaner) skipping invalidation iteration - still in progress`);
      return;  
    }
    await this.runInvalidationTask(options);
    this.logger.verbose(`(HtmlPageCacheCleaner) invalidation timer callback completed, current status=${this.taskStatus}`);
  };

  performCleanup = async(): Promise<void> => {
    if(!this.isCachingEnabled()) {
      return;
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) cleanup requested, current status=${this.taskStatus}`);
    if(!AppConfig.caching) {
      this.logger.verbose('(HtmlPageCacheCleaner) cleanup request completed - caching disabled');
      return;
    }

    const CLEANUP_TIMEOUT_SEC = 5 * 60;
    if(this.taskStatus === 'in-progress') {
      this.logger.debug(`(HtmlPageCacheCleaner) joining currently running cleanup`);
      const completed = await spinWait(() => {
        return Promise.resolve(this.taskStatus === 'idle');
      }, CLEANUP_TIMEOUT_SEC * 1000);
      if(!completed) {
        this.logger.warn(`(HtmlPageCacheCleaner) timeout waiting for cleanup to complete, current status=${this.taskStatus}`);
      }
    } else {
      await this.runInvalidationTask(AppConfig.caching.invalidation!);
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) cleanup request completed, current status=${this.taskStatus}`);
  };

  date2Timestamp = (date: Date): Timestamp => date.getTime();

  getPageTimestampDbId = (page: HtmlPage, id: EntityId | undefined): string => `${page.toString()}_${id ?? ''}`;

  getAllKeysInCache = async (): Promise<string[]> => {
    const result: string[] = [];
    for(let i = 0; i < this.PageCacheBase.length; i++) {
      result.push(...(await this.nitroCache.getKeys(this.PageCacheBase[i])));
    }
    return result;
  };

  runInvalidationTask = async (options: NonNullable<IAppConfig['caching']['invalidation']>): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) run invalidation task, current status=${this.taskStatus}`);
    const now = dayjs().toDate();
    this.taskStatus = 'in-progress';
    try {
      const allKeys = await this.getAllKeysInCache();
      const itemsToProcess = this.scheduledItems.splice(0, this.scheduledItems.length);

      let needPurge: boolean = false;
      let newLastRevision = now;
      try {
        const recentlyChangedPages = await this.getRecentlyChangedPages(this.lastChangedPagesRevision, options.maxChangedPagesForPurge);
        if(recentlyChangedPages === 'too-much') {
          needPurge = true;
        } else {
          itemsToProcess.push(...recentlyChangedPages);
        }
      } catch(err: any) {
        this.logger.warn(`(HtmlPageCacheCleaner) exception occured while trying to obtain list of recently changed pages`, err);
        newLastRevision = this.lastChangedPagesRevision;
      }
      if(itemsToProcess.length > options.maxChangedPagesForPurge) {
        needPurge = true;
      }
      
      if(needPurge) {
        this.logger.warn(`(HtmlPageCacheCleaner) too much pages have been changed, cache purge will be performed, last revision=${this.lastChangedPagesRevision.toISOString()}`);
        const timestamp = now;
        await this.doPurge(timestamp, false);
        newLastRevision = now;
      } else {
        const cachedByTimestampPages: {page: HtmlPage, id: EntityId | undefined, timestamp: Date}[] = [];
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
        await this.updatePageTimestamps(cachedByTimestampPages, false);
      }

      this.lastChangedPagesRevision = newLastRevision;
      const elapsedSecs = dayjs().diff(dayjs(now), 'second');
      const logMsg = `(HtmlPageCacheCleaner) invalidation task completed, elapsed ${elapsedSecs} secs., count: ${needPurge ? 'purge' : itemsToProcess.length}, set revision=${newLastRevision.toISOString()}`;
      if(elapsedSecs > CleanTaskWarnTimeoutSecs || needPurge) {
        this.logger.warn(logMsg);
      } else {
        this.logger.verbose(logMsg);
      }
    } catch(err: any) {
      this.logger.warn(`(HtmlPageCacheCleaner) unexpected exception occured during invalidation task, last revision=${this.lastChangedPagesRevision.toISOString()}`, err);
    } finally {
      this.taskStatus = 'idle';
    }
  };

  getRecentlyChangedPages = async(since: Date, maxCount: number): Promise<ScheduledItem[] | 'too-much'> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) obtaining list of recently changed pages, since=${since.toString()}, maxCount=${maxCount}`);

    const changedEntities = await this.changeDependencyTracker.getAllChangedEntities(since, maxCount * AverageEntityTypesPerPage);
    if(changedEntities === 'too-much') {
      this.logger.verbose(`(HtmlPageCacheCleaner) list of recently changed pages obtained, since=${since.toString()}, too much entities have changed`);
      return 'too-much';
    }

    const resultMap = new Map<string, ScheduledItem>([]);
    for(let i = 0; i < changedEntities.length; i++) {
      const changedEntity = changedEntities[i];
      const affectedPages = await this.getAffectedPagesOnChange(changedEntity.entity, changedEntity.id);
      for(let j = 0; j < affectedPages.length; j++) {
        const affectedPage = affectedPages[j];
        const affectedPageKey = hash({ id: affectedPage.id ?? '', page: affectedPage.page.valueOf() });
        if(resultMap.has(affectedPageKey)) {
          continue;
        }
        resultMap.set(affectedPageKey, affectedPage);
        if(resultMap.size > maxCount) {
          const result = [...resultMap.entries()].map(e => e[1]);
          const stats = toPairs(groupBy(result, i => i.page.valueOf())).map(t => { return { page: t[0], count: t[1].length }; });
          this.logger.warn(`(HtmlPageCacheCleaner) too much pages have changed, since=${since.toString()}, stats=[${JSON.stringify(stats)}]`);
          return 'too-much';
        }
      }
    }
    
    const result = [...resultMap.values()];
    this.logger.verbose(`(HtmlPageCacheCleaner) list of recently changed pages obtained, since=${since.toString()}, count=${result.length}`);
    return result;
  };

  htmlPage2Type = (page: HtmlPage): keyof typeof HtmlPage => {
    return page.toString() as keyof typeof HtmlPage;
  };

  htmlPageType2Enum = (page: keyof typeof HtmlPage): HtmlPage => {
    return parseEnumOrThrow(HtmlPage, page) as HtmlPage;
  };

  loadEntityIdsBatch = async(entity: EntityModel, skip: number, take: number, timestamp: Date): Promise<EntityId[]> => {
    this.logger.debug(`(HtmlPageCacheCleaner) loading entity ids batch, entity=${entity}, skip=${skip}, take=${take}, timestamp=${timestamp.toISOString()}`);

    const IdColumnName = 'id';
    const ModifiedTimeColumnName = 'modifiedUtc';

    const selectSql =  `/*EIDS*/ SELECT ${entity}.${IdColumnName} AS "id" FROM ${entity} WHERE ${entity}.${ModifiedTimeColumnName} <= ? ORDER BY ${IdColumnName}  ASC LIMIT ${take} OFFSET ${skip}`;
    const query = Prisma.raw(selectSql);
    query.values.push(timestamp);

    const queryResult = await this.dbRepository.$queryRaw<{ id: string }[]>(query);
    
    const result = queryResult.map(x => x.id);
    this.logger.debug(`(HtmlPageCacheCleaner) entity ids batch loaded - entity=${entity}, skip=${skip}, take=${take}, timestamp=${timestamp.toISOString()}, count=${result.length}`);
    return result;
  };

  /**
   * Prerequisite - method assumes cache has been purged previously
   */
  purgeTimestampedPages = async (timestamp: Date, throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) updating all timestamped pages, timestamp=${timestamp.toISOString()}`);

    const pageIdentities: [HtmlPage, EntityModel | undefined][] = [];
    try {
      for(let i = 0; i < AllHtmlPages.length; i++) {
        const page = AllHtmlPages[i];
        const pageMetadata = this.pageMetadata.getMetadata(page);
        if(pageMetadata.getCacheVaryOptions() !== 'UseEntityChangeTimestamp') {
          continue;
        }
        pageIdentities.push([page, pageMetadata.identity]);
      }
    } catch(err: any) {
      this.logger.warn(`(HtmlPageCacheCleaner) failed to get all page identities while updating all timestamped pages, timestamp=${timestamp.toISOString()}`, err);
      if(throwOnError) {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update timestamped pages', 'error-page');
      } else {
        return;
      }
    }

    const pagesByIdentities: [EntityModel | undefined, HtmlPage[]][] = [];
    if(pageIdentities.some(x => !x[1])) {
      pagesByIdentities.push([undefined, pageIdentities.filter(x => !x[1]).map(y => y[0])]);
    }
    pagesByIdentities.push(...toPairs(groupBy(pageIdentities.filter(x => !!x[1]), t => t[1]!)).map(t => {
      return [t[0] as EntityModel, t[1].map(s => s[0]!)] as [EntityModel, HtmlPage[]];
    }));

    let numPages = 0;
    for(let i = 0; i < pagesByIdentities.length; i++) {
      const pages = pagesByIdentities[i][1];
      const entity = pagesByIdentities[i][0];
      this.logger.debug(`(HtmlPageCacheCleaner) updating all timestamped pages for entity=${entity ?? ''}, pages=[${pages.join('; ')}], timestamp=${timestamp.toISOString()}`);

      if(!entity) {
        for(let j = 0; j < pages.length; j++) {
          const page = pages[j];
          await this.updatePageTimestamps([{ page, timestamp, id: undefined }], throwOnError);
          numPages++;
          this.logger.debug(`(HtmlPageCacheCleaner) [${page}] (timestamped) page updated, numPages=1 (no identity), timestamp=${timestamp.toISOString()}`);
        }
        continue;
      }

      let pagingSkip = 0;
      const IdsBatchSize = 100;
      let idsBatch = await this.loadEntityIdsBatch(entity, pagingSkip, IdsBatchSize, timestamp);
      while(idsBatch.length > 0) {
        const timestamps: {page: HtmlPage, id: EntityId | undefined, timestamp: Date}[] = [];
        for(let j = 0; j < idsBatch.length; j++) {
          const pageId = idsBatch[j];
          for(let k = 0; k < pages.length; k++) {
            timestamps.push({ id: pageId, page: pages[k], timestamp });
          }
        }
        await this.updatePageTimestamps(timestamps, throwOnError);

        pagingSkip += idsBatch.length;
        idsBatch = await this.loadEntityIdsBatch(entity, pagingSkip, IdsBatchSize, timestamp);
      }
      this.logger.debug(`(HtmlPageCacheCleaner) all timestamped pages for entity=${entity ?? ''} updated, numEntities=${pagingSkip}, pages=[${pages.join('; ')}], timestamp=${timestamp.toISOString()}`);
      numPages += pagingSkip * pages.length;
    }

    this.logger.verbose(`(HtmlPageCacheCleaner) all timestamped pages updated, timestamp=${timestamp.toISOString()}, numPages=${numPages}`);
  };

  getPageTimestamp = async (page: HtmlPage, id: EntityId | undefined): Promise<Date | 0 | (Exclude<PageCacheVaryOptions, 'UseEntityChangeTimestamp'>)> => {
    this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp, page=${page}, id=${id ?? ''}`);

    const cacheVaryOptions = this.pageMetadata.getMetadata(this.htmlPage2Type(page)).getCacheVaryOptions();
    if(cacheVaryOptions !== 'UseEntityChangeTimestamp') {
      this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp - not applicable, page=${page}, id=${id ?? ''}, vary=${cacheVaryOptions}`);
      return cacheVaryOptions;
    }

    const timestamp = (await this.dbRepository.htmlPageTimestamp.findFirst({
      where: {
        id: this.getPageTimestampDbId(page, id)
      },
      select: {
        timestamp: true
      }
    }))?.timestamp;
    if(!timestamp) {
      this.logger.debug(`(HtmlPageCacheCleaner) obtaining page current timestamp - no timestamp stored, page=${page}, id=${id ?? ''}`);
      return 0;
    }

    this.logger.debug(`(HtmlPageCacheCleaner) page current timestamp - obtained, page=${page}, id=${id ?? ''}, result=${timestamp.toISOString()}`);
    return timestamp;
  };

  updatePageTimestamps = async (timestamps: {page: HtmlPage, id: EntityId | undefined, timestamp: Date}[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) updating page timestamps, count=${timestamps.length}`);
    if(!timestamps.length) {
      this.logger.verbose(`(HtmlPageCacheCleaner) page timestamps - nothing to update, count=${timestamps.length}`);
      return;
    }
    
    let succeeded = 0;
    let failed = 0;
    for(let i = 0; i < timestamps.length; i++) {
      const pageUpdateData = timestamps[i];
      try {
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
        this.logger.warn(`(HtmlPageCacheCleaner) failed to update all page timestamp, page=${pageUpdateData.page}, id=${pageUpdateData.id}, timestamp=${pageUpdateData.timestamp.toISOString()}`, err);
        if(throwOnError) {
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to update page timestamp', 'error-page');
        } else {
          failed++;
        }
      }
    };

    this.logger.verbose(`(HtmlPageCacheCleaner) page timestamps updated, succeeded=${succeeded}, failed=${failed}`);
  };

  doInvalidatePage = async (allKeys: string[], page: HtmlPage, id: EntityId | undefined, options: NonNullable<IAppConfig['caching']['invalidation']>, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[], throwOnError: boolean): Promise<void> => {
    this.logger.verbose(`(HtmlPageCacheCleaner) invalidating..., page=${page.valueOf()}, id=${id ?? ''}, numAllKeys=${allKeys.length}`);

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

  invalidatePage = async (mode: 'schedule' | 'immediate', page: HtmlPage, id: EntityId | undefined): Promise<void> => {
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

  getOgImageKey = (page: HtmlPage, id: EntityId): string => {
    return `${AppConfig.caching.invalidation.ogImageCachePrefix}:${getHtmlPagePath(page)}:${id}`;
  };

  formatKeyUrl = (siteUrl: string | undefined, page: HtmlPage, id: EntityId | undefined, keyObj: { locale: Locale }, insertOgImagePathSegment: boolean, addOgImageFileExtension: boolean) => {
    const locale = keyObj.locale as Locale;
    const url = parseURL(joinURL(siteUrl ?? '/', insertOgImagePathSegment ? OgImagePathSegment : '', locale === DefaultLocale ? '' :locale, getHtmlPagePath(page), id ?? '', addOgImageFileExtension ? `og.${OgImageExt}` : ''));
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


  getPossibleKeyPathParts = (page: HtmlPage, id: EntityId | undefined, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[]): string[] => {
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
            //this.formatKeyUrl(SiteUrl, page, undefined, cacheObj, false, false),
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
          //this.formatKeyUrl(SiteUrl, page, id, localeObj, false, false),
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

  getMatchedKeys = async (allKeys: string[], page: HtmlPage, id: EntityId | undefined, cacheVaryOptions: PageCacheVaryOptions, queryVariants: any[]): Promise<string[]> => {
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
      this.logger.warn(`(HtmlPageCacheCleaner) failed to list all cache keys, timestamp=${htmlPageTimestamp.toISOString()}`, err);
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

    await this.purgeTimestampedPages(htmlPageTimestamp, throwOnError);
    
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

  async getAffectedPagesOnChange(changedEntity: EntityModel, id: EntityId): Promise<AffectedPageInfo[]> {
    this.logger.debug(`(HtmlPageCacheCleaner) get affected pages, entity=${changedEntity}, id=${id}`);

    const changedEntities = await this.changeDependencyTracker.getChangedEntityChain(changedEntity, id);

    const resultMap = new Map<ReturnType<typeof hash>, AffectedPageInfo>();
    const changesByEntityType = groupBy(changedEntities, (e) => e.changedEntity);
    for(let p = 0; p < AllHtmlPages.length; p++) {
      const page = AllHtmlPages[p];
      const pageMetadata = this.pageMetadata.getMetadata(this.htmlPage2Type(page));
      if(!pageMetadata.identity && !(pageMetadata.accosiatedWith?.length ?? 0)) {
        continue;
      }

      const relatedEntityTypes = [pageMetadata.identity!, ...(pageMetadata.accosiatedWith ?? [])].filter(t => !!t);
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

          this.logger.verbose(`(HtmlPageCacheCleaner) new affected page found, page=${page.valueOf()}, pageId=${pageId ?? ''}, modifiedUtc=${ip.modifiedUtc.toISOString()}, related entity=${relatedEntityType}, related entity id=${ip.id} (triggered by dependency entity=${changedEntity}, id=${id})`);
          const affectedPageInfo: AffectedPageInfo = {
            page,
            id: pageId,
            timestamp: affectedPageInfoTimestamp
          };
          resultMap.set(pageInfoHash, affectedPageInfo);
        });
      }
    }

    const result = [...resultMap.values()];
    this.logger.debug(`(HtmlPageCacheCleaner) affected pages obtained, entity=${changedEntity}, id=${id},  result=[${result.map(i => JSON.stringify(i)).join('; ')}]`);
    return result;
  }
}

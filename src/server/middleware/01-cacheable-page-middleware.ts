import { parseQuery, parseURL, type ParsedURL, stringifyQuery, stringifyParsedURL } from 'ufo';
import { ApiEndpointPrefix, NuxtIslandPathSegment, NuxtImagePathSegment, QueryPageTimestampParam, QueryInternalRequestParam } from '../../shared/constants';
import { type IAppLogger } from '../../shared/applogger';
import { extractIdFromUrl, lookupPageByUrl } from '../../shared/common';
import { type H3Event } from 'h3';
import type { IHtmlPageModelMetadata } from '../backend/common-services/html-page-model-metadata';
import omit from 'lodash-es/omit';
import clone from 'lodash-es/clone';
import set from 'lodash-es/set';
import isNumber from 'lodash-es/isNumber';
import isDate from 'lodash-es/isDate';
import { type CacheByPageTimestamp, type IHtmlPageCacheCleaner, type HtmlPage, type PageCacheVaryOptions } from './../backend/app-facade/interfaces';
import { AppException, AppExceptionCodeEnum } from '../backend/app-facade/implementation';
import AppConfig from './../../appconfig';

async function redirectWithNewQuery(originalUrl: ParsedURL, newQuery: any, event: H3Event, logger?: IAppLogger): Promise<void> {
  const parsedUrl = clone(originalUrl);
  parsedUrl.search = stringifyQuery(newQuery);
  const resultUrl = stringifyParsedURL(parsedUrl);
  await sendRedirect(event, resultUrl);
  logger?.verbose(`(cacheable-page) redirect sent, original url=${event.node.req.url}, new url=${resultUrl}`);
}

async function handleMissedParams(
  originalUrl: ParsedURL, 
  page: HtmlPage, 
  cacheVaryOptions: PageCacheVaryOptions, 
  pageTimestamp: Awaited<ReturnType<IHtmlPageCacheCleaner['getPageTimestamp']>> | undefined, 
  missedParamNames: string[], 
  providedDefaults: ReadonlyMap<string, string>, 
  event: H3Event, 
  logger?: IAppLogger
): Promise<void> { 
  let redirectQuery = parseQuery(originalUrl.search);
  const unresolvedParams: string[] = [];
  let queryChanged = false;
  for(let i = 0; i < missedParamNames.length; i++) {
    const paramName = missedParamNames[i];
    const defaultValue = providedDefaults.get(paramName);
    if(defaultValue) {
      logger?.debug(`(cacheable-page) default value can be used for missed parameter, url=${event.node.req.url}, currentPage=${page}, missedParam=${paramName}, defaultValue=${defaultValue}`);
      redirectQuery = set(redirectQuery, paramName, defaultValue);
      queryChanged = true;
    } else {
      unresolvedParams.push(paramName);
    }
  }

  if(cacheVaryOptions === 'UseEntityChangeTimestamp' && unresolvedParams.length === 1 && unresolvedParams[0] === QueryPageTimestampParam) {
    const isCachingEnabled = AppConfig.caching.imagesCachingSeconds || AppConfig.caching.htmlPageCachingSeconds;
    if(isCachingEnabled) {
      if(redirectQuery[QueryInternalRequestParam] === '1') { // internal request should be correctly formatted
        logger?.error(`(cacheable-page) timestamp parameter must be specified for internal requests, url=${event.node.req.url}, currentPage=${page}, actual timestamp=${pageTimestamp}`);
        throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'timestamp parameter missed', 'error-page');
      };
      logger?.debug(`(cacheable-page) request query missed entity timestamp param, actual timestamp can be used, url=${event.node.req.url}, currentPage=${page}, actual timestamp=${pageTimestamp}`);
      redirectQuery = set(redirectQuery, QueryPageTimestampParam, pageTimestamp);
      queryChanged = true;
    }
    unresolvedParams.splice(0, 1);
  }

  if(unresolvedParams.length === 0) {
    if(queryChanged) {
      logger?.verbose(`(cacheable-page) all request query missed parameter values have been resolved, redirecting to with new query, url=${event.node.req.url}, currentPage=${page}, actual timestamp=${pageTimestamp}, new query=${JSON.stringify(redirectQuery)}`);
      await redirectWithNewQuery(originalUrl, redirectQuery, event, logger);
    } else {
      logger?.verbose(`(cacheable-page) all request query missed parameter values can be omitted, proceeding with current url, url=${event.node.req.url}, currentPage=${page}, actual timestamp=${pageTimestamp}`);
    }
    return; 
  }

  logger?.warn(`(cacheable-page) request query has missed required params, url=${event.node.req.url}, currentPage=${page}, missedParamNames=[${missedParamNames.join('; ')}], unresolvedParamNames=[${unresolvedParams.join('; ')}]`);
  event.context.cacheablePageParamsError = 'REQUIRED_PARAM_MISSED';
}

export default defineEventHandler(async (event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  if(event.context.cacheablePageParams) {
    logger?.debug(`(cacheable-page) already initialized, url=${event.node.req.url}`);
    return;
  }

  const url = parseURL(event.node.req.url);
  const pathname = url.pathname;
  if(pathname.startsWith(`${ApiEndpointPrefix}`)) {
    logger?.debug(`(cacheable-page) api request, skipping, url=${event.node.req.url}`);
    return;
  }
  if(pathname.includes(NuxtIslandPathSegment)) {
    logger?.debug(`(cacheable-page) nuxt island request, skipping, url=${event.node.req.url}`);
    return;
  }
  if(pathname.includes(NuxtImagePathSegment)) {
    logger?.debug(`(cacheable-page) nuxt image request, skipping, url=${event.node.req.url}`);
    return;
  }
  const currentPage = lookupPageByUrl(event.node.req.url ?? '/') ;
  if (currentPage === undefined) {
    logger?.verbose(`(cacheable-page) failed to detect current page type, url=${event.node.req.url}`);
    return;
  }

  const htmlPageModelMetadata = (globalThis as any)?.ServerServicesLocator?.getPageModelMetadata() as IHtmlPageModelMetadata;
  if(!htmlPageModelMetadata) {
    logger?.warn(`(cacheable-page) failed to initialize, metadata service is not available, url=${event.node.req.url}, currentPage=${currentPage}`);
    return;
  }

  const htmlPageCleaner = (globalThis as any)?.ServerServicesLocator?.getHtmlPageCacheCleaner() as IHtmlPageCacheCleaner;
  if(!htmlPageCleaner) {
    logger?.warn(`(cacheable-page) failed to initialize, html page cleaner service is not available, url=${event.node.req.url}, currentPage=${currentPage}`);
    return;
  }

  const pageMetadata = htmlPageModelMetadata.getMetadata(currentPage);
  let pageTimestamp: Awaited<ReturnType<typeof htmlPageCleaner.getPageTimestamp>> | undefined;
  try {
    if(pageMetadata.getCacheVaryOptions() === 'UseEntityChangeTimestamp') {
      const pageId = extractIdFromUrl(url.pathname);
      if(!!pageMetadata.identity && !pageId) {
        logger?.warn(`(cacheable-page) page's actual timestamp cannot be correctly obtained - failed to extract id from url, url=${event.node.req.url}, currentPage=${currentPage}`);
      } else {
        pageTimestamp = await (htmlPageCleaner.getPageTimestamp(currentPage, pageId));
      }
    }
  } catch(err: any) {
    logger?.warn(`(cacheable-page) failed to obtain page current timestamp, url=${event.node.req.url}, currentPage=${currentPage}`);
  }
  
  logger?.debug(`(cacheable-page) extracting and parsing cacheable page query info, url=${event.node.req.url}, currentPage=${currentPage}, pageTimestamp=${pageTimestamp ?? ''}`);
  const cacheableQueryParseResult = pageMetadata.parseCacheQueryParams(event.node.req.url!);
  switch(cacheableQueryParseResult.result) {
    case 'REDUNDANT_PARAM':
      logger?.verbose(`(cacheable-page) request query has redundant params, url=${event.node.req.url}, currentPage=${currentPage}, paramNames=[${cacheableQueryParseResult.redundantParamNames.join('; ')}]`);
      await redirectWithNewQuery(url, omit(parseQuery(url.search), cacheableQueryParseResult.redundantParamNames), event, logger);
      return;
    case 'REQUIRED_PARAM_MISSED':
      logger?.verbose(`(cacheable-page) request query has missed params, url=${event.node.req.url}, currentPage=${currentPage}, paramNames=[${cacheableQueryParseResult.missedParamNames.join('; ')}]`);
      await handleMissedParams(url, currentPage, pageMetadata.getCacheVaryOptions(), pageTimestamp, cacheableQueryParseResult.missedParamNames, cacheableQueryParseResult.providedDefaults, event, logger);
      return;
    case 'VALUE_NOT_ALLOWED':
      logger?.warn(`(cacheable-page) request query has value which is not allowed, url=${event.node.req.url}, currentPage=${currentPage}, paramName=${cacheableQueryParseResult.paramName}, value=${cacheableQueryParseResult.invalidValue}`);
      event.context.cacheablePageParamsError = 'VALUE_NOT_ALLOWED';
      return;
  }

  const cacheablePageQuery = cacheableQueryParseResult.parsedQuery;

  const isCachingEnabled = AppConfig.caching.imagesCachingSeconds || AppConfig.caching.htmlPageCachingSeconds;
  if(isCachingEnabled && cacheablePageQuery.getCacheVaryOptions() === 'UseEntityChangeTimestamp') {
    if(!isNumber(pageTimestamp) && !isDate(pageTimestamp)) {
      logger?.error(`(cacheable-page) page cache is timestamp-based, but current timestamp is not initialized, url=${event.node.req.url}, currentPage=${currentPage}`);
      return;
    }
    
    const requestTimestamp = (<CacheByPageTimestamp<any>>cacheablePageQuery).t;
    const actualTimestamp = (isDate(pageTimestamp) ? pageTimestamp.getTime() : pageTimestamp).toString();
    if(actualTimestamp !== requestTimestamp) {
      logger?.verbose(`(cacheable-page) request query timestamp does not match current actual, url=${event.node.req.url}, currentPage=${currentPage}, request t=${requestTimestamp}, actual t=${actualTimestamp}`);
      await redirectWithNewQuery(url, set(parseQuery(url.search), QueryPageTimestampParam, actualTimestamp), event, logger);
      return;
    }
  }
  
  event.context.cacheablePageParams = cacheablePageQuery;
  logger?.debug(`(cacheable-page) initialized, url=${event.node.req.url}, currentPage=${currentPage}`);
});

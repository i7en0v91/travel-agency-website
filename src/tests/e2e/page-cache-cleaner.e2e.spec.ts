/**
 * @vitest-environment happy-dom
 */

import { describe, test, assert, type TestOptions } from 'vitest';
import { $fetch } from 'ohmyfetch';
import { type Page, type Cookie } from 'playwright-core';
import { serialize as serializeCookie } from 'cookie-es';
import { setup, createPage, createBrowser } from '@nuxt/test-utils/e2e';
import dayjs from 'dayjs';
import { murmurHash } from 'ohash';
import { type EntityId, type StayServiceLevel } from './../../shared/interfaces';
import { type ParsedURL, joinURL, parseQuery, parseURL, stringifyParsedURL, stringifyQuery, withQuery } from 'ufo';
import { TEST_SERVER_PORT, createLogger, CREDENTIALS_TESTUSER_PROFILE as credentialsTestUserProfile, TEST_USER_PASSWORD } from '../../shared/testing/common';
import { spinWait, delay } from '../../shared/common';
import { type Locale, type RecoverPasswordCompleteResultEnum, ApiEndpointBookingDownload, HeaderAppVersion, CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken, ApiEndpointPurgeCache, ApiEndpointTestingPageCacheAction, DefaultLocale, CookieI18nLocale, HeaderDate, HeaderLastModified, HeaderCacheControl, HeaderEtag, HeaderContentType, ApiEndpointTestingCacheCleanup, OgImagePathSegment, OgImageExt, HeaderCookies, DefaultTheme } from '../../shared/constants';
import { HtmlPage, emailVerifyCompleteAllowedParamsOptions, flightsAllowedParamsOptions, forgotPasswordCompleteCacheParamsOptions, forgotPasswordSetAllowedParamsOptions, getHtmlPagePath, loginPageAllowedParamsOptions, signUpCompleteAllowedParamsOptions, stayBookAllowedParamsOptions, staysAllowedParamsOptions } from '../../shared/page-query-params';
import type { IAppLogger } from '../../shared/applogger';
import { type ITestingPageCacheActionDto, type ITestingPageCacheActionResultDto, TestingPageCacheActionEnum } from './../../server/dto';
import pick from 'lodash-es/pick';
import { defu } from 'defu';
import { destr } from 'destr';
import random from 'lodash-es/random';
import range from 'lodash-es/range';
import clone from 'lodash-es/clone';
import set from 'lodash-es/set';
import keys from 'lodash-es/keys';
import isNumber from 'lodash-es/isNumber';
import fromPairs from 'lodash-es/fromPairs';
import AppConfig from './../../appconfig';
import { HtmlPageModelMetadata, type IHtmlPageModelMetadata, type HtmlPageModel } from './../../server/backend/common-services/html-page-model-metadata';
import  { getLocaleFromUrl, localizePath } from './../../shared/i18n';

const TestTimeout = 600000;
const DefaultTestOptions: TestOptions = {
  timeout: TestTimeout,
  retry: 0,
  concurrent: false,
  sequential: true
};

const RedundantQueryParamName = 'redundantParam';

declare type RecoverPasswordCompleteResult = keyof typeof RecoverPasswordCompleteResultEnum;
declare type PageTestToken = string;
declare type PageChangeTimestamp = number;
declare type PageResponseTestResult = {
  lastChanged: PageChangeTimestamp,
  tokenPresent: boolean,
  redirect: { fromUrl?: string, toUrl?: string } | undefined,
  httpResponseDetails: {
    statusCode: number,
    etag: string | undefined,
    date: Date | undefined,
    cacheControl: string | undefined,
    isHtml: boolean
  };
};

declare type OgImageResponseTestResult = {
  lastChanged: PageChangeTimestamp | undefined,
  statusCode: number,
  imageBytesHash: number | undefined
};

declare type BookingDocumentDownloadResult = {
  statusCode: number,
  imageBytesHash: number | undefined
};

const TestHostUrl = `127.0.0.1:${TEST_SERVER_PORT}`;
const TestHostUrlWithProtocol = `http://${TestHostUrl}`;
const LastModifiedTimeHeaderPrecision = 1000;

const UiIinteractionDelayMs = 100; // user interaction delay

const TestLocales: Locale[] = [DefaultLocale, 'ru'];

async function performPageAction (page: HtmlPage, action: TestingPageCacheActionEnum, testId: EntityId | undefined, testToken: PageTestToken | undefined, authCookies: Cookie[] | undefined, logger: IAppLogger): Promise<ITestingPageCacheActionResultDto> {
  logger.verbose(`performing page action, page=${page.valueOf()}, action=${action}, testId=${testId}, testToken=${testToken}, numAuthCookies=${authCookies?.length ?? 0}`);

  const serializedAuthCookies = authCookies?.map(c => serializeCookie(c.name, c.value))?.join('; ');
  const outgoingHeaders: HeadersInit = {
    Host: TestHostUrl,
    ...(fromPairs([[HeaderContentType, 'application/json']])),
    ...(fromPairs([[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]])),
    ...(serializedAuthCookies ? fromPairs([[HeaderCookies, serializedAuthCookies]]) : {})
  };

  const reqBody: ITestingPageCacheActionDto =  {
    action,
    page,
    testId,
    testToken
  };
  const response = await fetch(joinURL(TestHostUrlWithProtocol, ApiEndpointTestingPageCacheAction), { body: JSON.stringify(reqBody), method: 'POST', headers: outgoingHeaders });
  const responseDto = await response.json();
  if(!response.ok) {
    logger.warn(`perform page action request failed, page=${page.valueOf()}, action=${action}, testId=${testId}, testToken=${testToken}, headers=${JSON.stringify(outgoingHeaders)}, result=${JSON.stringify(responseDto)}, code=${response.status}, statusText=${response.statusText}`);
    throw new Error('failed to perform page action');
  };
  const result = destr<ITestingPageCacheActionResultDto>(responseDto);

  logger.verbose(`page action performed, result testId=${result.testId}, page=${page.valueOf()}, action=${action}, testId=${testId}, testToken=${testToken}, numAuthCookies=${authCookies?.length ?? 0}`);
  return result;
};

async function pingServer(logger: IAppLogger): Promise<boolean> {
  logger.debug('pinging server');
  try {
    await $fetch(joinURL(TestHostUrlWithProtocol, AppConfig.logging.client.path),
      {
        method: 'POST',
        body: { testPing: true },
        cache: 'no-store',
        headers: [
          [HeaderAppVersion, AppConfig.versioning.appVersion.toString()], 
          [HeaderContentType, 'application/json']
        ]
      });
  } catch(err: any) {
    logger.info('pinging server - FAIL');
    return false;
  }
  logger.debug('pinging server - success');
  return true;
};

async function ensureServerStarted(logger: IAppLogger): Promise<void> {
  if(!await pingServer(logger)) {
    logger.info(`starting server`);
    const serverStarter = new PageTestHelper('starting server', `/${getHtmlPagePath(HtmlPage.Index)}`, DefaultLocale, false, logger);
    await serverStarter.start();
    await serverStarter.ensurePageHtmlLoaded();
    await serverStarter.stop();  
    logger.info(`server started`);
  }
}

class PageTestHelper {
  // using fixed desktop screen size as page's markup & layout is not tested by this runner (but navigation logic only)
  private readonly screenSize = { width: 1200, height: 800 };
  private readonly logger: IAppLogger;
  private currentPage: Page | undefined;
  private readonly testName: string;
  private url: string;
  private readonly requireAuth: boolean;
  private authCookies: Cookie[] | undefined;
  private readonly locale: Locale;

  private readonly outstandingRequestUrls: Set<string>;
  private loadingPageResponseState: Partial<PageResponseTestResult>;
  private htmlPageMetadata: IHtmlPageModelMetadata;

  constructor (testName: string, url: string, locale: Locale, requireAuth: boolean, logger: IAppLogger) {
    this.logger = logger;
    this.testName = testName;
    this.requireAuth = requireAuth;
    this.locale = locale;
    this.url = this.normalizeUrl(url, undefined);
    this.outstandingRequestUrls = new Set<string>();
    this.loadingPageResponseState = {};
    this.authCookies = undefined;
    this.htmlPageMetadata = new HtmlPageModelMetadata(logger);
  }

  getMetadata(page: keyof typeof HtmlPage): HtmlPageModel<typeof page> {
    return this.htmlPageMetadata.getMetadata(page);
  }

  generateNewToken = (): PageTestToken => {
    return Buffer.concat(
      range(0, 8).map(_ => 
        Uint8Array.of(random(1000000))
      )
    ).toString('base64');
  };

  normalizeUrl = (url: string, query: any): string => {
    const parsedUrl = parseURL(url);
    const parsedQuery = parsedUrl.search ? parseQuery(parsedUrl.search) : {};
    const resultQuery = query === null ? {} : { ...parsedQuery, ...(query ?? {}) };
    const urlObj: ParsedURL = {
      pathname: parsedUrl.pathname,
      hash: '',
      search: resultQuery ? stringifyQuery(resultQuery) : ''
    };
    if(getLocaleFromUrl(url) !== this.locale) {
      urlObj.pathname = localizePath(parsedUrl.pathname, this.locale);
    }
    return stringifyParsedURL(urlObj);
  };

  removeQueryFromUrl = (url: string): string => {
    const parsedUrl = parseURL(url);
    parsedUrl.search = '';
    return stringifyParsedURL(parsedUrl);
  };

  testIsCurrentUrl = (url: string): boolean => { 
    const testUrlWithoutQuery = this.removeQueryFromUrl(url);
    const currentPageUrlWithoutQuery = this.removeQueryFromUrl(this.url);

    const parsedUrl = parseURL(url);
    parsedUrl.pathname = localizePath(parsedUrl.pathname, DefaultLocale);
    parsedUrl.search = '';
    const testUrlWithoutQueryAndDefaultLocale = stringifyParsedURL(parsedUrl);

    const currentPageUrls = [currentPageUrlWithoutQuery, joinURL(TestHostUrlWithProtocol, currentPageUrlWithoutQuery)];
    currentPageUrls.push(...currentPageUrls.map(u => `${u}/`));
    const result = currentPageUrls.some(u => u === testUrlWithoutQuery || u === testUrlWithoutQueryAndDefaultLocale);
    return result;
  };

  captureAuthCookies = async (): Promise<void> => {
    const page = this.currentPage;
    if(!page) {
      return;
    }
    const context = page.context();
    const cookies = await context.cookies();
    const authCookies = cookies.filter(c => [CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken].includes(c.name));
    const isAuthenticated = authCookies.length === 3;
    if(!isAuthenticated) {
      return;
    }

    this.logger.debug(`auth cookies captured: current url=${await this.currentPage!.url()}`);
    this.authCookies = authCookies;
  };

  serializeRequestCookie = (cookie: Cookie): string => {
    return serializeCookie(cookie.name,  cookie.value);
  };

  responseHandler = async (url: string, httpCode: number, headers: {[key: string]: string} | undefined): Promise<void> => {
    await this.captureAuthCookies();
    if(!this.testIsCurrentUrl(url)) {
      return;
    }

    this.logger.verbose(`page response obtained: url=${url}, httpCode=${httpCode}, current url=${await this.currentPage!.url()}`);
    if(headers) {
      this.logger.verbose(`page test headers: [${JSON.stringify(pick(headers, [HeaderLastModified, HeaderCacheControl, HeaderEtag, HeaderDate, HeaderContentType].map(h => h.toLowerCase())))}]`);
      const dateStr = headers[HeaderDate.toLowerCase()];
      const lastModifiedStr = headers[HeaderLastModified.toLowerCase()] ?? dateStr;
      const cacheControlStr = headers[HeaderCacheControl.toLowerCase()];
      const etagStr = headers[HeaderEtag.toLowerCase()];
      const contentTypeStr = headers[HeaderContentType.toLowerCase()];      
      this.loadingPageResponseState = defu(
        {
          lastChanged: lastModifiedStr ? (dayjs(lastModifiedStr).toDate().getTime()) : undefined,
          httpResponseDetails: {
            etag: etagStr,
            isHtml: contentTypeStr ? contentTypeStr.includes('text/html') : false,
            cacheControl: cacheControlStr,
            date: dateStr ? dayjs(dateStr).toDate() : undefined,
            statusCode: httpCode
          }
        },
        this.loadingPageResponseState || {}
      ) as any;
    } else {
      this.loadingPageResponseState = defu(
        {
          httpResponseDetails: {
            statusCode: httpCode
          }
        },
        this.loadingPageResponseState || {}
      ) as any;
    }
    
    this.logger.verbose(`page response parsed: url=${url}, current url=${await this.currentPage!.url()}, loadingPageResponseState=${JSON.stringify(this.loadingPageResponseState)}`);
  };

  requestHandler = (url: string, type: 'started' | 'finished', redirected: { fromUrl?: string, toUrl?: string } | undefined) => {
    if(type === 'started') {
      this.outstandingRequestUrls.add(url);
    } else if(type === 'finished') {
      this.outstandingRequestUrls.delete(url);
      this.outstandingRequestUrls.delete(joinURL(TestHostUrlWithProtocol, url));
    }

    // reset page state if redirected to another page (but ignore authentication flow urls)
    if(redirected?.toUrl && !(['auth' /*, 'login'*/].some(surl => /*!(redirected!.toUrl?.includes('redundantParam') ?? false) &&*/ redirected!.toUrl!.includes(surl)))) {
      this.logger.verbose(`redirection response: fromUrl=${redirected.fromUrl}, toUrl=${redirected.toUrl}`);
      const parsedUrl = parseURL(redirected.toUrl);
      parsedUrl.host = parsedUrl.protocol = undefined;
      this.url = stringifyParsedURL(parsedUrl);
      this.outstandingRequestUrls.clear();
      this.loadingPageResponseState = {
          redirect: redirected,
        };
    }
  };

  isPageActive = () => this.currentPage && !this.currentPage.isClosed();

  isAuthenticated = async (): Promise<boolean> => {
    if (!this.currentPage) {
      this.logger.debug('page is undefined, user unauthenticated');
      return false;
    }

    const page = this.currentPage;
    const context = page.context();
    const cookies = await context.cookies();
    let isAuthenticated = cookies.filter(c => [CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken].includes(c.name)).length === 3;
    if(isAuthenticated) {
      isAuthenticated = (await page.locator('#nav-user-menu-anchor').innerText())?.length > 0;
    }

    this.logger.debug(`user is ${isAuthenticated ? 'authenticated' : 'NOT authenticated'}, currentPage=${this.currentPage?.url()}, path=${page.url()}`);
    return isAuthenticated;
  };

  /**
   * @param callbackUrlAdjust required in direct fetch requests when user authentication is needed
   */
  getAuthCookies = async (callbackUrlAdjust: string | undefined): Promise<Cookie[] | undefined> => {
    if(!this.authCookies) {
      await this.captureAuthCookies();
    }
    if(!this.authCookies) {
      return undefined;
    }
    const resultCookies = clone(this.authCookies);
    if(callbackUrlAdjust)  {
      const callbackUrlCookie = resultCookies?.find(c => c.name === CookieAuthCallbackUrl);
      if(callbackUrlCookie) {
        callbackUrlCookie.value = encodeURI(callbackUrlAdjust);
      }
    }
    return resultCookies;
  };

  private logInWithCredentials = async (): Promise<void> => {
    this.logger.verbose(`log-in, url=${this.url}, current url=${await this.currentPage!.url()}`);

    const page = this.currentPage!;

    await page.locator('form input[type=\'email\']').fill(credentialsTestUserProfile.email);
    await page.locator('form input[type=\'password\']').fill(TEST_USER_PASSWORD);
    await delay(UiIinteractionDelayMs);
    await page.locator('button.login-btn').click();
    this.logger.debug(`sign in button clicked, currentPage=${this.currentPage?.url()}`);

    await spinWait(async () => {
      return await this.isAuthenticated();
    }, TestTimeout);

    this.logger.verbose(`log-in completed, url=${this.url}, current url=${await this.currentPage!.url()}`);
  };

  setupBrowserPage = async(url: string, query: any): Promise<void> => {
    const needLogin = this.requireAuth && !this.authCookies;
    this.logger.verbose(`setting up new browser page context, url=${url}, query=${JSON.stringify(query)}, needLogin=${needLogin}`);

    this.loadingPageResponseState = {  };
    this.outstandingRequestUrls.clear();
    this.url = this.normalizeUrl(url, query);
    await createBrowser();   

    const userLocale = this.locale;
    const localeCookie = {
          name: CookieI18nLocale,
          domain: '127.0.0.1',
          expires: -1,
          httpOnly: false,
          sameSite: 'Lax' as const,
          path: '/',
          secure: false,
          value: userLocale
        };
    const allCookies: Cookie[] = [localeCookie, ...(this.authCookies ?? [])];

    this.currentPage = await createPage(needLogin ? localizePath(`/${getHtmlPagePath(HtmlPage.Login)}`, this.locale) : undefined, {
      viewport: { width: this.screenSize.width, height: this.screenSize.height },
      storageState: {
        cookies: allCookies,
        origins: []
      },
      locale: `${userLocale}-${userLocale.toUpperCase()}`,
    });
    if(needLogin) {
      await this.logInWithCredentials();
      this.loadingPageResponseState = {  };
      this.outstandingRequestUrls.clear();
      this.url = this.normalizeUrl(url, query);
    }

    const runOnlyIfBrowserContextIsActive = async (fn: () => Promise<void>) => {
      if(!this.isPageActive()) {
        return;
      }

      try {
        await fn();
      } catch(err: any) {
        if(!this.isPageActive()) {
          return;
        }
        throw err;
      }
    };

    this.currentPage.on('close', () => {
      this.logger.verbose(`received [Close] page event, test=${this.testName}`);
      this.currentPage = undefined;
      this.outstandingRequestUrls.clear();
    }).on('response', async (response) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const respHeaders = await response.allHeaders();
        const url = response.url();
        this.logger.debug(`on response, url=${url}, page url=${this.url}`);
        await this.responseHandler(url, response.status(), respHeaders);
      });
    }).on('request', async (request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const reqHeaders = await request.allHeaders();
        const url = request.url();
        const redirectedFrom = request.redirectedFrom()?.url();
        const redirectedTo = request.redirectedTo()?.url();
        this.logger.debug(`request started, url=${url}, redirectedFrom=${redirectedFrom}, redirectedTo=${redirectedTo}, reqHeaders=[${JSON.stringify(reqHeaders)}]`);
        this.requestHandler(url, 'started', (redirectedFrom || redirectedTo) ? { fromUrl: redirectedFrom, toUrl: redirectedTo } : undefined);
      });
    })
    .on('requestfinished', async(request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const url = request.url();
        this.logger.debug(`request finished, url=${url}`);
        this.requestHandler(url, 'finished', undefined);
      });
    })
    .on('requestfailed', async (request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const url = request.url();
        this.logger.warn(`request failed, url=${url}`);
        this.requestHandler(url, 'finished', undefined);
      });
    });
    await this.currentPage.goto(joinURL(TestHostUrlWithProtocol, this.url));

    this.logger.verbose(`browser page context set up, initial state: url=${this.url}, current url=${await this.currentPage!.url()}, cookies=${JSON.stringify(await this.currentPage!.context().cookies())}`);
  };

  start = async (): Promise<void> => {
    this.logger.info(`==== STARTING test ${this.testName} ====`);

    try {
      await this.setupBrowserPage(this.url, undefined);
    } catch (err: any) {
      this.logger.warn('failed to create browser page context', err);
      throw err;
    }
  };

  stop = async (): Promise<void> => {
    this.logger.verbose('stopping test case');

    if (this.currentPage) {
      this.logger.verbose('closing current page');
      const closingPage = this.currentPage;
      this.currentPage = undefined;
      this.outstandingRequestUrls.clear();
      await closingPage.close();
      this.logger.verbose('current page has been closed');
    }

    this.logger.info(`==== STOPPED test case ${this.testName} ====`);
  };

  timestamp2Str = (timestamp: PageChangeTimestamp) => {
    return new Date(timestamp).toISOString();
  };

  ensurePageHtmlLoaded = async (): Promise<void> => {
    this.logger.debug(`ensuring page html loaded, url=${this.url}, current url=${await this.currentPage!.url()}`);
    const loaded = await spinWait(() => {
      const isCurrentUrlRequestPending = this.outstandingRequestUrls.size && [...this.outstandingRequestUrls.values()].some(u => this.testIsCurrentUrl(u));
      return Promise.resolve(!isCurrentUrlRequestPending && this.loadingPageResponseState.httpResponseDetails?.statusCode !== undefined);
    }, TestTimeout);
    if(!loaded) {
      const msg = `timeout waiting for page html to load, url=${this.url}, current url=${await this.currentPage!.url()}`;
      this.logger.warn(msg);
      throw new Error(msg);
    }
    
    this.logger.debug(`page html loaded - ensured, url=${this.url}, current url=${await this.currentPage!.url()}`);
  };

  testPageResponse = async(testToken: PageTestToken, query: any, addRedundantParam: boolean | number, expectedErrorCode?: number | undefined): Promise<PageResponseTestResult> => {
    this.logger.verbose(`testing page response, testToken=${testToken}, query=${JSON.stringify(query)}, addRedundantParam=${addRedundantParam}, expectedErrorCode=${expectedErrorCode ?? ''}, current url=${await this.currentPage!.url()}`);

    const requestQuery = query === null ? null : (query ? clone(query) : {});
    if(addRedundantParam) {
      const redundantParamValue = isNumber(addRedundantParam) ? addRedundantParam : new Date().getTime();
      set(requestQuery, RedundantQueryParamName, redundantParamValue);
    }

    const newUrl = this.normalizeUrl(this.url, requestQuery);
    if(newUrl !== this.url) {
      this.url = newUrl;
    }
    await this.setupBrowserPage(this.url, requestQuery);
    await this.ensurePageHtmlLoaded();

    const statusCode =  this.loadingPageResponseState.httpResponseDetails?.statusCode;
    if(!statusCode || statusCode >= 400) {
      if(statusCode && expectedErrorCode && statusCode === expectedErrorCode) {
        this.logger.verbose(`page response test completed with expected error code, url=${this.url}, testToken=${testToken}, query=${JSON.stringify(query)}, addRedundantParam=${addRedundantParam}, expectedErrorCode=${expectedErrorCode ?? ''}`);
        return defu({ 
          httpResponseDetails: { statusCode, isHtml: true }, 
          tokenPresent: false
        }, 
        this.loadingPageResponseState || {  }, 
        { 
          redirect: undefined, 
          lastChanged: 0 
        }, 
        { 
          httpResponseDetails: { 
            etag: undefined, 
            date: undefined, 
            cacheControl: undefined 
          } 
        });
      }

      const msg = `got non-OK http status code=${statusCode}, url=${newUrl}, current url=${await this.currentPage!.url()}`;
      this.logger.warn(msg);
      throw new Error(msg);
    }

    const isHtml = this.loadingPageResponseState.httpResponseDetails?.isHtml ?? false;
    if(!isHtml) {
      const msg = `got non-HTML response, url=${newUrl}, current url=${await this.currentPage!.url()}`;
      this.logger.warn(msg);
      throw new Error(msg);
    }

    this.loadingPageResponseState.tokenPresent = (await this.currentPage?.innerHTML('body'))?.includes(testToken);
    const result = this.loadingPageResponseState as PageResponseTestResult;
    this.logger.verbose(`page response test completed, url=${this.url} ${result.redirect?.fromUrl ? `(redirected from ${result.redirect.fromUrl})` : ''}, tokenPresent=${result.tokenPresent}, timestamp=${result.lastChanged ? this.timestamp2Str(result.lastChanged!) : ''}, testToken=${testToken}, query=${JSON.stringify(query)}, addRedundantParam=${addRedundantParam}, expectedErrorCode=${expectedErrorCode ?? ''}`);
    return result;
  };

  testOgImageResponse = async(): Promise<OgImageResponseTestResult> => {
    this.logger.verbose(`testing og image response, url=${this.url}, current url=${await this.currentPage!.url()}`);

    const parsedUrl = parseURL(this.url);
    if(this.locale !== DefaultLocale) {
      parsedUrl.pathname = localizePath(parsedUrl.pathname, this.locale);
    }
    parsedUrl.pathname = joinURL(OgImagePathSegment, parsedUrl.pathname, `og.${OgImageExt}`);
    let imageSrc = stringifyParsedURL(parsedUrl);
    if(!imageSrc.includes(TestHostUrlWithProtocol)) {
      imageSrc = joinURL(TestHostUrlWithProtocol, imageSrc);
    }

    const authCookies = this.authCookies?.map(c => this.serializeRequestCookie(c))?.join('; ');
    const outgoingHeaders: HeadersInit = {
      Host: TestHostUrl,
      ...(fromPairs([[HeaderAppVersion, AppConfig.versioning.appVersion]])),
      ...(authCookies ? [[HeaderCookies, authCookies]] : [])
    };
    this.logger.debug(`fetching og image, src=${imageSrc}, headers=${JSON.stringify(outgoingHeaders)}, url=${this.url}, current url=${await this.currentPage!.url()}`);

    let result: OgImageResponseTestResult | undefined;
    const response = await $fetch(imageSrc,
      {
        method: 'GET',
        cache: 'no-store',
        body: undefined,
        headers: outgoingHeaders,
        responseType: 'blob',
        parseResponse: undefined,
        onRequestError: (req) => {
          this.logger.warn(`og image request error, src=${imageSrc}, statusCode=${req.response?.status}, statusText=${req.response?.statusText}, headers=${JSON.stringify(req.response?.headers?.entries())}, url=${this.url}`, req?.error);
          result = defu({ statusCode: req.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        },
        onResponse: (resp) => {
          const statusCode = resp.response.status;
          const headers = resp.response.headers;
          result = defu({ statusCode }, result || { lastChanged: undefined, imageBytesHash: undefined });
          if(statusCode >= 400) {
            this.logger.warn(`og image response failed, src=${imageSrc}, statusCode=${statusCode}, statusText=${resp.response.statusText}, headers=${JSON.stringify(headers.entries())}, url=${this.url}`);
            return;
          } else {
            this.logger.debug(`og image response obtained - parsing, src=${imageSrc}, statusCode=${statusCode}, headers=${JSON.stringify(headers.entries())}, url=${this.url}`);
          }
          const lastModifiedStr = headers.get(HeaderLastModified.toLowerCase()) ?? headers.get(HeaderDate.toLowerCase());
          if(lastModifiedStr) {
            result.lastChanged = lastModifiedStr ? (dayjs(lastModifiedStr).toDate().getTime()) : undefined;
          }
          this.logger.debug(`og image response parsed, src=${imageSrc}, url=${this.url}`);
        },
        onResponseError: (resp) => {
          this.logger.warn(`og image response error, src=${imageSrc}, statusCode=${resp.response?.status}, statusText=${resp.response?.statusText}, headers=${JSON.stringify(resp.response?.headers?.entries())}, url=${this.url}`, resp?.error);
          result = defu({ statusCode: resp.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        }
      });
    if(!result) {
      this.logger.warn(`og image request ended, but result has not been parsed, src=${imageSrc}, url=${this.url}`);
      throw new Error('og image request failed');
    }
    if(!response) {
      this.logger.warn(`og image request returned empty response, src=${imageSrc}, url=${this.url}`);
      throw new Error('og image response is empty');
    }
    const bytes = Buffer.from((await (response as Blob).arrayBuffer()));
    
    this.logger.debug(`computing og image bytes hash, size=${bytes.length}, src=${imageSrc}, url=${this.url}, current url=${await this.currentPage!.url()}`);
    result.imageBytesHash = murmurHash(bytes);
     
    this.logger.verbose(`og image response test completed: url=${this.url}, current url=${await this.currentPage!.url()}`);
    return result;
  };

  performPageAction = async (page: HtmlPage, action: TestingPageCacheActionEnum, testId: EntityId | undefined, testToken: PageTestToken | undefined): Promise<ITestingPageCacheActionResultDto> => {
    return await performPageAction(page, action, testId, testToken, this.authCookies, this.logger);
  };

  downloadBookingDocument = async (bookingId: EntityId): Promise<BookingDocumentDownloadResult> => {
    this.logger.verbose(`downloading booking document, bookingId=${bookingId}, url=${this.url}, current url=${await this.currentPage!.url()}`);

    const bookingSrc = joinURL(TestHostUrlWithProtocol, ApiEndpointBookingDownload(bookingId));

    const authCookies = await this.getAuthCookies(joinURL(TestHostUrlWithProtocol, getHtmlPagePath(HtmlPage.BookingDetails), bookingId));
    if(!authCookies) {
      this.logger.warn(`authentication is required to download booking, bookingId=${bookingId}, url=${this.url}, current url=${await this.currentPage!.url()}`);
      throw new Error('authentication is required to download booking');
    }
    const cookieHeader = authCookies?.map(c => this.serializeRequestCookie(c))?.join('; ');
    const outgoingHeaders: HeadersInit = {
      Host: TestHostUrl,
      ...(fromPairs([[HeaderAppVersion, AppConfig.versioning.appVersion]])),
      ...(cookieHeader ? fromPairs([[HeaderCookies, cookieHeader]]) : {})
    };
    this.logger.debug(`download booking document, src=${bookingSrc}, headers=${JSON.stringify(outgoingHeaders)}, url=${this.url}, current url=${await this.currentPage!.url()}`);

    let result: BookingDocumentDownloadResult | undefined;
    const response = await $fetch(bookingSrc,
      {
        method: 'GET',
        cache: 'no-store',
        body: undefined,
        headers: outgoingHeaders,
        query: { theme: DefaultTheme, locale: DefaultLocale },
        responseType: 'blob',
        parseResponse: undefined,
        onRequestError: (req) => {
          this.logger.warn(`booking document request error, src=${bookingSrc}, statusCode=${req.response?.status}, statusText=${req.response?.statusText}, headers=${JSON.stringify(req.response?.headers?.entries())}, url=${this.url}`, req?.error);
          result = defu({ statusCode: req.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        },
        onResponse: (resp) => {
          const statusCode = resp.response.status;
          const headers = resp.response.headers;
          result = defu({ statusCode }, result || { lastChanged: undefined, imageBytesHash: undefined });
          if(statusCode >= 400) {
            this.logger.warn(`booking document download response failed, src=${bookingSrc}, statusCode=${statusCode}, statusText=${resp.response.statusText}, headers=${JSON.stringify(headers.entries())}, url=${this.url}`);
            return;
          } else {
            this.logger.debug(`booking document download response obtained - parsing, src=${bookingSrc}, statusCode=${statusCode}, headers=${JSON.stringify(headers.entries())}, url=${this.url}`);
          }
        },
        onResponseError: (resp) => {
          this.logger.warn(`booking document download response error, src=${bookingSrc}, statusCode=${resp.response?.status}, statusText=${resp.response?.statusText}, headers=${JSON.stringify(resp.response?.headers?.entries())}, url=${this.url}`, resp?.error);
          result = defu({ statusCode: resp.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        }
      });
    if(!result) {
      this.logger.warn(`booking document download request ended, but result has not been parsed, src=${bookingSrc}, url=${this.url}`);
      throw new Error('booking document download failed');
    }
    if(!response) {
      this.logger.warn(`booking document download returned empty response, src=${bookingSrc}, url=${this.url}`);
      throw new Error('booking document download response is empty');
    }
    const bytes = Buffer.from((await (response as Blob).arrayBuffer()));
    
    this.logger.debug(`computing booking document bytes hash, size=${bytes.length}, src=${bookingSrc}, url=${this.url}, current url=${await this.currentPage!.url()}`);
    result.imageBytesHash = murmurHash(bytes);
     
    this.logger.verbose(`booking document download completed: url=${this.url}, current url=${await this.currentPage!.url()}`);
    return result;
  };

  purgeCache = async (): Promise<void> => {
    this.logger.verbose(`purging cache, url=${this.url}, current url=${await this.currentPage!.url()}`);

    const response = await fetch(joinURL(TestHostUrlWithProtocol, ApiEndpointPurgeCache), { method: 'POST', headers: [[HeaderContentType, 'application/json']] });
    if(!response.ok) {
      this.logger.warn(`cache purge request failed, url=${this.url}, currentPage=${this.currentPage?.url()}, code=${response.status}, statusText=${response.statusText}`);
      throw new Error('failed to purge cache');
    };

    this.logger.verbose(`cache purge completed, url=${this.url}, current url=${await this.currentPage!.url()}`);
  };

  runCacheCleanup = async (): Promise<void> => {
    this.logger.verbose(`running cache cleanup, url=${this.url}, current url=${await this.currentPage!.url()}`);

    const response = await fetch(joinURL(TestHostUrlWithProtocol, ApiEndpointTestingCacheCleanup), { method: 'POST', headers: [[HeaderContentType, 'application/json']] });
    if(!response.ok) {
      this.logger.warn(`cache cleanup request failed, url=${this.url}, currentPage=${this.currentPage?.url()}, code=${response.status}, statusText=${response.statusText}`);
      throw new Error('failed to run cache cleanup');
    };

    this.logger.verbose(`cache cleanup completed, url=${this.url}, current url=${await this.currentPage!.url()}`);
  };
}

describe('e2e:page-cache-cleaner rendered HTML page & OG Image cache invalidation', async () => {
  const logger = createLogger('(page-cache-cleaner)');
  logger.info('>>>>>>>>>>>>> NEW TEST RUN <<<<<<<<<<<<<<<<<<');

  await setup({
    browser: true,
    setupTimeout: 600000,
    browserOptions: {
      type: 'chromium'
    },
    port: TEST_SERVER_PORT
  });

  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const TestName1 = `[/${getHtmlPagePath(HtmlPage.Index)}] (${locale}) - company review changes`;
    test(TestName1, DefaultTestOptions, async () => {
      const pageUrl =  localizePath(`/${getHtmlPagePath(HtmlPage.Index)}`, locale);
      const testHelper = new PageTestHelper(TestName1, pageUrl, locale, false, logger);
      try {
        await testHelper.start();
        await testHelper.purgeCache();

        logger.verbose(`${TestName1} - prepare page`);
        let testId: string | undefined;
        const prepareResult = await testHelper.performPageAction(HtmlPage.Index, TestingPageCacheActionEnum.Prepare, testId, undefined);
        testId = prepareResult.testId;
        let testToken = testHelper.generateNewToken();
        let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent');
        const initialChangeTimestamp = pageTestResult.lastChanged;

        logger.verbose(`${TestName1} - change page`);
        testToken = testHelper.generateNewToken();
        const changeResult = await testHelper.performPageAction(HtmlPage.Index, TestingPageCacheActionEnum.Change, testId, testToken);
        testId = changeResult.testId;
        await delay(LastModifiedTimeHeaderPrecision);
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
        assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');
        
        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose(`${TestName1} - running cache cleanup`);
        await testHelper.runCacheCleanup();

        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
        const changedTimestamp = pageTestResult.lastChanged;
        assert(pageTestResult.tokenPresent, 'expected token to present');
        assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose(`${TestName1} - running cache cleanup again`);
        await testHelper.runCacheCleanup();
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
        assert(pageTestResult.tokenPresent, 'expected token to present');
        assert(pageTestResult.lastChanged === changedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');
      } finally {
        await testHelper.stop();
      }
    });
  }

  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test2Pages = [
      HtmlPage.Login, 
      HtmlPage.ForgotPassword,
      HtmlPage.ForgotPasswordComplete,
      HtmlPage.ForgotPasswordSet,
      HtmlPage.ForgotPasswordVerify,
      HtmlPage.Signup,
      HtmlPage.SignupComplete, 
      HtmlPage.SignupVerify,
      HtmlPage.EmailVerifyComplete
    ];
    for(let i = 0; i < Test2Pages.length; i++) {
      const testPage = Test2Pages[i];
      let pageUrl = localizePath(`/${getHtmlPagePath(testPage)}`, locale);
      if(testPage === HtmlPage.Login) {
        const callbackParamName = keys(loginPageAllowedParamsOptions).filter(x => x === 'callbackUrl');
        if(!callbackParamName) {
          throw new Error('expected callbackUrl param to be allowed for Login page');
        };
        pageUrl = withQuery(pageUrl, set({}, callbackParamName, localizePath(`/${getHtmlPagePath(HtmlPage.Index)}`, locale)));
      } else if(testPage === HtmlPage.ForgotPasswordSet || testPage === HtmlPage.SignupComplete || testPage === HtmlPage.EmailVerifyComplete) {
        const paramOptions = testPage === HtmlPage.ForgotPasswordSet ? forgotPasswordSetAllowedParamsOptions : 
        (testPage === HtmlPage.SignupComplete ? signUpCompleteAllowedParamsOptions : emailVerifyCompleteAllowedParamsOptions);
        const tokenIdParamName = keys(paramOptions).filter(x => x === 'token_id');
        if(!tokenIdParamName) {
          throw new Error(`expected token_id param to be allowed for ${testPage} page`);
        }
        const tokenValueParamName = keys(paramOptions).filter(x => x === 'token_value');
        if(!tokenValueParamName) {
          throw new Error(`expected token_value param to be allowed for ${testPage} page`);
        }
        let pageQuery = set({}, tokenIdParamName, random(1000000).toString());
        pageQuery = set(pageQuery, tokenValueParamName, random(1000000).toString());
        pageUrl = withQuery(pageUrl, pageQuery);
      } else if(testPage === HtmlPage.ForgotPasswordComplete) {
        const resultParamName = keys(forgotPasswordCompleteCacheParamsOptions).filter(x => x === 'result');
        if(!resultParamName) {
          throw new Error(`expected result param to be allowed for ${testPage} page`);
        }
        pageUrl = withQuery(pageUrl, set({}, resultParamName, <RecoverPasswordCompleteResult>'SUCCESS'));
      }

      // caching for this pages must be disabled in config
      const pageCachingMustBeDisabled = [
        HtmlPage.ForgotPasswordSet, 
        HtmlPage.SignupComplete, 
        HtmlPage.EmailVerifyComplete
      ].includes(testPage);

      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - auth form image changes ${pageCachingMustBeDisabled ? '(caching must be disabled)' : ''}`;
      test(testPageName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();
    
          logger.verbose(`${testPageName} - prepare page`);
          let testId: string | undefined;
          const prepareResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Prepare, testId, undefined);
          testId = prepareResult.testId;
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
    
          logger.verbose(`${testPageName} - change page`);
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, testId, testToken);
          testId = changeResult.testId;

          if(!pageCachingMustBeDisabled) {
            await delay(LastModifiedTimeHeaderPrecision);
            pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
            assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
            assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');  
          }
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPageName} - running cache cleanup`);
          await testHelper.runCacheCleanup();
    
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          const changedTimestamp = pageTestResult.lastChanged;
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');
    
          if(!pageCachingMustBeDisabled) {
            await delay(LastModifiedTimeHeaderPrecision);
            logger.verbose(`${testPageName} - running cache cleanup again`);
            await testHelper.runCacheCleanup();
            pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
            assert(pageTestResult.tokenPresent, 'expected token to present');
            assert(pageTestResult.lastChanged === changedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');
          }
        } finally {
          await testHelper.stop();
        }  
      });  
    }
  }

  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test3Pages = [HtmlPage.FindFlights, HtmlPage.FindStays];
    for(let i = 0; i < Test3Pages.length; i++) {
      const testPage = Test3Pages[i];
      const pageUrl = localizePath(`/${getHtmlPagePath(testPage)}`, locale);
      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - caching must be disabled`;
      test(testPageName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          logger.verbose(`${testPageName} - initial page open`);
          const testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          const initialChangeTimestamp = pageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          assert(pageTestResult.lastChanged > initialChangeTimestamp, 'expected page change timestamp to increase');
        } finally {
          await testHelper.stop();
        }
      });
    }
  }
  
  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test4Pages = [HtmlPage.Account, HtmlPage.Favourites];
    for(let i = 0; i < Test4Pages.length; i++) {
      const testPage = Test4Pages[i];
      const pageUrl = localizePath(`/${getHtmlPagePath(testPage)}`, locale);
      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - personal data must not be cached`;
      test(testPageName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testPageName, pageUrl, locale, true, logger);
          
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          logger.verbose(`${testPageName} - initial page open`);
          const testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          const initialChangeTimestamp = pageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          assert(pageTestResult.lastChanged > initialChangeTimestamp, 'expected page change timestamp to increase');
        } finally {
          await testHelper.stop();
        }
      });
    }
  }
  
  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test5Pages = [HtmlPage.FlightDetails, HtmlPage.BookFlight];
    for(let i = 0; i < Test5Pages.length; i++) {
      const testPage = Test5Pages[i];
      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - flight offer changes`;
      let serviceLevelParamName: string | undefined = 'serviceLevel';
      test(testPageName, DefaultTestOptions, async () => {
        let testHelper: PageTestHelper | undefined;
        try {
          await ensureServerStarted(logger);
          
          logger.verbose(`${testPage} - prepare page`);
          let flightOfferId: EntityId | undefined;
          const prepareResult = await performPageAction(testPage, TestingPageCacheActionEnum.Prepare, flightOfferId, undefined, undefined, logger);
          flightOfferId = prepareResult.testId;

          const pageUrl = localizePath(`/${getHtmlPagePath(testPage)}/${flightOfferId}`, locale);
          testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, logger);

          let defaultQuery: any = undefined;
          if(testPage === HtmlPage.BookStay) {
            serviceLevelParamName = keys(stayBookAllowedParamsOptions).find(x => x === serviceLevelParamName);
            assert(!!serviceLevelParamName, `expected serviceLevel param to be allowed for ${HtmlPage.BookStay} page`);
            defaultQuery = set({}, serviceLevelParamName, <StayServiceLevel>'CityView2');
          }

          await testHelper.start();
          await testHelper.purgeCache();
          
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, true);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
          await delay(LastModifiedTimeHeaderPrecision);

          if(testPage === HtmlPage.BookStay) {
            logger.verbose(`${testPageName} - try open page with incorrect parameter`);
            const incorrectServiceLevelQuery = set({}, serviceLevelParamName!, random(10000).toString());
            const incorrectServiceLevelPageTestResult = await testHelper.testPageResponse(testToken, incorrectServiceLevelQuery, false, 400);
            assert(incorrectServiceLevelPageTestResult.httpResponseDetails.statusCode === 400, 'expected bad request response');  
            await delay(LastModifiedTimeHeaderPrecision);
          }

          let ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //const initialOgImageChangeTimestamp = ogImageTestResult.lastChanged!;
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

          logger.verbose(`${testPage} - change page`);
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, flightOfferId, testToken);
          flightOfferId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, false);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged === initialOgImageChangeTimestamp, 'expected og image last changed time to be the same as on prepare stage');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash === initialOgImageBytesHash, 'expected og image content to be the same as on prepare stage');
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPage} - running cache cleanup`);
          await testHelper.runCacheCleanup();

          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, false);
          const changedTimestamp = pageTestResult.lastChanged;
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged! > initialOgImageChangeTimestamp, 'expected og image timestamp to increase');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash !== initialOgImageBytesHash, 'expected og image content to change');
          

          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPage} - running cache cleanup again`);
          await testHelper.runCacheCleanup();
          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, true);
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(pageTestResult.lastChanged === changedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');

          const anotherOgImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          //assert(anotherOgImageTestResult.lastChanged === ogImageTestResult.lastChanged, 'expected og image timestamp to remain the same');
          assert(anotherOgImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(anotherOgImageTestResult.imageBytesHash === ogImageTestResult.imageBytesHash, 'expected og image content to remain the same');
        } finally {
          await testHelper?.stop();
        }  
      });
    };
  }
  
  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test6Pages = [HtmlPage.StayDetails, HtmlPage.BookStay];
    for(let i = 0; i < Test6Pages.length; i++) {
      const testPage = Test6Pages[i];
      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - stay offer changes`;
      test(testPageName, DefaultTestOptions, async () => {
        let testHelper: PageTestHelper | undefined;
        try {
          await ensureServerStarted(logger);
          
          logger.verbose(`${testPage} - prepare page`);
          let stayOfferId: EntityId | undefined;
          const prepareResult = await performPageAction(testPage, TestingPageCacheActionEnum.Prepare, stayOfferId, undefined, undefined, logger);
          stayOfferId = prepareResult.testId;

          const pageUrl = localizePath(`/${getHtmlPagePath(testPage)}/${stayOfferId}`, locale);
          testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, logger);

          await testHelper.start();
          await testHelper.purgeCache();
          
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
          
          let ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //const initialOgImageChangeTimestamp = ogImageTestResult.lastChanged!;
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

          logger.verbose(`${testPage} - change page`);
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, stayOfferId, testToken);
          stayOfferId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged === initialOgImageChangeTimestamp, 'expected og image last changed time to be the same as on prepare stage');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash === initialOgImageBytesHash, 'expected og image content to be the same as on prepare stage');
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPage} - running cache cleanup`);
          await testHelper.runCacheCleanup();

          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
          const changedTimestamp = pageTestResult.lastChanged;
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged! > initialOgImageChangeTimestamp, 'expected og image timestamp to increase');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash !== initialOgImageBytesHash, 'expected og image content to change');
          

          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPage} - running cache cleanup again`);
          await testHelper.runCacheCleanup();
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(pageTestResult.lastChanged === changedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');

          const anotherOgImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          //assert(anotherOgImageTestResult.lastChanged === ogImageTestResult.lastChanged, 'expected og image timestamp to remain the same');
          assert(anotherOgImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(anotherOgImageTestResult.imageBytesHash === ogImageTestResult.imageBytesHash, 'expected og image content to remain the same');
        } finally {
          await testHelper?.stop();
        }  
      });
    };
  }

  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test7Pages = [HtmlPage.Flights, HtmlPage.Stays];
    for(let i = 0; i < Test7Pages.length; i++) {
      const testPage = Test7Pages[i];
      const pageUrl = localizePath(`/${getHtmlPagePath(testPage)}`, locale);
      const testPageName = `[/${getHtmlPagePath(testPage)}] (${locale}) - popular city changes, url varied by anyValue parameter (citySlug)`;
      test(testPageName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          const existingCitySlug = 'paris';
          const pageParamsOptions = testPage === HtmlPage.Flights ? flightsAllowedParamsOptions : staysAllowedParamsOptions;
          const citySlugParamName = keys(pageParamsOptions).filter(x => x === 'citySlug');
          assert(!!citySlugParamName, `expected citySlug param to be allowed for ${testPage} page`);

          logger.verbose(`${testPageName} - prepare page`);
          let testId: string | undefined;
          const prepareResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Prepare, testId, undefined);
          testId = prepareResult.testId;
          let testToken = testHelper.generateNewToken();
          let emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, true);
          assert(!emptyCityPageTestResult.tokenPresent, 'expected token to be absent');
          const emptyCityTimestamp = emptyCityPageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPageName} - open page with existing city`);
          const existingCityQuery = set({}, citySlugParamName, existingCitySlug);
          let existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, true);
          assert(!existingCityPageTestResult.tokenPresent, 'expected token to be absent');
          const existingCityTimestamp = existingCityPageTestResult.lastChanged;
          assert(existingCityTimestamp !== emptyCityTimestamp, 'expected timestamps to differ'); // page have been opened with different citySlug params


          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPageName} - try open page with non-existing city`);
          const nonExistingCityQuery = set({}, citySlugParamName, random(10000).toString());
          const nonExistingCityPageTestResult = await testHelper.testPageResponse(testToken, nonExistingCityQuery, false, 404);
          assert(nonExistingCityPageTestResult.httpResponseDetails.statusCode === 404, 'expected not found respose');

          
          logger.verbose(`${testPageName} - change page`);
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, testId, testToken);
          testId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, false);
          assert(!emptyCityPageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(emptyCityPageTestResult.lastChanged === emptyCityTimestamp, 'expected page last changed time to be the same as on prepare stage');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false);
          assert(!existingCityPageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(existingCityPageTestResult.lastChanged === existingCityTimestamp, 'expected page last changed time to be the same as on prepare stage');

          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPageName} - running cache cleanup`);
          await testHelper.runCacheCleanup();
    
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, false);
          const emptyCityChangedTimestamp = emptyCityPageTestResult.lastChanged;
          assert(emptyCityPageTestResult.tokenPresent, 'expected token to present');
          assert(emptyCityChangedTimestamp > emptyCityTimestamp, 'expected page change timestamp to increase');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false);
          const existingCityChangedTimestamp = existingCityPageTestResult.lastChanged;
          assert(existingCityPageTestResult.tokenPresent, 'expected token to present');
          assert(existingCityChangedTimestamp > existingCityTimestamp, 'expected page change timestamp to increase');

          assert(existingCityChangedTimestamp !== emptyCityChangedTimestamp, 'expected timestamps to differ');
    
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose(`${testPageName} - running cache cleanup again`);
          await testHelper.runCacheCleanup();
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, true);
          assert(emptyCityPageTestResult.tokenPresent, 'expected token to present');
          assert(emptyCityPageTestResult.lastChanged === emptyCityChangedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false);
          assert(existingCityPageTestResult.tokenPresent, 'expected token to present');
          assert(existingCityPageTestResult.lastChanged === existingCityChangedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');
        } finally {
          await testHelper.stop();
        }  
      });
    };
  }

  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const TestName8 = `[/${getHtmlPagePath(HtmlPage.BookingDetails)}] (${locale}) - booking's offer changes`;
    test(TestName8, DefaultTestOptions, async () => {
      let testHelper: PageTestHelper | undefined;
      try {
        await ensureServerStarted(logger);

        logger.verbose(`${TestName8} - authenticating`); // auth required to book offer
        testHelper = new PageTestHelper(HtmlPage.Index, localizePath(`${getHtmlPagePath(HtmlPage.Index)}`, locale), locale,  true, logger);
        await testHelper.start();
        await testHelper.purgeCache();
        const authCookies = await testHelper.getAuthCookies(joinURL(TestHostUrlWithProtocol, getHtmlPagePath(HtmlPage.Index)));
        
        logger.verbose(`${TestName8} - prepare page`);
        let bookingId: EntityId | undefined;
        const prepareResult = await performPageAction(HtmlPage.BookingDetails, TestingPageCacheActionEnum.Prepare, bookingId, undefined, authCookies, logger);
        bookingId = prepareResult.testId!;

        const pageUrl = localizePath(`/${getHtmlPagePath(HtmlPage.BookingDetails)}/${bookingId}`, locale);
        testHelper = new PageTestHelper(HtmlPage.BookingDetails, pageUrl, locale, true, logger);
        await testHelper.start();
        
        let bookingDocument = await testHelper.downloadBookingDocument(bookingId);
        assert(bookingDocument.statusCode < 400 && bookingDocument.imageBytesHash, 'expected booking document successfull download');

        let testToken = testHelper.generateNewToken();
        let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent');
        const initialChangeTimestamp = pageTestResult.lastChanged;
        await delay(LastModifiedTimeHeaderPrecision);

        bookingDocument = await testHelper.downloadBookingDocument(bookingId);
        assert(bookingDocument.statusCode < 400 && bookingDocument.imageBytesHash, 'expected booking document successfull download');

        let ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        // KB: og image caching enabled in production mode, so only data hash is tested
        //const initialOgImageChangeTimestamp = ogImageTestResult.lastChanged!;
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
        const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

        logger.verbose(`${HtmlPage.BookingDetails} - change page`);
        testToken = testHelper.generateNewToken();
        const changeResult = await testHelper.performPageAction(HtmlPage.BookingDetails, TestingPageCacheActionEnum.Change, bookingId, testToken);
        bookingId = changeResult.testId!;
        // KB: booking document download resets booking's page cache
        /*
        await delay(LastModifiedTimeHeaderPrecision);
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
        assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');
        */
        bookingDocument = await testHelper.downloadBookingDocument(bookingId);
        assert(bookingDocument.statusCode < 400 && bookingDocument.imageBytesHash, 'expected booking document successfull download');

        ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        // KB: og image caching enabled in production mode, so only data hash is tested
        //assert(ogImageTestResult.lastChanged === initialOgImageChangeTimestamp, 'expected og image last changed time to be the same as on prepare stage');
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
        //assert(ogImageTestResult.imageBytesHash === initialOgImageBytesHash, 'expected og image content to be the same as on prepare stage');
        
        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose(`${HtmlPage.BookingDetails} - running cache cleanup`);
        await testHelper.runCacheCleanup();

        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false);
        const changedTimestamp = pageTestResult.lastChanged;
        assert(pageTestResult.tokenPresent, 'expected token to present');
        assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

        ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        // KB: og image caching enabled in production mode, so only data hash is tested
        //assert(ogImageTestResult.lastChanged! > initialOgImageChangeTimestamp, 'expected og image timestamp to increase');
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
        assert(ogImageTestResult.imageBytesHash !== initialOgImageBytesHash, 'expected og image content to change');
        

        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose(`${HtmlPage.BookingDetails} - running cache cleanup again`);
        await testHelper.runCacheCleanup();
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, true);
        assert(pageTestResult.tokenPresent, 'expected token to present');
        assert(pageTestResult.lastChanged === changedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');

        const anotherOgImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        //assert(anotherOgImageTestResult.lastChanged === ogImageTestResult.lastChanged, 'expected og image timestamp to remain the same');
        assert(anotherOgImageTestResult.imageBytesHash, 'expected non-empty og image');
        assert(anotherOgImageTestResult.imageBytesHash === ogImageTestResult.imageBytesHash, 'expected og image content to remain the same');
      } finally {
        await testHelper?.stop();
      }  
    });
  }

  
});

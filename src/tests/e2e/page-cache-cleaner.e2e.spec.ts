import { TEST_SERVER_PORT, RestApiAuth, HeaderLocation, getLocaleFromUrl, localizePath, HeaderAppVersion, CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken, DefaultLocale, CookieI18nLocale, HeaderDate, HeaderLastModified, HeaderCacheControl, HeaderEtag, HeaderContentType, OgImagePathSegment, OgImageExt, HeaderCookies, DefaultTheme, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, AppConfig, getPagePath, AppPage, type IAppLogger, type Locale, type RecoverPasswordCompleteResultEnum, spinWait, delay, CREDENTIALS_TESTUSER_PROFILE as credentialsTestUserProfile, TEST_USER_PASSWORD, type EntityId, type PreviewMode, type StayServiceLevel } from '@golobe-demo/shared';
import { createHtmlPageModelMetadata } from '@golobe-demo/backend';
import { ApiEndpointPurgeCache, ApiEndpointTestingPageCacheAction, ApiEndpointBookingDownload, type ITestingPageCacheActionDto, type ITestingPageCacheActionResultDto, TestingPageCacheActionEnum, ApiEndpointTestingCacheCleanup } from '../../server/api-definitions';
import { describe, test, assert, type TestOptions } from 'vitest';
import { $fetch } from 'ofetch';
import type { Page, Cookie } from 'playwright-core';
import { serialize as serializeCookie } from 'cookie-es';
import { setup, createPage, createBrowser, getBrowser } from '@nuxt/test-utils/e2e';
import dayjs from 'dayjs';
import { murmurHash } from 'ohash';
import { type ParsedURL, joinURL, parseQuery, parseURL, stringifyParsedURL, stringifyQuery, withQuery } from 'ufo';
import { createLogger } from '../../helpers/testing';
import { LocatorClasses } from './../../helpers/constants';
import pick from 'lodash-es/pick';
import { defu } from 'defu';
import { destr } from 'destr';
import random from 'lodash-es/random';
import range from 'lodash-es/range';
import clone from 'lodash-es/clone';
import set from 'lodash-es/set';
import isNumber from 'lodash-es/isNumber';
import fromPairs from 'lodash-es/fromPairs';
import isBoolean from 'lodash-es/isBoolean';

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
    html: string | false
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

async function performPageAction (page: AppPage, action: TestingPageCacheActionEnum, testId: EntityId | undefined, testToken: PageTestToken | undefined, authCookies: Cookie[] | undefined, logger: IAppLogger): Promise<ITestingPageCacheActionResultDto> {
  logger.verbose('performing page action', { page: page.valueOf(), action, testId, testToken, numAuthCookies: authCookies?.length ?? 0 });

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
    logger.warn('perform page action request failed', undefined, { page: page.valueOf(), action, testId, testToken, headers: outgoingHeaders, result: responseDto, code: response.status, statusText: response.statusText });
    throw new Error('failed to perform page action');
  };
  const result = destr<ITestingPageCacheActionResultDto>(responseDto);

  logger.verbose('page action performed, result', { testId: result.testId, page: page.valueOf(), action, testToken, numAuthCookies: authCookies?.length ?? 0 });
  return result;
};

async function pingServer(logger: IAppLogger): Promise<boolean> {
  logger.debug('pinging server');
  try {
    await $fetch(joinURL(TestHostUrlWithProtocol, AppConfig.logging.client.path),
      {
        method: 'POST',
        body: { level: 'info', msg: 'testPing', testPing: true },
        cache: 'no-store',
        headers: [
          [HeaderAppVersion, AppConfig.versioning.appVersion.toString()], 
          [HeaderContentType, 'application/json']
        ]
      });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(err: any) {
    logger.info('pinging server - FAIL');
    return false;
  }
  logger.debug('pinging server - success');
  return true;
};

async function ensureServerStarted(helperParams: { htmlPageMetadata: HtmlPageMetadata }, logger: IAppLogger): Promise<void> {
  if(!await pingServer(logger)) {
    logger.info('starting server');
    const serverStarter = new PageTestHelper('starting server', `/${getPagePath(AppPage.Index)}`, DefaultLocale, false, helperParams.htmlPageMetadata, logger);
    await serverStarter.start();
    await serverStarter.ensurePageHtmlLoaded();
    await serverStarter.stop();  
    logger.info('server started');
  }
}

declare type HtmlPageMetadata = ReturnType<typeof createHtmlPageModelMetadata>;

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
  private isAuthUser: boolean;

  private readonly outstandingRequestUrls: Set<string>;
  private loadingPageResponseState: Partial<PageResponseTestResult>;
  private htmlPageMetadata: HtmlPageMetadata;

  constructor (testName: string, url: string, locale: Locale, requireAuth: boolean, htmlPageMetadata: HtmlPageMetadata, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'CacheCleanerTests' });
    this.testName = testName;
    this.requireAuth = requireAuth;
    this.isAuthUser = false;
    this.locale = locale;
    this.url = this.normalizeUrl(url, undefined);
    this.outstandingRequestUrls = new Set<string>();
    this.loadingPageResponseState = {};
    this.authCookies = undefined;
    this.htmlPageMetadata = htmlPageMetadata;
  }

  getMetadata(page: keyof typeof AppPage): ReturnType<HtmlPageMetadata['getMetadata']> {
    return this.htmlPageMetadata.getMetadata(page);
  }

  generateNewToken = (): PageTestToken => {
    return range(0, 8).map(_ => random(1000000).toString(20)).join('');
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

    this.logger.debug('auth cookies captured', { currentUrl: await this.currentPage!.url() });
    this.authCookies = authCookies;
  };

  serializeRequestCookie = (cookie: Cookie): string => {
    return serializeCookie(cookie.name,  cookie.value);
  };

  responseHandler = async (url: string, httpCode: number, headers: {[key: string]: string} | undefined, html: string | false): Promise<void> => {
    await this.captureAuthCookies();

    if(httpCode < 400) {
      const signoutCallbackPath = `${RestApiAuth}/signout`;
      const signinCallbackPath = `${RestApiAuth}/callback`;
      if(url.includes(signinCallbackPath) || (headers as any)[HeaderLocation]?.includes(signinCallbackPath)) {
        this.logger.verbose('user signed in');
        this.isAuthUser = true;
      } else if(url.includes(signoutCallbackPath)) {
        this.logger.verbose('user signed out');
        this.isAuthUser = false;
      }
    }

    if(!this.testIsCurrentUrl(url)) {
      return;
    }

    this.logger.verbose('page response obtained', { url, httpCode, currentUrl: await this.currentPage!.url() });
    if(headers) {
      const testHeaderNames = pick(headers, [HeaderLastModified, HeaderCacheControl, HeaderEtag, HeaderDate, HeaderContentType].map(h => h.toLowerCase()));
      this.logger.verbose('page test headers', { headerNames: testHeaderNames });
      const dateStr = headers[HeaderDate.toLowerCase()];
      const lastModifiedStr = headers[HeaderLastModified.toLowerCase()] ?? dateStr;
      const cacheControlStr = headers[HeaderCacheControl.toLowerCase()];
      const etagStr = headers[HeaderEtag.toLowerCase()];
      this.loadingPageResponseState = defu(
        {
          lastChanged: lastModifiedStr ? (dayjs(lastModifiedStr).toDate().getTime()) : undefined,
          httpResponseDetails: {
            etag: etagStr,
            html,
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
    
    this.logger.verbose('page response parsed', { url, currentUrl: await this.currentPage!.url(), loadingPageResponseState: this.loadingPageResponseState });
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
      this.logger.verbose('redirection response', { fromUrl: redirected.fromUrl, toUrl: redirected.toUrl });
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

  isAuthenticated = async (relyOnCookies: boolean): Promise<boolean> => {
    let result = this.isAuthUser;
    if (!this.currentPage) {
      this.logger.debug('page is undefined, user unauthenticated');
      result = false;
    }

    if(!result && this.currentPage && relyOnCookies) {
      const context = this.currentPage.context();
      const cookies = await context.cookies();
      result = cookies.filter(c => [CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken].includes(c.name)).length === 3;
      if(result) {
        result = (await this.currentPage.locator(`.${LocatorClasses.AuthUserMenu}`).innerText())?.length > 0;
      }
    }

    this.logger.debug('user auth check', { auth: result, currentPage: this.currentPage?.url() });
    return result;
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
    this.logger.verbose('log-in', { url: this.url, currentUrl: await this.currentPage!.url() });

    const page = this.currentPage!;

    await page.locator(LocatorClasses.SignInEmail).fill(credentialsTestUserProfile.email);
    await page.locator(LocatorClasses.SignInPassword).fill(TEST_USER_PASSWORD);
    await delay(UiIinteractionDelayMs);
    await page.locator(LocatorClasses.SubmitBtn).click();
    let currentUrl = await this.currentPage?.url();
    this.logger.debug('sign in button clicked', currentUrl);

    await spinWait(async () => {
      return await this.isAuthenticated(true);
    }, TestTimeout);

    currentUrl = await this.currentPage?.url();
    this.logger.verbose('log-in completed', { url: this.url, currentUrl });
  };

  setupBrowserPage = async(url: string, query: any): Promise<void> => {
    const needLogin = this.requireAuth && !this.authCookies;
    this.logger.verbose('setting up new browser page context', { url, query, needLogin });

    this.loadingPageResponseState = {  };
    this.outstandingRequestUrls.clear();
    this.url = this.normalizeUrl(url, query);
    await (await getBrowser()).close({ reason: 'reset e2e test context' });
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

    this.currentPage = await createPage(needLogin ? localizePath(`/${getPagePath(AppPage.Login)}`, this.locale) : undefined, {
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
      this.logger.verbose('received [Close] page event', { test: this.testName });
      this.currentPage = undefined;
      this.outstandingRequestUrls.clear();
    }).on('response', async (response) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const respHeaders = await response.allHeaders();
        const url = response.url();
        this.logger.debug('on response', { url, pageUrl: this.url, respHeaders });
        const contentTypeStr = respHeaders[HeaderContentType.toLowerCase()];      
        const html = (response.status() < 300 && contentTypeStr.includes('text/html')) ? await response.text() : false;
        await this.responseHandler(url, response.status(), respHeaders, html);
      });
    }).on('request', async (request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const reqHeaders = await request.allHeaders();
        const url = request.url();
        const redirectedFrom = request.redirectedFrom()?.url();
        const redirectedTo = request.redirectedTo()?.url();
        this.logger.debug('request started', { url, redirectedFrom, redirectedTo, reqHeaders });
        this.requestHandler(url, 'started', (redirectedFrom || redirectedTo) ? { fromUrl: redirectedFrom, toUrl: redirectedTo } : undefined);
      });
    })
    .on('requestfinished', async(request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const url = request.url();
        this.logger.debug('request finished', url);
        this.requestHandler(url, 'finished', undefined);
      });
    })
    .on('requestfailed', async (request) => {
      await runOnlyIfBrowserContextIsActive(async () => {
        const url = request.url();
        this.logger.warn('request failed', undefined, url);
        this.requestHandler(url, 'finished', undefined);
      });
    });
    await this.currentPage.goto(joinURL(TestHostUrlWithProtocol, this.url));

    const cookies = await this.currentPage!.context().cookies();
    this.logger.verbose('browser page context set up, initial state', { url: this.url, currentUrl: await this.currentPage!.url(), cookies });
  };

  start = async (): Promise<void> => {
    this.logger.info('----- STARTING test -----');

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

    this.logger.info('----- STOPPED test case -----');
  };

  timestamp2Str = (timestamp: PageChangeTimestamp) => {
    return new Date(timestamp).toISOString();
  };

  ensurePageHtmlLoaded = async (): Promise<void> => {
    this.logger.debug('ensuring page html loaded', { url: this.url, currentUrl: await this.currentPage!.url() });
    const loaded = await spinWait(() => {
      const isCurrentUrlRequestPending = this.outstandingRequestUrls.size && Array.from(this.outstandingRequestUrls.values()).some(u => this.testIsCurrentUrl(u));
      return Promise.resolve(!isCurrentUrlRequestPending && this.loadingPageResponseState.httpResponseDetails?.statusCode !== undefined);
    }, TestTimeout);
    if(!loaded) {
      this.logger.warn('timeout waiting for page html to load', undefined, { url: this.url, currentUrl: await this.currentPage!.url() });
      throw new Error('timeout waiting for page html to load');
    }
    
    this.logger.debug('page html loaded - ensured', { url: this.url, currentUrl: await this.currentPage!.url() });
  };

  testPageResponse = async(testToken: PageTestToken, query: any, addRedundantParam: boolean | number, previewMode: PreviewMode | undefined, expectedErrorCode?: number | boolean | undefined): Promise<PageResponseTestResult> => {
    this.logger.verbose('testing page response', { testToken, query, addRedundantParam, previewMode: previewMode ?? '', expectedErrorCode: expectedErrorCode ?? '', currentUrl: await this.currentPage!.url() });

    const requestQuery = query === null ? null : (query ? clone(query) : {});
    if(addRedundantParam) {
      const redundantParamValue = isNumber(addRedundantParam) ? addRedundantParam : new Date().getTime();
      set(requestQuery, RedundantQueryParamName, redundantParamValue);
    }

    if(previewMode !== undefined) {
      set(requestQuery, QueryPagePreviewModeParam, previewMode ? PreviewModeParamEnabledValue : 'false');
    }

    const newUrl = this.normalizeUrl(this.url, requestQuery);
    if(newUrl !== this.url) {
      this.url = newUrl;
    }
    await this.setupBrowserPage(this.url, requestQuery);
    await this.ensurePageHtmlLoaded();

    const statusCode =  this.loadingPageResponseState.httpResponseDetails?.statusCode;
    if(!statusCode || statusCode >= 400) {
      if(statusCode && expectedErrorCode) {
        if((isNumber(expectedErrorCode) && statusCode === expectedErrorCode) || isBoolean(expectedErrorCode)) {
          this.logger.verbose('page response test completed with error code (as expected', { url: this.url, testToken, query, addRedundantParam, statusCode, expectedErrorCode: expectedErrorCode ?? '' });
          return defu({ 
            httpResponseDetails: { 
              statusCode, html: this.loadingPageResponseState.httpResponseDetails?.html ?? false, 
              cacheControl: this.loadingPageResponseState.httpResponseDetails?.cacheControl
            }, 
            tokenPresent: false,
          }, 
          this.loadingPageResponseState,
          { 
            redirect: undefined, 
            lastChanged: 0,
            httpResponseDetails: { 
              etag: undefined, 
              date: undefined,
              cacheControl: undefined as any
            } 
          });
        }
        
      }

      this.logger.warn('got non-OK http status', undefined, { code: statusCode, url: newUrl, currentUrl: await this.currentPage!.url() });
      throw new Error('got non-OK http status code');
    } else {
      if(expectedErrorCode) {
        this.logger.warn('page response test completed successfully while error code was expected', undefined, { url: this.url, testToken, query, addRedundantParam, statusCode, expectedErrorCode: expectedErrorCode ?? '' });
        throw new Error('page response test completed successfully while error code was expected');
      }
    }

    const html = this.loadingPageResponseState.httpResponseDetails?.html;
    if(!html) {
      this.logger.warn('got non-HTML response', undefined, { url: newUrl, currentUrl: await this.currentPage!.url() });
      throw new Error('got non-HTML response');
    }

    this.loadingPageResponseState.tokenPresent = html.includes(testToken);
    const result = this.loadingPageResponseState as PageResponseTestResult;
    const timestmapLog = result.lastChanged ? this.timestamp2Str(result.lastChanged!) : '';
    this.logger.verbose('page response test completed', { url: this.url, redirectedFrom: result.redirect?.fromUrl, tokenPresent: result.tokenPresent, timestamp: timestmapLog, testToken, query, addRedundantParam, expectedErrorCode });
    return result;
  };

  testOgImageResponse = async(): Promise<OgImageResponseTestResult> => {
    this.logger.verbose('testing og image response', { url: this.url, currentUrl: await this.currentPage!.url() });

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
    this.logger.debug('fetching og image', { src: imageSrc, headers: outgoingHeaders, url: this.url, currentUrl: await this.currentPage!.url() });

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
          const headers = req.response?.headers?.entries();
          const err = req?.error;
          this.logger.warn('og image request exception', err, { src: imageSrc, statusCode: req.response?.status, statusText: req.response?.statusText, headers, url: this.url });
          result = defu({ statusCode: req.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        },
        onResponse: (resp) => {
          const statusCode = resp.response.status;
          const headers = resp.response.headers;
          result = defu({ statusCode }, result || { lastChanged: undefined, imageBytesHash: undefined });
          if(statusCode >= 400) {
            this.logger.warn('og image response failed', undefined, { src: imageSrc, statusCode, statusText: resp.response.statusText, headers: headers.entries(), url: this.url });
            return;
          } else {
            this.logger.debug('og image response obtained - parsing', { src: imageSrc, statusCode, headers: headers.entries(), url: this.url });
          }
          const lastModifiedStr = headers.get(HeaderLastModified.toLowerCase()) ?? headers.get(HeaderDate.toLowerCase());
          if(lastModifiedStr) {
            result.lastChanged = lastModifiedStr ? (dayjs(lastModifiedStr).toDate().getTime()) : undefined;
          }
          this.logger.debug('og image response parsed', { src: imageSrc, url: this.url });
        },
        onResponseError: (resp) => {
          const headersLog = resp.response?.headers?.entries();
          const err = resp?.error;
          this.logger.warn('og image response exception', err, { src: imageSrc, statusCode: resp.response?.status, statusText: resp.response?.statusText, headers: headersLog, url: this.url });
          result = defu({ statusCode: resp.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        }
      });
    if(!result) {
      this.logger.warn('og image request ended, but result has not been parsed', undefined, { src: imageSrc, url: this.url });
      throw new Error('og image request failed');
    }
    if(!response) {
      this.logger.warn('og image request returned empty response', undefined, { src: imageSrc, url: this.url });
      throw new Error('og image response is empty');
    }
    const bytes = Buffer.from((await (response as Blob).arrayBuffer()));
    
    this.logger.debug('computing og image bytes hash', { size: bytes.length, src: imageSrc, url: this.url, currentUrl: await this.currentPage!.url() });
    result.imageBytesHash = murmurHash(bytes);
     
    this.logger.verbose('og image response test completed', { url: this.url, currentUrl: await this.currentPage!.url() });
    return result;
  };

  performPageAction = async (page: AppPage, action: TestingPageCacheActionEnum, testId: EntityId | undefined, testToken: PageTestToken | undefined): Promise<ITestingPageCacheActionResultDto> => {
    return await performPageAction(page, action, testId, testToken, this.authCookies, this.logger);
  };

  downloadBookingDocument = async (bookingId: EntityId): Promise<BookingDocumentDownloadResult> => {
    this.logger.verbose('downloading booking document', { bookingId, url: this.url, currentUrl: await this.currentPage!.url() });

    const bookingSrc = joinURL(TestHostUrlWithProtocol, ApiEndpointBookingDownload(bookingId));

    const authCookies = await this.getAuthCookies(joinURL(TestHostUrlWithProtocol, getPagePath(AppPage.BookingDetails), bookingId));
    if(!authCookies) {
      this.logger.warn('authentication is required to download booking', undefined, { bookingId, url: this.url, currentUrl: await this.currentPage!.url() });
      throw new Error('authentication is required to download booking');
    }
    const cookieHeader = authCookies?.map(c => this.serializeRequestCookie(c))?.join('; ');
    const outgoingHeaders: HeadersInit = {
      Host: TestHostUrl,
      ...(fromPairs([[HeaderAppVersion, AppConfig.versioning.appVersion]])),
      ...(cookieHeader ? fromPairs([[HeaderCookies, cookieHeader]]) : {})
    };
    this.logger.debug('download booking document', { src: bookingSrc, headers: outgoingHeaders, url: this.url, currentUrl: await this.currentPage!.url() });

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
          this.logger.warn('booking document request error', req?.error, { src: bookingSrc, statusCode: req.response?.status, statusText: req.response?.statusText, headers: req.response?.headers?.entries(), url: this.url });
          result = defu({ statusCode: req.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        },
        onResponse: (resp) => {
          const statusCode = resp.response.status;
          const headers = resp.response.headers;
          result = defu({ statusCode }, result || { lastChanged: undefined, imageBytesHash: undefined });
          if(statusCode >= 400) {
            this.logger.warn('booking document download response failed', undefined, { src: bookingSrc, statusCode, statusText: resp.response.statusText, headers: headers.entries(), url: this.url });
            return;
          } else {
            this.logger.debug('booking document download response obtained - parsing', { src: bookingSrc, statusCode, headers: headers.entries(), url: this.url });
          }
        },
        onResponseError: (resp) => {
          this.logger.warn('booking document download response error', resp?.error, { src: bookingSrc, statusCode: resp.response?.status, statusText: resp.response?.statusText, headers: resp.response?.headers?.entries(), url: this.url });
          result = defu({ statusCode: resp.response?.status ?? 500 }, result || { lastChanged: undefined, imageBytesHash: undefined });
          return;
        }
      });
    if(!result) {
      this.logger.warn('booking document download request ended, but result has not been parsed', undefined, { src: bookingSrc, url: this.url });
      throw new Error('booking document download failed');
    }
    if(!response) {
      this.logger.warn('booking document download returned empty response', undefined, { src: bookingSrc, url: this.url });
      throw new Error('booking document download response is empty');
    }
    const bytes = Buffer.from((await (response as Blob).arrayBuffer()));
    
    this.logger.debug('computing booking document bytes hash', { size: bytes.length, src: bookingSrc, url: this.url, currentUrl: await this.currentPage!.url() });
    result.imageBytesHash = murmurHash(bytes);
     
    this.logger.verbose('booking document download completed', { url: this.url, currentUrl: await this.currentPage!.url() });
    return result;
  };

  purgeCache = async (): Promise<void> => {
    this.logger.verbose('purging cache', { url: this.url, currentUrl: await this.currentPage!.url() });

    const response = await fetch(joinURL(TestHostUrlWithProtocol, ApiEndpointPurgeCache), { method: 'POST', headers: [[HeaderContentType, 'application/json']] });
    if(!response.ok) {
      this.logger.warn('cache purge request failed', undefined, { url: this.url, currentPage: this.currentPage?.url(), code: response.status, statusText: response.statusText });
      throw new Error('failed to purge cache');
    };

    this.logger.verbose('cache purge completed', { url: this.url, currentUrl: await this.currentPage!.url() });
  };

  runCacheCleanup = async (): Promise<void> => {
    this.logger.verbose('running cache cleanup', { url: this.url, currentUrl: await this.currentPage!.url() });

    const response = await fetch(joinURL(TestHostUrlWithProtocol, ApiEndpointTestingCacheCleanup), { method: 'POST', headers: [[HeaderContentType, 'application/json']] });
    if(!response.ok) {
      this.logger.warn('cache cleanup request failed', undefined, { url: this.url, currentPage: this.currentPage?.url(), code: response.status, statusText: response.statusText });
      throw new Error('failed to run cache cleanup');
    };

    this.logger.verbose('cache cleanup completed', { url: this.url, currentUrl: await this.currentPage!.url() });
  };
}

describe('e2e:page-cache-cleaner rendered HTML page & OG Image cache invalidation', async () => {
  const logger = createLogger('(page-cache-cleaner)');
  logger.info('>>>>>>>>>>>>> NEW TEST RUN <<<<<<<<<<<<<<<<<<');

  const htmlPageMetadata = createHtmlPageModelMetadata();
  
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
    const TestName1 = `[/${getPagePath(AppPage.Index)}] (${locale}) - company review changes`;
    test(TestName1, DefaultTestOptions, async () => {
      const pageUrl =  localizePath(`/${getPagePath(AppPage.Index)}`, locale);
      const testHelper = new PageTestHelper(TestName1, pageUrl, locale, false, htmlPageMetadata, logger);
      try {
        await testHelper.start();
        await testHelper.purgeCache();

        logger.verbose('prepare index page', { testCase: TestName1 });
        let testId: string | undefined;
        const prepareResult = await testHelper.performPageAction(AppPage.Index, TestingPageCacheActionEnum.Prepare, testId, undefined);
        testId = prepareResult.testId;
        let testToken = testHelper.generateNewToken();
        let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, undefined);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent');
        const initialChangeTimestamp = pageTestResult.lastChanged;

        logger.verbose('change page', { testCase: TestName1 });
        testToken = testHelper.generateNewToken();
        const changeResult = await testHelper.performPageAction(AppPage.Index, TestingPageCacheActionEnum.Change, testId, testToken);
        testId = changeResult.testId;
        await delay(LastModifiedTimeHeaderPrecision);
  
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, false);
        assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
        assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');
        
        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose('running cache cleanup', { testCase: TestName1 });
        await testHelper.runCacheCleanup();

        pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
        const changedTimestamp = pageTestResult.lastChanged;
        assert(pageTestResult.tokenPresent, 'expected token to present');
        assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

        await delay(LastModifiedTimeHeaderPrecision);
        logger.verbose('running cache cleanup again no1', { testCase: TestName1 });
        await testHelper.runCacheCleanup();
        pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, false);
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
      AppPage.ForgotPassword,
      AppPage.ForgotPasswordComplete,
      AppPage.ForgotPasswordSet,
      AppPage.ForgotPasswordVerify,
      AppPage.Signup,
      AppPage.SignupComplete, 
      AppPage.SignupVerify,
      AppPage.EmailVerifyComplete
    ];
    for(let i = 0; i < Test2Pages.length; i++) {
      const testPage = Test2Pages[i];
      let pageUrl = localizePath(`/${getPagePath(testPage)}`, locale);
      if(testPage === AppPage.Login) {
        const callbackParamName = 'callbackUrl';
        pageUrl = withQuery(pageUrl, set({}, callbackParamName, localizePath(`/${getPagePath(AppPage.Index)}`, locale)));
      } else if(testPage === AppPage.ForgotPasswordSet || testPage === AppPage.SignupComplete || testPage === AppPage.EmailVerifyComplete) {
        const tokenIdParamName = 'token_id';
        const tokenValueParamName = 'token_value';
        let pageQuery = set({}, tokenIdParamName, random(1000000).toString());
        pageQuery = set(pageQuery, tokenValueParamName, random(1000000).toString());
        pageUrl = withQuery(pageUrl, pageQuery);
      } else if(testPage === AppPage.ForgotPasswordComplete) {
        const resultParamName = 'result';
        pageUrl = withQuery(pageUrl, set({}, resultParamName, <RecoverPasswordCompleteResult>'SUCCESS'));
      }

      // caching for this pages must be disabled in config
      const pageCachingMustBeDisabled = [
        AppPage.ForgotPassword,
        AppPage.ForgotPasswordComplete,
        AppPage.ForgotPasswordSet,
        AppPage.ForgotPasswordVerify,
        AppPage.Signup,
        AppPage.SignupComplete, 
        AppPage.SignupVerify,
        AppPage.EmailVerifyComplete
      ].includes(testPage);

      const testCaseName = `[/${getPagePath(testPage)}] (${locale}) - auth form image changes ${pageCachingMustBeDisabled ? '(caching must be disabled)' : ''}`;
      test(testCaseName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testCaseName, pageUrl, locale, false, htmlPageMetadata, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();
    
          logger.verbose('prepare', { testCase: testCaseName });
          let testId: string | undefined;
          const prepareResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Prepare, testId, undefined);
          testId = prepareResult.testId;
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, false);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
    
          logger.verbose('change', { testCase: testCaseName });
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, testId, testToken);
          testId = changeResult.testId;

          if(!pageCachingMustBeDisabled) {
            await delay(LastModifiedTimeHeaderPrecision);
            pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
            assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
            assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');  
          }
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('running cache cleanup no1', { testCase: testCaseName });
          await testHelper.runCacheCleanup();
    
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
          const changedTimestamp = pageTestResult.lastChanged;
          assert(pageTestResult.tokenPresent, 'expected token to present');
          assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');
    
          if(!pageCachingMustBeDisabled) {
            await delay(LastModifiedTimeHeaderPrecision);
            logger.verbose('running cache cleanup again no2', { testCase: testCaseName });
            await testHelper.runCacheCleanup();
            pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, false);
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
    const Test3Pages = [AppPage.FindFlights, AppPage.FindStays, AppPage.Login];
    for(let i = 0; i < Test3Pages.length; i++) {
      const testPage = Test3Pages[i];
      const pageUrl = localizePath(`/${getPagePath(testPage)}`, locale);
      const testCaseName = `[/${getPagePath(testPage)}] (${locale}) - caching must be disabled`;
      test(testCaseName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testCaseName, pageUrl, locale, false, htmlPageMetadata, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          logger.verbose('initial page open', { testCase: testCaseName });
          const testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
          const initialChangeTimestamp = pageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
          assert(pageTestResult.lastChanged > initialChangeTimestamp, 'expected page change timestamp to increase');
        } finally {
          await testHelper.stop();
        }
      });
    }
  }
  
  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test4Pages = [AppPage.Account, AppPage.Favourites];
    for(let i = 0; i < Test4Pages.length; i++) {
      const testPage = Test4Pages[i];
      const pageUrl = localizePath(`/${getPagePath(testPage)}`, locale);
      const testCaseName = `[/${getPagePath(testPage)}] (${locale}) -Page personal data must not be cached`;
      test(testCaseName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testCaseName, pageUrl, locale, true, htmlPageMetadata, logger);
          
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          logger.verbose('init page open', { testCase: testCaseName });
          const testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
          const initialChangeTimestamp = pageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
          assert(pageTestResult.lastChanged > initialChangeTimestamp, 'expected page change timestamp to increase');
        } finally {
          await testHelper.stop();
        }
      });
    }
  }
  
  for(let l = 0; l < TestLocales.length; l++) {
    const locale = TestLocales[l];
    const Test5Pages = [AppPage.FlightDetails, AppPage.BookFlight];
    for(let i = 0; i < Test5Pages.length; i++) {
      const testCaseName = Test5Pages[i];
      const testPageName = `[/${getPagePath(testCaseName)}] (${locale}) - flight offer changes`;
      test(testPageName, DefaultTestOptions, async () => {
        let testHelper: PageTestHelper | undefined;
        try {
          await ensureServerStarted({ htmlPageMetadata }, logger);
          
          logger.verbose('prepare flights page', { testCase: testCaseName });
          let flightOfferId: EntityId | undefined;
          const prepareResult = await performPageAction(testCaseName, TestingPageCacheActionEnum.Prepare, flightOfferId, undefined, undefined, logger);
          flightOfferId = prepareResult.testId;

          const pageUrl = localizePath(`/${getPagePath(testCaseName)}/${flightOfferId}`, locale);
          testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, htmlPageMetadata, logger);

          const defaultQuery: any = undefined;

          await testHelper.start();
          await testHelper.purgeCache();
          
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, true, false);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
          await delay(LastModifiedTimeHeaderPrecision);

          let ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //const initialOgImageChangeTimestamp = ogImageTestResult.lastChanged!;
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

          logger.verbose('change flights page', { testCase: testCaseName });
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testCaseName, TestingPageCacheActionEnum.Change, flightOfferId, testToken);
          flightOfferId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, false, undefined);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged === initialOgImageChangeTimestamp, 'expected og image last changed time to be the same as on prepare stage');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash === initialOgImageBytesHash, 'expected og image content to be the same as on prepare stage');
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('running cache cleanup no2', { testCase: testCaseName });
          await testHelper.runCacheCleanup();

          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, false, undefined);
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
          logger.verbose('running cache cleanup again no3', { testCase: testCaseName });
          await testHelper.runCacheCleanup();
          pageTestResult = await testHelper.testPageResponse(testToken, defaultQuery, true, undefined);
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
    const Test6Pages = [AppPage.StayDetails, AppPage.BookStay];
    for(let i = 0; i < Test6Pages.length; i++) {
      const testCaseName = Test6Pages[i];
      const testPageName = `[/${getPagePath(testCaseName)}] (${locale}) - stay offer changes`;
      test(testPageName, DefaultTestOptions, async () => {
        let testHelper: PageTestHelper | undefined;
        try {
          await ensureServerStarted({ htmlPageMetadata }, logger);
          
          logger.verbose('prepare stays page', { testCase: testCaseName });
          let stayOfferId: EntityId | undefined;
          const prepareResult = await performPageAction(testCaseName, TestingPageCacheActionEnum.Prepare, stayOfferId, undefined, undefined, logger);
          stayOfferId = prepareResult.testId;

          const pageUrl = localizePath(`/${getPagePath(testCaseName)}/${stayOfferId}`, locale);
          testHelper = new PageTestHelper(testPageName, pageUrl, locale, false, htmlPageMetadata, logger);

          await testHelper.start();
          await testHelper.purgeCache();
          
          let testToken = testHelper.generateNewToken();
          let pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, undefined);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent');
          const initialChangeTimestamp = pageTestResult.lastChanged;
          
          let ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //const initialOgImageChangeTimestamp = ogImageTestResult.lastChanged!;
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

          logger.verbose('change stays page', { testCase: testCaseName });
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testCaseName, TestingPageCacheActionEnum.Change, stayOfferId, testToken);
          stayOfferId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, false);
          assert(!pageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(pageTestResult.lastChanged === initialChangeTimestamp, 'expected page last changed time to be the same as on prepare stage');

          ogImageTestResult = await testHelper.testOgImageResponse();
          assert(ogImageTestResult.statusCode < 400);
          // KB: og image caching enabled in production mode, so only data hash is tested
          //assert(ogImageTestResult.lastChanged === initialOgImageChangeTimestamp, 'expected og image last changed time to be the same as on prepare stage');
          assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
          assert(ogImageTestResult.imageBytesHash === initialOgImageBytesHash, 'expected og image content to be the same as on prepare stage');
          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('running cache cleanup no3', { testCase: testCaseName });
          await testHelper.runCacheCleanup();

          pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
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
          logger.verbose('running cache cleanup again no4', { testCase: testCaseName });
          await testHelper.runCacheCleanup();
          pageTestResult = await testHelper.testPageResponse(testToken, undefined, true, false);
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
    const Test7Pages = [AppPage.Flights, AppPage.Stays];
    for(let i = 0; i < Test7Pages.length; i++) {
      const testPage = Test7Pages[i];
      const pageUrl = localizePath(`/${getPagePath(testPage)}`, locale);
      const testCaseName = `[/${getPagePath(testPage)}] (${locale}) - popular city changes, url varied by anyValue parameter (citySlug)`;
      test(testCaseName, DefaultTestOptions, async () => {
        const testHelper = new PageTestHelper(testCaseName, pageUrl, locale, false, htmlPageMetadata, logger);
        try {
          await testHelper.start();
          await testHelper.purgeCache();

          const existingCitySlug = 'paris';
          const citySlugParamName = 'citySlug';
          
          logger.verbose('- prepare page');
          let testId: string | undefined;
          const prepareResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Prepare, testId, undefined);
          testId = prepareResult.testId;
          let testToken = testHelper.generateNewToken();
          let emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, true, undefined);
          assert(!emptyCityPageTestResult.tokenPresent, 'expected token to be absent');
          const emptyCityTimestamp = emptyCityPageTestResult.lastChanged;

          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('open page with existing city', { testCase: testCaseName });
          const existingCityQuery = set({}, citySlugParamName, existingCitySlug);
          let existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, true, undefined);
          assert(!existingCityPageTestResult.tokenPresent, 'expected token to be absent');
          const existingCityTimestamp = existingCityPageTestResult.lastChanged;
          assert(existingCityTimestamp !== emptyCityTimestamp, 'expected timestamps to differ'); // page have been opened with different citySlug params


          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('try open page with non-existing city', { testCase: testCaseName });
          const nonExistingCityQuery = set({}, citySlugParamName, random(10000).toString());
          const nonExistingCityPageTestResult = await testHelper.testPageResponse(testToken, nonExistingCityQuery, false, undefined, 404);
          assert(nonExistingCityPageTestResult.httpResponseDetails.statusCode === 404, 'expected not found respose');

          
          logger.verbose('change page', { testCase: testCaseName });
          testToken = testHelper.generateNewToken();
          const changeResult = await testHelper.performPageAction(testPage, TestingPageCacheActionEnum.Change, testId, testToken);
          testId = changeResult.testId;
          await delay(LastModifiedTimeHeaderPrecision);
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, false, undefined);
          assert(!emptyCityPageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(emptyCityPageTestResult.lastChanged === emptyCityTimestamp, 'expected page last changed time to be the same as on prepare stage');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false, undefined);
          assert(!existingCityPageTestResult.tokenPresent, 'expected token to be absent'); // cache cleanup hasn't run yet
          assert(existingCityPageTestResult.lastChanged === existingCityTimestamp, 'expected page last changed time to be the same as on prepare stage');

          
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('running cache cleanup no4', { testCase: testCaseName });
          await testHelper.runCacheCleanup();
    
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, false, undefined);
          const emptyCityChangedTimestamp = emptyCityPageTestResult.lastChanged;
          assert(emptyCityPageTestResult.tokenPresent, 'expected token to present');
          assert(emptyCityChangedTimestamp > emptyCityTimestamp, 'expected page change timestamp to increase');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false, undefined);
          const existingCityChangedTimestamp = existingCityPageTestResult.lastChanged;
          assert(existingCityPageTestResult.tokenPresent, 'expected token to present');
          assert(existingCityChangedTimestamp > existingCityTimestamp, 'expected page change timestamp to increase');

          assert(existingCityChangedTimestamp !== emptyCityChangedTimestamp, 'expected timestamps to differ');
    
          await delay(LastModifiedTimeHeaderPrecision);
          logger.verbose('running cache cleanup again no5', { testCase: testCaseName });
          await testHelper.runCacheCleanup();
          emptyCityPageTestResult = await testHelper.testPageResponse(testToken, null, true, undefined);
          assert(emptyCityPageTestResult.tokenPresent, 'expected token to present');
          assert(emptyCityPageTestResult.lastChanged === emptyCityChangedTimestamp, 'expected page change timestamp to remain unchanged since last cache cleanup');

          existingCityPageTestResult = await testHelper.testPageResponse(testToken, existingCityQuery, false, undefined);
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
    const TestName8 = `[/${getPagePath(AppPage.BookingDetails)}] (${locale}) - booking's offer changes`;
    test(TestName8, DefaultTestOptions, async () => {
      let testHelper: PageTestHelper | undefined;
      try {
        await ensureServerStarted({ htmlPageMetadata }, logger);

        // auth required to book offer
        logger.verbose('authenticating', { testCase: TestName8 });
        testHelper = new PageTestHelper(AppPage.Index, localizePath(`${getPagePath(AppPage.Index)}`, locale), locale,  true, htmlPageMetadata, logger);
        await testHelper.start();
        await testHelper.purgeCache();
        let authCookies = await testHelper.getAuthCookies(joinURL(TestHostUrlWithProtocol, getPagePath(AppPage.Index)));
        
        logger.verbose('prepare booking page', { testCase: TestName8 });
        let bookingId: EntityId | undefined;
        const prepareResult = await performPageAction(AppPage.BookingDetails, TestingPageCacheActionEnum.Prepare, bookingId, undefined, authCookies, logger);
        bookingId = prepareResult.testId!;

        const pageUrl = localizePath(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale);
        testHelper = new PageTestHelper(AppPage.BookingDetails, pageUrl, locale, true, htmlPageMetadata, logger);
        await testHelper.start();
        authCookies = await testHelper.getAuthCookies(joinURL(TestHostUrlWithProtocol, getPagePath(AppPage.Index)));
        
        let bookingDocument = await testHelper.downloadBookingDocument(bookingId);
        assert(bookingDocument.statusCode < 400 && bookingDocument.imageBytesHash, 'expected booking document successfull download');

        const dummyToken = testHelper.generateNewToken(); // KB: user's booking data is client-only, so tokens won't be present in markup
        let pageTestResult = await testHelper.testPageResponse(dummyToken, undefined, true, false);
        const initialChangeTimestamp = pageTestResult.lastChanged;
        await delay(LastModifiedTimeHeaderPrecision);

        let ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
        const initialOgImageBytesHash = ogImageTestResult.imageBytesHash!;

        logger.verbose('change page', { testCase: TestName8 });
        const changeResult = await performPageAction(AppPage.BookingDetails, TestingPageCacheActionEnum.Change, bookingId, dummyToken, authCookies, logger);
        bookingId = changeResult.testId!;

        await delay(LastModifiedTimeHeaderPrecision);

        bookingDocument = await testHelper.downloadBookingDocument(bookingId);
        assert(bookingDocument.statusCode < 400 && bookingDocument.imageBytesHash, 'expected booking document successfull download');

        ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');

        // booking page caching must be disabled - changes will be immediately available
        pageTestResult = await testHelper.testPageResponse(dummyToken, undefined, false, false);
        const changedTimestamp = pageTestResult.lastChanged;
        assert(changedTimestamp > initialChangeTimestamp, 'expected page change timestamp to increase');

        ogImageTestResult = await testHelper.testOgImageResponse();
        assert(ogImageTestResult.statusCode < 400);
        assert(ogImageTestResult.imageBytesHash, 'expected non-empty og image');
        assert(ogImageTestResult.imageBytesHash !== initialOgImageBytesHash, 'expected og image content to change');
      } finally {
        await testHelper?.stop();
      }  
    });
  }

  const TestName9 = `[/${getPagePath(AppPage.Privacy)}] (${DefaultLocale}) - pages aren't cached in preview mode`;
  test(TestName9, DefaultTestOptions, async () => {
    const pageUrl =  localizePath(`/${getPagePath(AppPage.Privacy)}`, DefaultLocale);
    let testHelper: PageTestHelper | undefined;
    try {
      await ensureServerStarted({ htmlPageMetadata }, logger);
      const testHelper = new PageTestHelper(TestName9, pageUrl, DefaultLocale, false, htmlPageMetadata, logger);
      await testHelper.start();
      await testHelper.purgeCache();

      const testToken = testHelper.generateNewToken();
      let pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, undefined);
      assert(!pageTestResult.tokenPresent, 'expected token to be absent');
      assert(
        pageTestResult.httpResponseDetails.cacheControl === 'public',
        `expected caching enabled for ${AppPage.Privacy} page (got ${pageTestResult.httpResponseDetails.cacheControl})`
      );

      pageTestResult = await testHelper.testPageResponse(testToken, undefined, false, true);
      assert(!pageTestResult.tokenPresent, 'expected token to be absent');
      assert(pageTestResult.httpResponseDetails.cacheControl === 'no-store', `expected no caching in preview mode (got ${pageTestResult.httpResponseDetails.cacheControl})`);
    } finally {
      await testHelper?.stop();
    }
  });

  const Test10Pages = [AppPage.FlightDetails, AppPage.BookFlight, AppPage.StayDetails, AppPage.BookStay];
  for(let i = 0; i < Test10Pages.length; i++) {
    const testPage = Test10Pages[i];
    const testPageName = `[/${getPagePath(testPage)}] (${DefaultLocale}) - error pages aren't cached`;
    const serviceLevelParamName = 'serviceLevel';
    test(testPageName, DefaultTestOptions, async () => {
      let testHelper: PageTestHelper | undefined;
      try {
        await ensureServerStarted({ htmlPageMetadata }, logger);
        
        const notExistingId = `NotExistingId${new Date().getTime()}`;
        const pageUrl = localizePath(`/${getPagePath(testPage)}/${notExistingId}`, DefaultLocale);
        testHelper = new PageTestHelper(testPageName, pageUrl, DefaultLocale, false, htmlPageMetadata, logger);

        let defaultQuery: any = undefined;
        if(testPage === AppPage.BookStay) {
          defaultQuery = set({}, serviceLevelParamName, <StayServiceLevel>'CityView2');
        }
         
        await testHelper.start();
        await testHelper.purgeCache();
        
        const testToken = testHelper.generateNewToken();
        const nonExistingEntityTestResult = await testHelper.testPageResponse(testToken, defaultQuery, true, false, true);
        assert(nonExistingEntityTestResult.httpResponseDetails.cacheControl === AppConfig.caching.httpDefaults, `error page must not be cached, expected ${HeaderCacheControl} header to have [${AppConfig.caching.httpDefaults}] value (got ${nonExistingEntityTestResult.httpResponseDetails.cacheControl})`);

      } finally {
        await testHelper?.stop();
      }  
    });
  };
});

/* eslint-disable no-case-declarations */
import { HeaderLocation, AppConfig, localizePath, type IAppLogger, AllHtmlPages, EntityIdPages, HeaderContentType, DefaultLocale, CookieI18nLocale, CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken, type Locale, AvailableLocaleCodes, spinWait, delay, CREDENTIALS_TESTUSER_PROFILE as credentialsTestUserProfile, TEST_USER_PASSWORD, RestApiAuth } from '@golobe-demo/shared';
import { ApiAppEndpointPrefix, ApiEndpointTestingInvlidatePage, type ITestingInvalidateCacheDto } from '../../server/api-definitions';
import { TEST_SERVER_PORT, createLogger, ScreenshotDir, startWatchingTestFiles, stopWatchingTestFiles } from '../../helpers/testing';
import { beforeAll, afterAll, describe, test, type TestOptions } from 'vitest';
import type { Page, Request, Response } from 'playwright-core';
import { setup, createPage, createBrowser } from '@nuxt/test-utils/e2e';
import { join } from 'pathe';
import dayjs from 'dayjs';
import { parseURL, joinURL } from 'ufo';
import { LocatorClasses } from '../../helpers/constants';

type AuthProviderType = 'credentials' | 'oauth';
type AuthTestNavigationPage = 'index' | 'login' | 'account' | 'flights';
type LocaleSelectType = 'manual-with-cookie' | 'manual-without-cookie' | 'toggler';

const TestTimeout = 120000;
const PageNavigationDelayMs = 100; // delay in ms before proceeding test execution after navigation to new page was triggered (e.g. by clicking a link)
const UiIinteractionDelayMs = 100; // user interaction delay
const DefaultTestOptions: TestOptions = {
  timeout: TestTimeout,
  retry: 0,
  concurrent: false,
  sequential: true
};

declare type PageActionType = 'authCookieRemoved' | 'i18nCookieRemoved' | 'localeChanged' | 'logout' | 'login';
declare interface IActionOnPage {
  type: PageActionType
}
declare interface ILocaleSwitchPageAction extends IActionOnPage {
  type: 'localeChanged',
  newLocale: Locale
}

declare interface IAuthTestExpectations {
  isAuthenticated?: boolean,
  locale?: {
    inUrl?: Locale
    // inCookie?: Locale // KB: not testing internal implementation of i18n
  },
  page?: AuthTestNavigationPage
}

interface IPageNavigatedByUser {
  visitingPage: AuthTestNavigationPage,
  actionsOnPage?: IActionOnPage[]
}

interface IAuthTestCase {
  testName: string,
  authProvider: AuthProviderType,
  initialState: IPageNavigatedByUser & {
    acceptCookies?: boolean,
    authenticated?: boolean,
    userPreferredLocale?: Locale,
    invalidatePageCacheOnStart?: boolean,
    localeSelected?: {
      type: LocaleSelectType,
      locale: Locale
    }
  },
  navigatedPages?: IPageNavigatedByUser[],
  expectations?: IAuthTestExpectations
}

const TestHostUrl = `http://127.0.0.1:${TEST_SERVER_PORT}`;

class AuthTestCaseRunner {
  // using fixed desktop screen size as page's markup & layout is not tested by this runner (but navigation logic only)
  readonly screenSize = { width: 1200, height: 800 };

  testCase: IAuthTestCase;
  logger: IAppLogger;

  currentPage: Page | undefined;
  outstandingRequestsCount: number;

  isAuthUser: boolean;

  constructor (testCase: IAuthTestCase, logger: IAppLogger) {
    this.testCase = testCase;
    this.logger = logger.addContextProps({ component: 'AuthTests' });
    this.outstandingRequestsCount = 0;
    this.isAuthUser = false;
  }

  invalidatePageCache = async (): Promise<void> => {
    this.logger.verbose('sending invalidate test pages cache request', { currentPage: this.currentPage?.url() });
    // reset cache for all non-entity pages
    const reqBody: ITestingInvalidateCacheDto = {
      values: AllHtmlPages.filter(p => !EntityIdPages.includes(p)).map(page => {
        return  {
          page
        };
      })
    };
    const response = await fetch(joinURL(TestHostUrl, ApiEndpointTestingInvlidatePage), { body: JSON.stringify(reqBody), method: 'POST', headers: [[HeaderContentType, 'application/json']] });
    const responseDto = await response.json();
    if(!responseDto?.success) {
      this.logger.warn('invalidate test pages cache request failed', undefined, { currentPage: this.currentPage?.url(), result: responseDto, code: response.status, statusText: response.statusText });
      throw new Error('failed to invalidate test pages cache');
    };
    this.logger.verbose('test pages cache invalidate request completed', { currentPage: this.currentPage?.url() });
  };

  prepareOutstandingRequestsCounter = () => {
    this.outstandingRequestsCount = 0;
  };

  needCountRequestInOutstanding = (request: Request) => request.url().includes(`/${ApiAppEndpointPrefix}/`) && !request.url().includes(`/${ApiAppEndpointPrefix}/log/`);

  onRequestStart = (request: Request) => {
    if(this.needCountRequestInOutstanding(request)) {
      this.outstandingRequestsCount++;
    }
  };

  onRequestEnd = (request: Request) => {
    if(this.needCountRequestInOutstanding(request)) {
      this.outstandingRequestsCount--;
    }
  };

  onResponse = async (response: Response) => {
    const url = response.url();
    if(response.status() >= 400) {
      return;
    }

    const signoutCallbackPath = `${RestApiAuth}/signout`;
    const signinCallbackPath = `${RestApiAuth}/callback`;
    if(url.includes(signinCallbackPath) || (await response.headerValue(HeaderLocation))?.includes(signinCallbackPath)) {
      this.logger.verbose('user signed in');
      this.isAuthUser = true;
    } else if(url.includes(signoutCallbackPath)) {
      this.logger.verbose('user signed out');
      this.isAuthUser = false;
    }
  };

  getCurrentPageType = (): AuthTestNavigationPage | undefined => {
    if (!this.currentPage) {
      this.logger.warn('type of page is undefined');
      return undefined;
    }

    const pageUrl = this.currentPage.url();
    const parsedUrl = parseURL(pageUrl);
    const originalPath = this.localizeUrl(parsedUrl.pathname, 'en');
    if (originalPath === this.getPageUrl('index')) {
      this.logger.debug('current page type is index');
      return 'index';
    } else if (originalPath === this.getPageUrl('account')) {
      this.logger.debug('current page type is account');
      return 'account';
    } else if (originalPath === this.getPageUrl('flights')) {
      this.logger.debug('current page type is flights');
      return 'flights';
    } else if (originalPath === this.getPageUrl('login')) {
      this.logger.debug('current page type is login');
      return 'login';
    } else {
      this.logger.warn('unexpected original page path', undefined, { path: originalPath, url: pageUrl });
      return undefined;
    }
  };

  isAuthenticated = async (): Promise<boolean> => {
    let result = this.isAuthUser;
    if (!this.currentPage) {
      this.logger.debug('page is undefined, user unauthenticated');
      result = false;
    }

    this.logger.debug('user auth check');
    return result;
  };

  private signInWithCredentials = async (): Promise<void> => {
    this.logger.debug('signing in with credentials', { currentPage: this.currentPage?.url() });

    const page = this.currentPage!;

    await page.locator(LocatorClasses.SignInEmail).fill(credentialsTestUserProfile.email);
    await page.locator(LocatorClasses.SignInPassword).fill(TEST_USER_PASSWORD);
    await delay(UiIinteractionDelayMs);
    this.prepareOutstandingRequestsCounter();
    await page.locator(LocatorClasses.SubmitBtn).click();
    let currentUrl = await this.currentPage?.url();
    this.logger.debug('sign in with credentials button clicked', currentUrl);


    await spinWait(() => {
      return Promise.resolve(this.getCurrentPageType() !== 'login');
    }, TestTimeout);
    await this.ensurePageMounted();

    await spinWait(async () => {
      return await this.isAuthenticated();
    }, TestTimeout);

    currentUrl = await this.currentPage?.url();
    this.logger.debug('signed with credentials', currentUrl);
  };

  private signInWithTestLocalOAuth = async (): Promise<void> => {
    this.logger.debug('signing in with test local oauth provider', { currentPage: this.currentPage?.url() });

    const page = this.currentPage!;
    this.prepareOutstandingRequestsCounter();
    await page.locator(`.${LocatorClasses.TestLocalOAuthBtn}`).click();
    let currentUrl = await this.currentPage?.url();
    this.logger.debug('sign in with local oauth button clicked', currentUrl);
    await spinWait(() => {
      return Promise.resolve(this.getCurrentPageType() !== 'login');
    }, TestTimeout);
    await this.ensurePageMounted();

    await spinWait(async () => {
      return await this.isAuthenticated();
    }, TestTimeout);

    currentUrl = await this.currentPage?.url();
    this.logger.debug('signed with test local oauth', currentUrl);
  };

  signIn = async (authProvider: AuthProviderType): Promise<void> => {
    this.logger.verbose('signing in', { currentPage: this.currentPage?.url(), authProvider });

    if (this.getCurrentPageType() !== 'login') {
      this.logger.warn('cannot sign in', undefined, { currentPage: this.currentPage?.url(), authProvider });
      throw new Error('sign is possible only on login page');
    }

    if (authProvider === 'credentials') {
      await this.signInWithCredentials();
    } else {
      await this.signInWithTestLocalOAuth();
    }

    this.logger.verbose('signed in', { currentPage: this.currentPage?.url(), authProvider });
  };

  signOut = async (): Promise<void> => {
    this.logger.verbose('signing out', { currentPage: this.currentPage?.url() });

    if (!(await this.isAuthenticated())) {
      this.logger.warn('cannot sign out unauthenticated user', undefined, { currentPage: this.currentPage?.url() });
      throw new Error('cannot sign out unauthenticated user');
    }

    const page = this.currentPage!;
    await (await page.locator(`.${LocatorClasses.AuthUserMenu}`)).click();
    this.prepareOutstandingRequestsCounter();
    await (await page.locator(`.${LocatorClasses.AuthUserMenuPopup} button:has(.i-heroicons-solid\\:login)`)).dispatchEvent('click');
    await delay(PageNavigationDelayMs);
    await this.ensurePageMounted();

    await spinWait(async () => {
      return !(await this.isAuthenticated());
    }, TestTimeout);

    this.logger.verbose('signed out', { currentPage: this.currentPage?.url() });
  };

  removeCookies = async (cookieNames: string[]): Promise<void> => {
    this.logger.debug('removing cookies', { currentPage: this.currentPage?.url(), cookiesToRemove: cookieNames });

    const pageContext = this.currentPage!.context();
    const filteredCookies = (await pageContext
      .cookies())
      .filter(cookie => !cookieNames.includes(cookie.name));

    await pageContext.clearCookies();
    await pageContext.addCookies(filteredCookies);

    const remainedCookieNames = filteredCookies.map(x => x.name);
    this.logger.debug('cookies removed', { currentPage: this.currentPage?.url(), cookiesToRemove: cookieNames, remainedCookies: remainedCookieNames });
  };

  getCookieValue = async (name: string): Promise<string | undefined> => {
    this.logger.debug('obtaining cookie value', { currentPage: this.currentPage?.url(), cookieName: name });

    const pageContext = this.currentPage!.context();
    const matchedCookies = (await pageContext.cookies()).filter(c => c.name === name);
    let result: string | undefined;
    if (matchedCookies.length > 0) {
      result = matchedCookies[0].value;
    }

    this.logger.debug('cookie value obtained', { currentPage: this.currentPage?.url(), cookieName: name, result });
    return result;
  };

  getPageUrl = (page: AuthTestNavigationPage): string => {
    if (page === 'index') {
      return '/';
    }
    return `/${page}`;
  };

  getCurrentPageLocale = (): Locale => {
    const currentPageUrl = this.currentPage?.url();
    let result: Locale | undefined;
    if (!currentPageUrl) {
      result = DefaultLocale;
    } else {
      const path = parseURL(currentPageUrl).pathname;
      const localePrefix = AvailableLocaleCodes.filter(l => l !== DefaultLocale && path.startsWith(`/${l}`));
      if (localePrefix.length) {
        result = localePrefix[0] as Locale;
      } else {
        result = DefaultLocale;
      }
    }

    this.logger.debug('page locale obtained');
    return result;
  };

  localizeUrl = (path: string, locale: Locale): string => {
    this.logger.debug('localizing path', { currentPage: this.currentPage?.url(), path, locale });
    const result  = localizePath(path, locale);
    this.logger.debug('path localized', { currentPage: this.currentPage?.url(), path, locale, result });
    return result;
  };

  takeScreenshot = async (fileName?: string): Promise<void> => {
    this.logger.debug('taking current page screenshot', { currentPage: this.currentPage?.url() });
    if (!this.currentPage) {
      return;
    }
    const page = this.currentPage;
    fileName ??= `test-userauth-${dayjs().format('YYYYMMDD-HHmmss')}-${this.currentPage.url()}.jpeg`;
    const filePath = join(ScreenshotDir, fileName);

    await this.ensurePageMounted();
    await page.screenshot({ path: filePath, type: 'jpeg' });

    this.logger.debug('current page screenshot was taken', { currentPage: this.currentPage!.url(), fileName });
  };

  ensurePageMounted = async (timeoutMs?: number): Promise<boolean> => {
    timeoutMs ??= TestTimeout;
    this.logger.debug('ensuring current page was mounted', { currentPage: this.currentPage?.url(), timeoutMs });
    const page = this.currentPage;
    if (!page) {
      this.logger.warn('current page is undefined');
      return false;
    }

    const pageType = this.getCurrentPageType();
    const testIndicatorElement = async (): Promise<boolean> => {    
      const is500error = async () => /\s500\s/.test(await page.innerText('body'));     
      if(await is500error()) {
        // may got app:chunkError, but page is mounted and it is ok in test browser
        this.logger.debug('detected 500 error', { currentPage: page.url() });
        return true;
      }     
      if (pageType === 'index') {
        const indicatorElLocator = `.${LocatorClasses.SearchOffersFlightParams}`;
        return (await page.locator(indicatorElLocator).innerText())?.length > 0;        
      } else if (pageType === 'login') {
        const indicatorElLocator = 'button[role="tab"]';
        return await page.locator(indicatorElLocator).count() > 0;
      } else if (pageType === 'flights') {
        const indicatorElLocator = `.${LocatorClasses.SearchOffersFlightParams}`;
        return (await page.locator(indicatorElLocator).innerText())?.length > 0;
      } else if (pageType === 'account') {
        const indicatorElLocator = `.${LocatorClasses.UserAccountPage}`;
        return await page.locator(indicatorElLocator).count() > 0;
      } else {
        this.logger.warn('ensure mounted - unexpected page type', undefined, { type: pageType });
        throw new Error('unexpected page type');
      }
    };

    this.logger.debug('spin waiting for indicator element', { currentPage: this.currentPage?.url() });
    let result = await spinWait(async () => {
      return await testIndicatorElement();
    }, timeoutMs);
    if(!result) {
      this.logger.warn('spin wait for page indicator element failed', undefined, { currentPage: this.currentPage?.url() });
      return false;
    }

    this.logger.debug('spin waiting for page requests to complete', { currentPage: this.currentPage?.url() });
    result = await spinWait(async () => {
      this.logger.debug('outstanding page requests', { count: this.outstandingRequestsCount, currentPage: this.currentPage?.url() });
      return Promise.resolve(this.outstandingRequestsCount <= 0);
    }, timeoutMs);
    if(!result) {
      this.logger.warn('spin wait for page requests to complete failed', undefined, { currentPage: this.currentPage?.url() });
      return false;
    }

    this.logger.debug('page was mounted', { currentPage: this.currentPage?.url() });
    return result;
  };

  switchLocale = async (locale: Locale): Promise<void> => {
    this.logger.verbose('switching to', { locale, currentPage: this.currentPage?.url() });
    try {
      if (this.currentPage) {
        const page = this.currentPage;
        await this.ensurePageMounted();

        const pageType = this.getCurrentPageType()!;
        if (!['index', 'flights', 'account'].includes(pageType)) {
          this.logger.warn('switch to', undefined, { locale, currentPage: this.currentPage?.url() });
          throw new Error('cannot switch locale on page');
        }

        const localizedUrl = this.localizeUrl(this.getPageUrl(pageType), locale);
        const switchLinkLocator = `a[href^="${localizedUrl}"]`;
        this.prepareOutstandingRequestsCounter();
        await page.locator(`.${LocatorClasses.LocaleToggler}`).click();
        await page.locator(switchLinkLocator).dispatchEvent('click');

        await spinWait(() => {
          return Promise.resolve(this.getCurrentPageLocale() === locale);
        }, TestTimeout);
        await this.ensurePageMounted();
      }
    } catch (err: any) {
      this.logger.warn('failed switching to', err, { locale, currentPage: this.currentPage?.url() });
      throw err;
    }
  };

  navigateToPage = async (type: AuthTestNavigationPage): Promise<void> => {
    this.logger.verbose('navigating to page', { type, currentPage: this.currentPage?.url() });

    const page = this.currentPage;
    if (!page) {
      this.logger.warn('cannot navigate - current page is undefined');
      throw new Error('current page is undefined');
    }

    const currentPageType = this.getCurrentPageType();
    if (currentPageType === type) {
      this.logger.warn('attempt to navigate to the same page', undefined, type);
      return;
    }

    let pageAfterRedirections = type;
    const isAuthenticated = await this.isAuthenticated();
    if (type === 'login' && isAuthenticated) {
      this.logger.verbose('navigating authenticated user to login page - should  be redirected to index page', { currentPage: this.currentPage?.url() });
      pageAfterRedirections = 'index';
    }

    if (type === 'account' && !isAuthenticated) {
      this.logger.verbose('navigating unauthenticated user to account page - should  be redirected to login page', { currentPage: this.currentPage?.url() });
      pageAfterRedirections = 'login';
    }
    
    const navigateByClick = async (locator: string, waitForPage: AuthTestNavigationPage): Promise<void> => {
      this.logger.debug('navigating (waiting) for page  by click', { page: waitForPage, locator });
      this.prepareOutstandingRequestsCounter();
      await (await page.locator(locator)).click();
      await delay(PageNavigationDelayMs);

      await spinWait(() => {
        return Promise.resolve(this.getCurrentPageType() === waitForPage);
      }, TestTimeout);
      await this.ensurePageMounted();

      this.logger.debug('navigated to page by click successfully', { page: waitForPage });
    };

    switch (currentPageType) {
      case 'index':
        switch (type) {
          case 'login':
            const loginUrl = this.localizeUrl(this.getPageUrl('login'), this.getCurrentPageLocale());
            await navigateByClick(`a[href*="${loginUrl}"]`, pageAfterRedirections);
            break;
          case 'account':
            await page.locator(`.${LocatorClasses.AuthUserMenu}`).click();
            const accountUrl = this.localizeUrl(this.getPageUrl('account'), this.getCurrentPageLocale());
            await navigateByClick(`.${LocatorClasses.AuthUserMenuPopup} a[href*="${accountUrl}"]:last-child`, pageAfterRedirections);
            break;
          case 'flights':
            await navigateByClick(`nav a[href*="${this.getPageUrl('flights')}"]`, pageAfterRedirections);
            break;
          default:
            this.logger.warn('navigate to index - unexpected page', undefined, { type, currentPage: this.currentPage?.url() });
            throw new Error('unexpected page type');
        }
        break;
      case 'account':
        switch (type) {
          case 'index':
            await navigateByClick(`.${LocatorClasses.NavLogo}`, pageAfterRedirections);
            break;
          case 'flights':
            await navigateByClick(`nav a[href*="${this.getPageUrl('flights')}"]`, pageAfterRedirections);
            break;
          default:
            this.logger.warn('navigate to account - unexpected page', undefined, { type, currentPage: this.currentPage?.url() });
            throw new Error('unexpected page type');
        }
        break;
      case 'flights':
        switch (type) {
          case 'index':
            await navigateByClick(`.${LocatorClasses.NavLogo}`, pageAfterRedirections);
            break;
          case 'account':
            await page.locator(`.${LocatorClasses.AuthUserMenu}`).click();
            const accountUrl = this.localizeUrl(this.getPageUrl('account'), this.getCurrentPageLocale());
            await navigateByClick(`.${LocatorClasses.AuthUserMenuPopup} a[href*="${accountUrl}"]:last-child`, pageAfterRedirections);
            break;
          case 'login':
            const logintUrl = this.localizeUrl(this.getPageUrl('login'), this.getCurrentPageLocale());
            await navigateByClick(`a[href*="${logintUrl}"]`, pageAfterRedirections);
            break;
          default:
            this.logger.warn('navigate - unexpected page', undefined, { type:  type, currentPage: this.currentPage?.url() });
            throw new Error('unexpected page type');
        }
        break;
      case 'login':
        switch (type) {
          case 'index':
            await navigateByClick(`.${LocatorClasses.NavLogo}`, pageAfterRedirections);
            break;
          default:
            this.logger.warn('cannot navigate unauthenticated user from login page');
            throw new Error('unexpected page type');
        }
        break;
      default:
        this.logger.warn('unexpected current page type');
        throw new Error('unexpected page type');
    }

    this.logger.verbose('navigation to page completed');
  };

  acceptCookies = async (): Promise<void> => {
    this.logger.debug('accepting cookies', { currentPage: this.currentPage?.url() });

    await this.currentPage!.locator(`button.${LocatorClasses.CookieBannerBtn}`).click();
    await delay(UiIinteractionDelayMs);

    this.logger.debug('cookies accepted', { currentPage: this.currentPage?.url() });
  };

  performPageActions = async (actions: IActionOnPage[], authProvider: AuthProviderType): Promise<void> => {
    this.logger.verbose('performing page actions', { currentPage: this.currentPage?.url() });

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      switch (action.type) {
        case 'logout':
          await this.signOut();
          break;
        case 'login':
          await this.signIn(authProvider);
          break;
        case 'authCookieRemoved':
          await this.removeCookies([CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken]);
          this.isAuthUser = false;
          break;
        case 'i18nCookieRemoved':
          await this.removeCookies([CookieI18nLocale]);
          break;
        case 'localeChanged':
          const newLocale = (<ILocaleSwitchPageAction>action).newLocale;
          await this.switchLocale(newLocale);
          break;
        default:
          this.logger.warn('perform action - unexpected page action', undefined, { type: action.type });
          throw new Error('unexpected page action type');
      }
    }

    this.logger.verbose('page actions performed', { currentPage: this.currentPage?.url() });
  };

  prepareRun = async (): Promise<void> => {
    this.logger.info('----- STARTING test case -----');
    this.logger.verbose('preparing test case');

    try {
      if(this.testCase.initialState.invalidatePageCacheOnStart) {
        await createBrowser();
        await this.invalidatePageCache();
      } 

      const localeCookie = this.testCase.initialState.localeSelected?.type === 'manual-with-cookie'
        ? {
            name: CookieI18nLocale,
            domain: '127.0.0.1',
            expires: -1,
            httpOnly: false,
            sameSite: 'Lax' as const,
            path: '/',
            secure: false,
            value: this.testCase.initialState.localeSelected.locale
          }
        : undefined;
      const url = ['manual-with-cookie', 'manual-without-cookie'].includes(this.testCase.initialState.localeSelected?.type ?? '') ? this.localizeUrl(`${this.getPageUrl(this.testCase.initialState.visitingPage)}`, this.testCase.initialState.localeSelected!.locale) : this.getPageUrl(this.testCase.initialState.visitingPage);
      const preferredLocale = this.testCase.initialState.userPreferredLocale ?? DefaultLocale;
      this.currentPage = await createPage(url, {
        viewport: { width: this.screenSize.width, height: this.screenSize.height },
        storageState: {
          cookies: localeCookie ? [localeCookie] : [],
          origins: []
        },
        locale: `${preferredLocale}-${preferredLocale.toUpperCase()}`
      });
      this.currentPage.on('response', async (response) => {
        const respHeaders = await response.allHeaders();
        this.logger.debug('got page response', { url: response.url(), respHeaders });
        this.onResponse(response);
      }).on('request', async (request) => {
        const reqHeaders = await request.allHeaders();
        this.onRequestStart(request);
        this.logger.debug('page request started', { url: request.url(), outstandingRequestsCount: this.outstandingRequestsCount, redirectedFrom: request.redirectedFrom()?.url(), redirectedTo: request.redirectedTo()?.url(), reqHeaders });
      })
      .on('requestfinished', (request) => {
        this.onRequestEnd(request);
        this.logger.debug('request finished', { url: request.url(), outstandingRequestsCount: this.outstandingRequestsCount });
      })
      .on('requestfailed', (request) => {
        this.onRequestEnd(request);
        this.logger.warn('request failed', undefined, { url: request.url(), outstandingRequestsCount: this.outstandingRequestsCount });
      });
      await this.ensurePageMounted();

      if (this.testCase.initialState.acceptCookies ?? true) {
        this.logger.debug('test prepare - accepting cookies');
        await this.acceptCookies();
      }

      if (this.testCase.initialState.authenticated) {
        this.logger.debug('test prepare - authenticating user');
        await this.navigateToPage('login');
        await this.signIn(this.testCase.authProvider);
      }

      if (this.testCase.initialState.localeSelected?.type === 'toggler') {
        this.logger.debug('test prepare - selecting locale');
        await this.switchLocale(this.testCase.initialState.localeSelected.locale);
      }

      if (this.testCase.initialState.actionsOnPage) {
        this.logger.debug('test prepare - performing inital actions');
        await this.performPageActions(this.testCase.initialState.actionsOnPage, this.testCase.authProvider);
      }

      const cookies = await this.currentPage!.context().cookies();
      const pageUrl = await this.currentPage!.url();
      this.logger.info('test case prepared, initial state', { url: pageUrl, cookies });
    } catch (err: any) {
      this.logger.warn('failed to prepare test run', err);
      throw err;
    }
  };

  run = async (): Promise<void> => {
    this.logger.info('starting test run');

    const pagesToRun = this.testCase.navigatedPages ?? [];
    for (let i = 0; i < pagesToRun.length; i++) {
      const nextPage = pagesToRun[i];
      this.logger.verbose('proceeding to next page', { page: nextPage.visitingPage });
      await this.navigateToPage(nextPage.visitingPage);
      if (nextPage.actionsOnPage) {
        await this.performPageActions(nextPage.actionsOnPage, this.testCase.authProvider);
      }
    }

    this.logger.info('test run finished');
  };

  verifyExpectations = async (expectations?: IAuthTestExpectations): Promise<void> => {
    this.logger.info('verifying test expectations');

    if (!expectations) {
      this.logger.info('test expectations are empty - test completed');
      return;
    }

    const failExpectation = (failMsg: string) => {
      this.logger.error('expectation FAILED', undefined, { msg: failMsg });
      throw new Error(`expectation FAILED - ${failMsg}`);
    };

    if (expectations.page) {
      const currentPage = await this.getCurrentPageType();
      if (expectations.page !== currentPage) {
        failExpectation(`expected current page to be ${expectations.page}, actual=${currentPage}`);
      }
    }

    // KB: expectations.isAuthenticated verification is done inside this.isAuthenticated in singin/signout actions while page's context is still valid
  
    if (expectations.locale) {
      if (expectations.locale.inUrl) {
        const actualUrlLocale = await this.getCurrentPageLocale();
        if (expectations.locale.inUrl !== actualUrlLocale) {
          failExpectation(`expected URL locale to be ${expectations.locale.inUrl}, actual=${actualUrlLocale}`);
        }
      }

      // KB: not testing internal implementation of i18n
      /*
      if (expectations.locale.inCookie) {
        const actualCookieLocale = await this.getCookieValue(CookieNames.I18nLocale);
        if (expectations.locale.inCookie !== actualCookieLocale) {
          failExpectation(`expected cookie locale to be ${expectations.locale.inCookie}, actual=${actualCookieLocale}`);
        }
      }
      */
    }

    this.logger.info('test expectations have been verified');
  };

  stopRun = async (): Promise<void> => {
    this.logger.verbose('stopping test case');

    if (this.currentPage) {
      this.logger.verbose('closing current page');
      await this.currentPage.close();
    }

    this.logger.info('----- STOPPED test case -----');
  };
}

describe('e2e:auth User authentication', async () => {
  const logger = createLogger('(userauth)');
  logger.info('---- NEW TEST RUN ----');

  beforeAll(() => startWatchingTestFiles(logger), TestTimeout);
  afterAll(async () => await stopWatchingTestFiles(logger), TestTimeout);

  await setup({
    browser: true,
    setupTimeout: 600000,
    browserOptions: {
      type: 'chromium'
    },
    port: TEST_SERVER_PORT

  });

  async function runAuthTest (testCase: IAuthTestCase, logger?: IAppLogger): Promise<void> {
    logger ??= createLogger(testCase.testName);

    const testRunner = new AuthTestCaseRunner(testCase, logger);
    await testRunner.prepareRun();
    await testRunner.run();
    await testRunner.verifyExpectations(testCase.expectations);
  }

  const TestName1 = 'default locale, empty site data, credentials login (first-time site visit, basic case)';
  test(TestName1, DefaultTestOptions, async () => {
    const testCase: IAuthTestCase = {
      testName: TestName1,
      authProvider: 'credentials',
      initialState: {
        visitingPage: 'index',
        userPreferredLocale: 'en'
      },
      navigatedPages: [
        {
          visitingPage: 'login',
          actionsOnPage: [{ type: 'login' }]
        }
      ],
      expectations: {
        isAuthenticated: true,
        page: 'index',
        locale: {
          inUrl: 'en'
        }
      }
    };
    await runAuthTest(testCase);
  });

  const TestName2 = 'default locale, empty site data, oauth login (first-time site visit, basic case)';
  test(TestName2, DefaultTestOptions, async () => {
    const testCase: IAuthTestCase = {
      testName: TestName2,
      authProvider: 'oauth',
      initialState: {
        visitingPage: 'index',
        userPreferredLocale: 'en'
      },
      navigatedPages: [
        {
          visitingPage: 'login',
          actionsOnPage: [{ type: 'login' }]
        }
      ],
      expectations: {
        isAuthenticated: true,
        page: 'index',
        locale: {
          inUrl: 'en'
        }
      }
    };
    await runAuthTest(testCase);
  });

  const TestName3 = 'default locale changed on first-time visit, both auth providers';
  test(TestName3, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName3,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en',
          localeSelected: {
            locale: 'fr',
            type: 'toggler'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'account'
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'account',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName3);

    logger.info('testing with credentials provider', { testCase: TestName3 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName3 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName4 = 'default locale changed from non-index page (first-time visit), both auth providers';
  test(TestName4, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName4,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en'
        },
        navigatedPages: [
          {
            visitingPage: 'flights',
            actionsOnPage: [<ILocaleSwitchPageAction>{ type: 'localeChanged', newLocale: 'ru' }]
          },
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'account'
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'account',
          locale: {
            inUrl: 'ru'
          }
        }
      };
    };

    const logger = createLogger(TestName4);

    logger.info('testing with credentials provider', { testCase: TestName4 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName4 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName5 = 'preferred locale differs from default (first-time visit), both auth providers';
  test(TestName5, AppConfig.caching.intervalSeconds ?
    { 
      skip: true /** with page caching enabled on server-side the auto-redirection code (i18n plugin) may not be reached */ 
    } : DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName5,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'ru',
          invalidatePageCacheOnStart: true
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'account'
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'account',
          locale: {
            inUrl: 'ru'
          }
        }
      };
    };

    const logger = createLogger(TestName5);

    logger.info('testing with credentials provider', { testCase: TestName5 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName5 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName6 = 'preferred locale changed to another non-default (first-time visit), both auth providers';
  test(TestName6, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName6,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'ru',
          invalidatePageCacheOnStart: true
        },
        navigatedPages: [
          {
            visitingPage: 'flights',
            actionsOnPage: [<ILocaleSwitchPageAction>{ type: 'localeChanged', newLocale: 'fr' }]
          },
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'flights',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName6);

    logger.info('testing with credentials provider', { testCase: TestName6 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName6 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName7 = 'locale was changed on previous visit to another non-default, both auth providers';
  test(TestName7, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName7,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'ru',
          localeSelected: {
            locale: 'fr',
            type: 'manual-with-cookie'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'index',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName7);

    logger.info('testing with credentials provider', { testCase: TestName7 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName7 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName8 = 'locale was changed on previous visit to default, both auth providers';
  test(TestName8, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName8,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'fr',
          localeSelected: {
            locale: 'en',
            type: 'manual-with-cookie'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'index',
          locale: {
            inUrl: 'en'
          }
        }
      };
    };

    const logger = createLogger(TestName8);

    logger.info('testing with credentials provider', { testCase: TestName8 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName8 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName9 = 'logout on index page with default locale';
  test(TestName9, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName9,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en'
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }, { type: 'logout' }]
          }
        ],
        expectations: {
          isAuthenticated: false,
          page: 'index',
          locale: {
            inUrl: 'en'
          }
        }
      };
    };

    const logger = createLogger(TestName9);

    logger.info('testing with credentials provider', { testCase: TestName9 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName9 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName10 = 'logout on non-index page with default locale';
  test(TestName10, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName10,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en'
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'flights',
            actionsOnPage: [{ type: 'logout' }]
          }
        ],
        expectations: {
          isAuthenticated: false,
          page: 'flights',
          locale: {
            inUrl: 'en'
          }
        }
      };
    };

    const logger = createLogger(TestName10);

    logger.info('testing with credentials provider', { testCase: TestName10 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName10 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName11 = 'logout on index page with locale switched to non-default';
  test(TestName11, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName11,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en',
          localeSelected: {
            type: 'toggler',
            locale: 'fr'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }, { type: 'logout' }]
          }
        ],
        expectations: {
          isAuthenticated: false,
          page: 'index',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName11);

    logger.info('testing with credentials provider', { testCase: TestName11 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName11 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName12 = 'logout on non-index page with locale switched to non-default';
  test(TestName12, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName12,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'en',
          localeSelected: {
            type: 'toggler',
            locale: 'fr'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'flights',
            actionsOnPage: [{ type: 'logout' }]
          }
        ],
        expectations: {
          isAuthenticated: false,
          page: 'flights',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName12);

    logger.info('testing with credentials provider', { testCase: TestName12 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName12 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName13 = 'logout on non-index page when preferred locale differs from default';
  test(TestName13, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName13,
        authProvider,
        initialState: {
          visitingPage: 'index',
          userPreferredLocale: 'ru',
          localeSelected: {
            type: 'toggler',
            locale: 'fr'
          }
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          },
          {
            visitingPage: 'flights',
            actionsOnPage: [{ type: 'logout' }]
          }
        ],
        expectations: {
          isAuthenticated: false,
          page: 'flights',
          locale: {
            inUrl: 'fr'
          }
        }
      };
    };

    const logger = createLogger(TestName13);

    logger.info('testing with credentials provider', { testCase: TestName13 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName13 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName14 = 'sign-in when app started from login page';
  test(TestName14, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName14,
        authProvider,
        initialState: {
          visitingPage: 'login',
          userPreferredLocale: 'en'
        },
        navigatedPages: [
          {
            visitingPage: 'login',
            actionsOnPage: [{ type: 'login' }]
          }
        ],
        expectations: {
          isAuthenticated: true,
          page: 'index',
          locale: {
            inUrl: 'en'
          }
        }
      };
    };

    const logger = createLogger(TestName14);

    logger.info('testing with credentials provider', { testCase: TestName14 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName14 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName15 = 'redirect to login page when unauthenticated user opens account page';
  test(TestName15, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName15,
        authProvider,
        initialState: {
          visitingPage: 'account'
        },
        expectations: {
          isAuthenticated: false,
          page: 'login'
        }
      };
    };

    const logger = createLogger(TestName15);

    logger.info('testing with credentials provider', { testCase: TestName15 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName15 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName16 = 'redirect to index page when authenticated user opens login page';
  test(TestName16, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName16,
        authProvider,
        initialState: {
          authenticated: true,
          visitingPage: 'login',
          userPreferredLocale: 'ru',
          localeSelected: {
            locale: 'ru',
            type: 'manual-with-cookie'
          }
        },
        expectations: {
          isAuthenticated: true,
          page: 'index',
          locale: {
            inUrl: 'ru'
          }
        }
      };
    };

    const logger = createLogger(TestName16);

    logger.info('testing with credentials provider', { testCase: TestName16 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName16 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });

  const TestName17 = 'redirect to login page on unauthenticated fetch response error';
  test(TestName17, DefaultTestOptions, async () => {
    const getTestCase = (authProvider: AuthProviderType): IAuthTestCase => {
      return {
        testName: TestName17,
        authProvider,
        initialState: {
          authenticated: true,
          visitingPage: 'index',
          userPreferredLocale: 'en',
          localeSelected: {
            locale: 'en',
            type: 'manual-with-cookie'
          }
        },
        navigatedPages: [{ 
          visitingPage: 'index',
          actionsOnPage: [{
            type: 'authCookieRemoved'
          }]
        }, {
          visitingPage: 'account'
        }],
        expectations: {
          isAuthenticated: false,
          page: 'login'
        }
      };
    };

    const logger = createLogger(TestName17);

    logger.info('testing with credentials provider', { testCase: TestName17 });
    let testCase = getTestCase('credentials');
    await runAuthTest(testCase, logger);

    logger.info('testing with oauth provider', { testCase: TestName17 });
    testCase = getTestCase('oauth');
    await runAuthTest(testCase, logger);
  });
});
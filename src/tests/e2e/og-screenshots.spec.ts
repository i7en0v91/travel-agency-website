import { assert, beforeAll, afterAll, describe, test, type TestOptions } from 'vitest';
import type { Page } from 'playwright-core';
import { setup, createPage } from '@nuxt/test-utils/e2e';
import { join } from 'pathe';
import { joinURL } from 'ufo';
import isString from 'lodash-es/isString';
import { lookupParentDirectory, AppConfig, type IAppLogger, AppPage, AllHtmlPages, EntityIdPages, getPagePath, type Locale, CookieI18nLocale, AvailableLocaleCodes, DefaultLocale, OgImageExt, delay, getOgImageFileName } from '@golobe-demo/shared';
import { TEST_SERVER_PORT, createLogger, startWatchingTestFiles, stopWatchingTestFiles } from '../../helpers/testing';
import { access } from 'fs/promises';

const TestTimeout = 300000;
const TestRunOptions: TestOptions = {
  timeout: TestTimeout,
  retry: 0,
  concurrent: false,
  sequential: true
};

const pageUrls: ReadonlyMap<AppPage, string | false> = new Map<AppPage, string | false>([
  [AppPage.Account, getPagePath(AppPage.Index)],
  [AppPage.Favourites, getPagePath(AppPage.Index)],
  [AppPage.EmailVerifyComplete, getPagePath(AppPage.Index)],
  [AppPage.FindFlights, getPagePath(AppPage.FindFlights)],
  [AppPage.FindStays, getPagePath(AppPage.FindStays)],
  [AppPage.FlightDetails, false], // rendered on-request
  [AppPage.BookFlight, false], // rendered on-request
  [AppPage.Flights, getPagePath(AppPage.Flights)],
  [AppPage.ForgotPassword, getPagePath(AppPage.ForgotPassword)],
  [AppPage.ForgotPasswordComplete, getPagePath(AppPage.ForgotPassword)],
  [AppPage.ForgotPasswordSet, getPagePath(AppPage.ForgotPassword)],
  [AppPage.ForgotPasswordVerify, getPagePath(AppPage.ForgotPassword)],
  [AppPage.Index, getPagePath(AppPage.Index)],
  [AppPage.Login, getPagePath(AppPage.Login)],
  [AppPage.Privacy, getPagePath(AppPage.Privacy)],
  [AppPage.Signup, getPagePath(AppPage.Signup)],
  [AppPage.SignupComplete, getPagePath(AppPage.Signup)],
  [AppPage.SignupVerify, getPagePath(AppPage.Signup)],
  [AppPage.Stays, getPagePath(AppPage.Stays)],
  [AppPage.StayDetails, false], // rendered on-request
  [AppPage.BookStay, false], // rendered on-request
  [AppPage.BookingDetails, false] // rendered on-request
]);

class PageScreenshoter {
  readonly screenSize = AppConfig.ogImage.screenSize;

  logger: IAppLogger;
  url: string;
  locale: Locale;
  screenshotDir: string;
  fileName: string;

  currentPage: Page | undefined;

  constructor (url: string, locale: Locale, screenshotDir: string, fileName: string, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'OgScreenshotsTests' });
    this.url = url;
    this.screenshotDir = screenshotDir;
    this.fileName = fileName;
    this.locale = locale;
  }

  private localizePath = (path: string, locale: Locale): string => {
    this.logger.debug('localizing path', { currentPage: this.currentPage?.url(), path, locale });

    const localePrefix = AvailableLocaleCodes.filter(l => l !== DefaultLocale && path.startsWith(`/${l}`));
    if (localePrefix.length > 0) {
      path = path.replace(`/${localePrefix[0]}`, '/');
      if (path.startsWith('//')) {
        path = path.replace('//', '/');
      }
    }
    let result = path;
    if (locale !== DefaultLocale) {
      result = joinURL(`/${locale}`, path);
    }

    this.logger.debug('path localized', { currentPage: this.currentPage?.url(), path, locale, result });
    return result;
  };

  private saveScreenshotToFile = async (): Promise<void> => {
    this.logger.debug('taking current page screenshot', { currentPage: this.currentPage?.url() });
    if (!this.currentPage) {
      return;
    }
    const page = this.currentPage;
    const filePath = join(this.screenshotDir, this.fileName);

    await page.screenshot({ path: filePath, type: OgImageExt });

    this.logger.debug('current page screenshot was taken', { currentPage: this.currentPage!.url(), fileName: this.fileName });
  };

  private acceptCookies = async (): Promise<void> => {
    this.logger.debug('accepting cookies', { currentPage: this.currentPage?.url() });

    await this.currentPage!.locator('button.cookie-banner-accept-btn').click();
    await delay(100);

    this.logger.debug('cookies accepted', { currentPage: this.currentPage?.url() });
  };

  private waitPageReady = async (timeoutSecs?: number): Promise<void> => {
    timeoutSecs ??= TestTimeout;
    this.logger.debug('waiting for page is ready', { currentPage: this.currentPage?.url(), timeoutSecs });
    const page = this.currentPage;
    if (!page) {
      this.logger.warn('current page is undefined');
      assert.fail('current page is undefined');
    }

    await this.acceptCookies();
  };

  takeScreenshot = async (): Promise<void> => {
    try {
      this.logger.verbose('taking screenshot', { url: this.url, locale: this.locale, fileName: this.fileName });

      const localeCookie = {
        name: CookieI18nLocale,
        domain: '127.0.0.1',
        expires: -1,
        httpOnly: false,
        sameSite: 'Lax' as const,
        path: '/',
        secure: false,
        value: this.locale
      };
      const url = this.localizePath(this.url, this.locale);
      this.currentPage = await createPage(url, {
        viewport: { width: this.screenSize.width, height: this.screenSize.height },
        storageState: {
          cookies: [localeCookie],
          origins: []
        },
        locale: this.locale
      });
      this.currentPage.on('response', (response) => {
        this.logger.debug('got page response', { url: response.url() });
      }).on('request', (request) => {
        this.logger.debug('page request started', { url: request.url(), redirectedFrom: request.redirectedFrom()?.url(), redirectedTo: request.redirectedTo()?.url() });
      });

      await this.waitPageReady();
      await this.saveScreenshotToFile();

      await this.currentPage.close();

      this.logger.verbose('screenshot was taken', { url: this.url, locale: this.locale, fileName: this.fileName });
    } catch (err: any) {
      this.logger.warn('failed to take screenshot', err, { url: this.url, locale: this.locale });
      throw err;
    }
  };
}

// KB: screenshots were built with Chromium 127.0.6533.17
describe('og:image screenshots generation', async () => {
  const logger = createLogger('(og-screenshots)');
  logger.info('-------------- NEW TEST RUN --------------');

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

  test('og images generation (screenshots for pages with static og image)', TestRunOptions, async () => {
    const imgPages: AppPage[] = AllHtmlPages.filter(p => !EntityIdPages.includes(p as AppPage));
    const publicAssetsDir = await lookupParentDirectory('.', 'public', async (path: string) => { await access(path); return true; });
    if (!publicAssetsDir) {
      logger.error('screenshot generation FAILED - cannot locate public directory!');
      throw new Error('screenshot generation FAILED - cannot locate public directory!');
    }
    const ogImageDir = join(publicAssetsDir, 'img', 'og');

    logger.info('starting og image generation, num', { pages: imgPages.length });
    for (let i = 0; i < imgPages.length; i++) {
      for (let j = 0; j < AvailableLocaleCodes.length; j++) {
        const page = imgPages[i];
        const pageUrl = pageUrls.get(page);
        if (!isString(pageUrl)) {
          logger.error('screenshot generation FAILED - url was not found', undefined, page);
          throw new Error('screenshot generation FAILED - url was not found');
        }

        const locale = AvailableLocaleCodes[j] as Locale;
        const fileName = getOgImageFileName(page, locale);

        const screenshoter = new PageScreenshoter(`/${pageUrl}`, locale, ogImageDir, fileName, logger);
        await screenshoter.takeScreenshot();
      }
    }
    logger.info('image generation completed, num', { pages: imgPages.length });
  });
});

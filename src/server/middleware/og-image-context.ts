import { stringifyParsedURL, parseURL, parseQuery } from 'ufo';
import { type Theme, type Locale, DefaultTheme, OgImagePathSegment, DefaultLocale } from './../../shared/constants';
import { getLocaleFromUrl } from './../../shared/i18n';
import { type IAppLogger } from './../../shared/applogger';
import { AppException, AppExceptionCodeEnum } from './../../shared/exceptions';

export default defineEventHandler((event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  const url = parseURL(event.node.req.url);
  const search = parseQuery(url.search);
  if (url.pathname.includes(OgImagePathSegment)) {
    let requestLocale: Locale;
    let isSecondPageRequest: boolean;
    let requestTheme: Theme;

    try {
      const isSecondPageParam = (search.isSecondPage ?? '').toString().toLowerCase().trim();
      isSecondPageRequest = isSecondPageParam === 'true' || isSecondPageParam === '1';
    } catch (err: any) {
      logger?.warn(`(og-image-context) failed to determine og image page from url, url=${url}`, err);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot parse request url', 'error-stub');
    }

    try {
      requestLocale = getLocaleFromUrl(url.pathname) as Locale;

      const themeParam = (search.theme ?? '').toString().toLowerCase().trim();
      requestTheme = themeParam === 'dark' ? 'dark' : 'light';
    } catch (err: any) {
      logger?.warn(`(og-image-context) failed to determine og image context param from url, url=${url}`, err);
      requestLocale = DefaultLocale;
      requestTheme = DefaultTheme;
    }

    // for distinguishing og-image request url's
    event.context.ogImageRequest = {
      locale: requestLocale,
      isSecondPage: isSecondPageRequest,
      theme: requestTheme,
      serviceLevel: search.serviceLevel
    };

    logger?.debug(`(og-image-context) detected, url=${stringifyParsedURL(url)}, locale=${requestLocale}, theme=${requestTheme}, isSecondPage=${isSecondPageRequest}`);
  }
});

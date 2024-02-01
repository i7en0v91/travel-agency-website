import { CookieNames, DefaultLocale } from '../shared/constants';
import { getLocaleFromUrl } from '../server-logic/session/server';
import { isLandingPageUrl } from '../shared/common';

export default defineNuxtRouteMiddleware((to, from) => {
  if (process.server) {
    const logger = CommonServicesLocator.getLogger();
    try {
      const localeCookie = useCookie(CookieNames.I18nLocale);
      logger.verbose(`(redirections.global) server, from=${from.path}, to=${to.path}`);

      const fromLocale = from ? getLocaleFromUrl(from.path) : undefined;
      const toLocale = from ? getLocaleFromUrl(from.path) : undefined;

      if (toLocale && (!fromLocale || toLocale !== fromLocale)) {
        logger.verbose(`(redirections.global) server, detected locale change, from=${fromLocale ?? '[none]'} to=${toLocale ?? '[none]'}`);
      } else if (!localeCookie.value && toLocale) {
        if (toLocale !== DefaultLocale || !isLandingPageUrl(to.path)) {
          logger.verbose(`(redirections.global) server, setting locale cookie: ${toLocale}`);
          localeCookie.value = toLocale;
        }
      }
    } catch (err: any) {
      logger.warn(`(redirections.global) server, failed to actualize locale cookie: from=${from.path}, to=${to.path}`, err);
    }
  }
});

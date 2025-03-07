import { lookupPageByUrl, getLocaleFromUrl, AppPage, SystemPage, CookieI18nLocale, DefaultLocale } from '@golobe-demo/shared';
import { getCommonServices } from '../helpers/service-accessors';

export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) {
    const logger = getCommonServices().getLogger().addContextProps({ component: 'RedirectionsGlobal' });
    try {
      const localeCookie = useCookie(CookieI18nLocale);
      logger.verbose('server', { from: from.path, to: to.path });

      const fromLocale = from ? getLocaleFromUrl(from.path) : undefined;
      const toLocale = from ? getLocaleFromUrl(from.path) : undefined;

      if (toLocale && (!fromLocale || toLocale !== fromLocale)) {
        logger.verbose('server, detected locale change', { from: fromLocale ?? '[none]', to: toLocale ?? '[none]' });
      } else if (!localeCookie.value && toLocale) {
        const page = lookupPageByUrl(to.path);
        if (toLocale !== DefaultLocale || (!!page && page !== AppPage.Index && page !== SystemPage.Drafts)) {
          logger.verbose('server, setting locale cookie', toLocale);
          localeCookie.value = toLocale;
        }
      }
    } catch (err: any) {
      logger.warn('server, failed to actualize locale cookie', err, { from: from.path, to: to.path });
    }
  }
});

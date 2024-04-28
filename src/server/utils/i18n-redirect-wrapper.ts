import { type EventHandler, type EventHandlerRequest, type EventHandlerResponse, getCookie } from 'h3';
import onHeaders from 'on-headers';
import { patchUrlWithLocale, getLocaleFromUrl } from '../../shared/i18n';
import { DefaultLocale, CookieI18nLocale, type Locale, HeaderLocation } from '../../shared/constants';

export function wrapI18nRedirect<Request extends EventHandlerRequest = EventHandlerRequest, Response = EventHandlerResponse> (
  originalHandler: EventHandler<Request, Promise<Response>>, affectedUrls: RegExp[])
    : EventHandler<Request, Promise<Response>> {
  return defineEventHandler(async (event) => {
    const url = event.node.req.url;

    if (!(globalThis as any).ServerServicesLocator || !url) {
      return await originalHandler(event); // skipping as nuxt hasn't been fully started
    }

    const logger = ServerServicesLocator.getLogger();
    logger.verbose(`(wrapI18nRedirect) called for url=${event.node.req.url}`);

    let currentLocale: Locale | undefined;
    if (event.node.req.url) {
      currentLocale = getCookie(event, CookieI18nLocale) as Locale;
      if (!currentLocale) {
        currentLocale = getLocaleFromUrl(event.node.req.url!);
        logger.debug(`(wrapI18nRedirect) cookie has no locale info, obtained from url: url=${url}, locale=${currentLocale}`);
      } else {
        logger.debug(`(wrapI18nRedirect) locale obtained from cookie: url=${url}, locale=${currentLocale}`);
      }
    }

    if (!currentLocale || currentLocale === DefaultLocale) {
      logger.debug(`(wrapI18nRedirect) skipping as current locale is the default one: url=${url}`);
      return await originalHandler(event);
    }

    onHeaders(event.node.res, () => {
      try {
        const response = event.node.res;
        const responseStatus = event.node.res.statusCode;
        const location = response.getHeader(HeaderLocation)?.toString();
        if (responseStatus === 302 && location && affectedUrls.some(r => r.test(url!))) {
          if (currentLocale) {
            logger.info(`(wrapI18nRedirect) updating redirect location with locale path: url=${url}, location=${location}, locale=${currentLocale}`);
            const patchedLocation = patchUrlWithLocale(location!.toString(), currentLocale);
            if (!patchedLocation) {
              logger.warn(`(wrapI18nRedirect) failed to parse url, skipping: url=${url}, location${url}`);
              return;
            }
            logger.verbose(`(wrapI18nRedirect) updated redirect location is: location=${patchedLocation}`);
            response.setHeader(HeaderLocation, patchedLocation);
          } else {
            logger.warn(`(wrapI18nRedirect) failed to update redirect location as cannot detect current locale: url=${url}, location=${location}`);
          }
        }
      } catch (err: any) {
        logger.warn(`(wrapI18nRedirect) exception occured while processing headers, url=${url}`, err);
      }
    });

    return await originalHandler(event);
  });
}

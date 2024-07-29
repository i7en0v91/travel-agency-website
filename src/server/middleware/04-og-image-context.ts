import { parseURL } from 'ufo';
import { DefaultLocale, OgImagePathSegment } from '../../shared/constants';
import { getLocaleFromUrl } from '../../shared/i18n';
import { type IAppLogger } from '../../shared/applogger';

export default defineEventHandler((event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  const url = event.node.req.url;
  if(event.context.ogImageContext) {
    logger?.debug(`(og-image-context) detected  (already present), url=${url}`);
    return;
  }
  if(!event.node.req.url) {
    return;
  }
  
  logger?.debug(`(og-image-context) checking, url=${url}`);
  event.context.ogImageContext = undefined;
  const parsedUrl = parseURL(url);
  if (parsedUrl.pathname.includes(OgImagePathSegment)) {
    event.context.ogImageContext = {
      locale: getLocaleFromUrl(event.node.req.url) ?? DefaultLocale
    };
    logger?.debug(`(og-image-context) detected, url=${url}`);
  }
});

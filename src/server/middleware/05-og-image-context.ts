import { getLocaleFromUrl, DefaultLocale, OgImagePathSegment } from '@golobe-demo/shared';
import { parseURL } from 'ufo';
import { getCommonServices } from '../../helpers/service-accessors';

export default defineEventHandler((event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'OgImageContext' });
  const url = event.node.req.url;
  if(event.context.ogImageContext) {
    logger.debug('detected  (already present', url);
    return;
  }
  if(!event.node.req.url) {
    return;
  }
  
  logger.debug('checking', url);
  event.context.ogImageContext = undefined;
  const parsedUrl = parseURL(url);
  if (parsedUrl.pathname.includes(OgImagePathSegment)) {
    event.context.ogImageContext = {
      locale: getLocaleFromUrl(event.node.req.url) ?? DefaultLocale
    };
    logger.debug('detected', url);
  }
});

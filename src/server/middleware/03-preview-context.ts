import { PreviewModeParamEnabledValue, QueryPagePreviewModeParam } from '@golobe-demo/shared';
import { parseURL, parseQuery } from 'ufo';
import { getCommonServices } from '../../helpers/service-accessors';
import { defineEventHandler } from 'h3';

export default defineEventHandler((event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'PreviewContext' });
  const url = event.node.req.url;
  if(event.context.preview?.mode) {
    logger.debug('detected (already present', url);
    return;
  }

  event.context.preview = {
    mode: false
  };
  
  logger.debug('checking', url);
  const parsedUrl = parseURL(url);
  try {
    const query = parsedUrl.search ? parseQuery(parsedUrl.search.replaceAll('&amp;', '&')) : undefined; // &amp; replacements for satori requests
    if(query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue) {
      logger.verbose('detected', url);
      event.context.preview.mode = true;
    }
  } catch(err: any) {
    logger.warn('failed to parse url query', err, url);
  }
});

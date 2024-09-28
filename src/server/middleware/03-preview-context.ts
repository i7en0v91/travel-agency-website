import { type IAppLogger, PreviewModeParamEnabledValue, QueryPagePreviewModeParam } from '@golobe-demo/shared';
import { parseURL, parseQuery } from 'ufo';
import { getCommonServices } from '../../helpers/service-accessors';
import { defineEventHandler } from 'h3';

export default defineEventHandler((event) => {
  const logger = getCommonServices().getLogger() as IAppLogger;
  const url = event.node.req.url;
  if(event.context.preview?.mode) {
    logger.debug(`(preview-context) detected (already present), url=${url}`);
    return;
  }

  event.context.preview = {
    mode: false
  };
  
  logger.debug(`(preview-context) checking, url=${url}`);
  const parsedUrl = parseURL(url);
  try {
    const query = parsedUrl.search ? parseQuery(parsedUrl.search.replaceAll('&amp;', '&')) : undefined; // &amp; replacements for satori requests
    if(query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue) {
      logger.verbose(`(preview-context) detected, url=${url}`);
      event.context.preview.mode = true;
    }
  } catch(err: any) {
    logger.warn(`(preview-context) failed to parse url query, url=${url}`, err);
  }
});

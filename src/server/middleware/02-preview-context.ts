import { parseURL, parseQuery } from 'ufo';
import { PreviewModeParamEnabledValue, QueryPagePreviewModeParam } from '../../shared/constants';
import { type IAppLogger } from '../../shared/applogger';

export default defineEventHandler((event) => {
  const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
  const url = event.node.req.url;
  if(event.context.preview?.mode) {
    logger?.debug(`(preview-context) detected (already present), url=${url}`);
    return;
  }

  event.context.preview = {
    mode: false
  };
  
  logger?.debug(`(preview-context) checking, url=${url}`);
  const parsedUrl = parseURL(url);
  try {
    const query = parsedUrl.search ? parseQuery(parsedUrl.search.replaceAll('&amp;', '&')) : undefined; // &amp; replacements for satori requests
    if(query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue) {
      logger?.verbose(`(preview-context) detected, url=${url}`);
      event.context.preview.mode = true;
    }
  } catch(err: any) {
    logger.warn(`(preview-context) failed to parse url query, url=${url}`, err);
  }
});

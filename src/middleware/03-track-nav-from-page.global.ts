import { lookupPageByUrl } from '@golobe-demo/shared';
import { getClientServices, getCommonServices } from '../helpers/service-accessors';

export default defineNuxtRouteMiddleware(async (to, from) => {
  if(!import.meta.client) {
    return;
  }

  const logger = getCommonServices().getLogger();
  if(from.redirectedFrom) {
    logger.debug(`(track-nav-from-page) ignoring from redirects, from=${from.fullPath}, to=${to.fullPath}`);
    return;
  }

  const fromPage = lookupPageByUrl(from.path);
  if(!fromPage) {
    logger.verbose(`(track-nav-from-page) ignoring unknown from pages, from=${from.fullPath}, to=${to.fullPath}`);
    return;
  }

  logger.debug(`(track-nav-from-page) updating navigated page state, page=${fromPage}, from=${from.fullPath}, to=${to.fullPath}`);
  const appState = getClientServices().state;
  appState.navigatedFromPage = fromPage;
});
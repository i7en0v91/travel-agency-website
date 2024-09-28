import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger();
  const cacheCleanerLogic = getServerServices()!.getHtmlPageCacheCleaner();

  logger.debug('(api:testing:cache-cleanup) running cache cleanup');
  await cacheCleanerLogic.performCleanup();
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  return {};
}, { logResponseBody: false, authorizedOnly: false, allowedEnvironments: ['test'] });
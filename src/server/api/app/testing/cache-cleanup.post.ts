import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const cacheCleanerLogic = ServerServicesLocator.getHtmlPageCacheCleaner();

  logger.debug('(api:testing:cache-cleanup) running cache cleanup');
  await cacheCleanerLogic.performCleanup();
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  return {};
}, { logResponseBody: false, authorizedOnly: false, allowedEnvironments: ['test'] });
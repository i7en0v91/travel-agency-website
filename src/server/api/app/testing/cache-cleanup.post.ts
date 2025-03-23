import type { H3Event } from 'h3';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../../utils/webapi-event-handler';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getWebApiLogger();
  const cacheCleanerLogic = getServerServices()!.getHtmlPageCacheCleaner();

  logger.debug('running cache cleanup');
  await cacheCleanerLogic.performCleanup();
  
  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  return {};
}, { logResponseBody: false, authorizedOnly: false, allowedEnvironments: ['test'] });
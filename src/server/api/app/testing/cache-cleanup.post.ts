import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { getCommonServices, getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
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
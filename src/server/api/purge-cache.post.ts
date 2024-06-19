import { defineWebApiEventHandler } from '../utils/webapi-event-handler';

export default defineWebApiEventHandler(async () => {
  const htmlPageCacheCleaner = ServerServicesLocator.getHtmlPageCacheCleaner();
  await htmlPageCacheCleaner.purge();
  return {};
}, { logResponseBody: false, authorizedOnly: false });

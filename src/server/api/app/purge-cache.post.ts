import { getServerServices } from '../../../helpers/service-accessors';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';

export default defineWebApiEventHandler(async () => {
  const htmlPageCacheCleaner = getServerServices()!.getHtmlPageCacheCleaner();
  await htmlPageCacheCleaner.purge();
  return {};
}, { logResponseBody: false, authorizedOnly: false });

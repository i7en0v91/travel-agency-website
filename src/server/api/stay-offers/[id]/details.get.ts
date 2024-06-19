import type { H3Event } from 'h3';
import { type EntityId } from './../../../../shared/interfaces';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapStayOffer } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import AppConfig from './../../../../appconfig';
import { extractUserIdFromSession } from './../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn(`(api:stay-details) stay offer id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offerId parameter was not specified',
      'error-page'
    );
  }

  const offerId: EntityId | undefined = offerParam;
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  const stayOffer = await staysLogic.getStayOffer(offerId, userId ?? 'guest');

  handleCacheHeaders(event, AppConfig.caching.htmlPageCachingSeconds ? {
    maxAge: AppConfig.caching.htmlPageCachingSeconds,
  } : {
    cacheControls: ['no-cache']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapStayOffer(stayOffer);
}, { logResponseBody: true, authorizedOnly: false });

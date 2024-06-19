import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type EntityId } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapFlightOffer } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import AppConfig from './../../../../appconfig';
import { extractUserIdFromSession } from './../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn(`(api:flight-details) flight offer id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offerId parameter was not specified',
      'error-page'
    );
  }

  const offerId: EntityId | undefined = offerParam;

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  
  const flight = await flightsLogic.getFlightOffer(offerId, userId ?? 'guest');

  handleCacheHeaders(event, AppConfig.caching.htmlPageCachingSeconds ? {
    maxAge: AppConfig.caching.htmlPageCachingSeconds,
  } : {
    cacheControls: ['no-cache']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapFlightOffer(flight);
}, { logResponseBody: true, authorizedOnly: false });

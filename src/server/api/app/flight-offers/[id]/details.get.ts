import { AppConfig, AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { mapFlightOffer } from '../../../../utils/dto-mappers';
import { getServerSession } from '#auth';
import { getCommonServices, getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger();
  const flightsLogic = getServerServices()!.getFlightsLogic();

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
  
  const flight = await flightsLogic.getFlightOffer(offerId, userId ?? 'guest', event.context.preview.mode);

  handleCacheHeaders(event, 
    (AppConfig.caching.intervalSeconds && !event.context.preview.mode) ? 
      { maxAge: AppConfig.caching.intervalSeconds } : 
      { cacheControls: ['no-cache'] }
  );
  setHeader(event, 'content-type', 'application/json');

  return mapFlightOffer(flight);
}, { logResponseBody: true, authorizedOnly: false });

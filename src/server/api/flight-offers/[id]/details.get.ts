import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type EntityId } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapFlightOffer } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import AppConfig from './../../../../appconfig';

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

  let offerId: number | undefined;
  try {
    offerId = parseInt(offerParam);
  } catch (err: any) {
    logger.warn(`(api:flight-details) failed to parse flight offer id: param=${offerParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse offerId parameter',
      'error-page'
    );
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const flight = await flightsLogic.getFlightOffer(offerId, userId ?? 'guest');

  handleCacheHeaders(event, AppConfig.caching.htmlPageCachingSeconds ? {
    maxAge: AppConfig.caching.htmlPageCachingSeconds,
  } : {
    cacheControls: ['no-cache']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapFlightOffer(flight);
}, { logResponseBody: true, authorizedOnly: false });

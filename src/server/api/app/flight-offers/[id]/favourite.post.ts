import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { type IToggleFavouriteOfferResultDto } from '../../../../api-definitions';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getServerSession } from '#auth';
import { getCommonServices, getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = getCommonServices().getLogger();
  const flightsLogic = getServerServices()!.getFlightsLogic();

  const offerParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerParam) {
    logger.warn(`(api:flight-favourite) flight offer id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offerId parameter was not specified',
      'error-stub'
    );
  }

  const offerId: EntityId | undefined = offerParam;
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if(!userId) {
    logger.warn(`(api:flight-favourite) failed to parse user id: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'cannot obtain user id',
      'error-stub'
    );
  }

  const isFavourite = await flightsLogic.toggleFavourite(offerId, userId);

  setHeader(event, 'content-type', 'application/json');

  const result: IToggleFavouriteOfferResultDto = {
    isFavourite
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });

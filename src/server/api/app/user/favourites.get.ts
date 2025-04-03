import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { IUserFavouritesResultDto } from '../../../api-definitions';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import { getServerSession } from '#auth';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const flightsLogic = serverServices.getFlightsLogic();
  const staysLogic = serverServices.getStaysLogic();

  const authSession = await getServerSession(event);
  const userId: EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can access favourites',
      'error-stub'
    );
  }

  const flightIds = await flightsLogic.getUserFavouriteOffers(userId);
  const stayIds = await staysLogic.getUserFavouriteOffers(userId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });

  setHeader(event, 'content-type', 'application/json');

  const result: IUserFavouritesResultDto = {
    flightIds,
    stayIds
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });

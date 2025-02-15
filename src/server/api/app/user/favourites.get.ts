import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { IUserFavouritesResultDto } from '../../../api-definitions';
import { mapSearchFlightOfferResultEntities, mapSearchedFlightOffer, mapSearchedStayOffer, mapSearchStayOfferResultEntities } from '../../../utils/dto-mappers';
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

  const flightFavourites = await flightsLogic.getUserFavouriteOffers(userId);
  const stayFavourites = await staysLogic.getUserFavouriteOffers(userId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });

  setHeader(event, 'content-type', 'application/json');

  const flightsDto: IUserFavouritesResultDto['flights'] = {
    entities: mapSearchFlightOfferResultEntities(flightFavourites),
    pagedItems: flightFavourites.pagedItems.map((item) => {
      return { ...mapSearchedFlightOffer(item), addTimestamp: item.addDateUtc.getTime() };
    }),
    totalCount: flightFavourites.totalCount
  };

  const staysDto: IUserFavouritesResultDto['stays'] = {
    entities: mapSearchStayOfferResultEntities(stayFavourites),
    pagedItems: stayFavourites.pagedItems.map((item) => {
      return { ...mapSearchedStayOffer(item), addTimestamp: item.addDateUtc.getTime() };
    }),
    totalCount: stayFavourites.totalCount
  };

  const result: IUserFavouritesResultDto = {
    flights: flightsDto,
    stays: staysDto
  };
  return result;
}, { logResponseBody: false, authorizedOnly: true });

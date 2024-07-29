import type { H3Event } from 'h3';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IUserTicketsResultDto } from '../../../dto';
import type { EntityId } from '../../../../shared/interfaces';
import { mapSearchFlightOfferResultEntities, mapSearchedFlightOffer, mapSearchedStayOffer, mapSearchStayOfferResultEntities } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../server/utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const flightsLogic = ServerServicesLocator.getFlightsLogic();
  const staysLogic = ServerServicesLocator.getStaysLogic();

  const authSession = await getServerSession(event);
  const userId: EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can access tickets',
      'error-stub'
    );
  }

  const flightTickets = await flightsLogic.getUserTickets(userId);
  const stayTickets = await staysLogic.getUserTickets(userId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });

  setHeader(event, 'content-type', 'application/json');

  const flightsDto: IUserTicketsResultDto['flights'] = {
    entities: mapSearchFlightOfferResultEntities(flightTickets),
    pagedItems: flightTickets.pagedItems.map((item) => {
      return { ...mapSearchedFlightOffer(item), bookedTimestamp: item.bookDateUtc.getTime(), bookingId: item.bookingId };
    }),
    totalCount: flightTickets.totalCount
  };

  const staysDto: IUserTicketsResultDto['stays'] = {
    entities: mapSearchStayOfferResultEntities(stayTickets),
    pagedItems: stayTickets.pagedItems.map((item) => {
      return { ...mapSearchedStayOffer(item), bookedTimestamp: item.bookDateUtc.getTime(), bookingId: item.bookingId };
    }),
    totalCount: stayTickets.totalCount
  };

  const result: IUserTicketsResultDto = {
    flights: flightsDto,
    stays: staysDto
  };
  return result;
}, { logResponseBody: false, authorizedOnly: true });

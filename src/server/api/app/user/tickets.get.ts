import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type IUserTicketsResultDto } from '../../../api-definitions';
import { mapSearchFlightOfferResultEntities, mapSearchedFlightOffer, mapSearchedStayOffer, mapSearchStayOfferResultEntities } from '../../../utils/dto-mappers';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import type { H3Event } from 'h3';
import { getServerSession } from '#auth';
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

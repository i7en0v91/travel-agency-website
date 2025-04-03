import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import type { IUserTicketDto, IUserTicketsResultDto } from '../../../api-definitions';
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

  const flightsDto: IUserTicketDto[] = flightTickets.pagedItems.map((i) => { 
    return {
      offerId: i.id,
      bookedTimestamp: i.bookDateUtc.getTime(),
      bookingId: i.bookingId
    };
  });

  const staysDto: IUserTicketDto[] = stayTickets.pagedItems.map((i) => { 
    return {
      offerId: i.id,
      bookedTimestamp: i.bookDateUtc.getTime(),
      bookingId: i.bookingId
    };
  });

  const result: IUserTicketsResultDto = {
    flights: flightsDto,
    stays: staysDto
  };
  return result;
}, { logResponseBody: false, authorizedOnly: true });

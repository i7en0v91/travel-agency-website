import { type IStayOfferDetails, type IFlightOffer, type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = getWebApiLogger();
  const bookingLogic = serverServices.getBookingLogic();

  const bookingParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!bookingParam) {
    logger.warn('booking id paramer was not speicifed', undefined, { path: event.path });
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'booking id parameter was not specified',
      'error-page'
    );
  }

  const bookingId: EntityId | undefined = bookingParam;
  const booking = await bookingLogic.getBooking(bookingId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return booking.offer.kind === 'flights' ? 
    mapFlightOffer(booking.offer as IFlightOffer) : 
    { 
      ...mapStayOffer(booking.offer as IStayOfferDetails), 
      reviewSummary: (booking.offer as IStayOfferDetails).stay.reviewSummary  
    };
}, { logResponseBody: true, authorizedOnly: false });

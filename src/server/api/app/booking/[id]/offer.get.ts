import { type EntityId, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../../utils/webapi-event-handler';
import type { H3Event } from 'h3';
import { getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = serverServices.getLogger().addContextProps({ component: 'WebApi' });
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
  const offer = await bookingLogic.getBooking(bookingId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  const bookingDto = mapBooking(offer);
  return bookingDto.flightOffer ?? bookingDto.stayOffer;
}, { logResponseBody: true, authorizedOnly: false });

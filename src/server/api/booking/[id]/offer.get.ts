import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import AppConfig from './../../../../appconfig';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const bookingLogic = ServerServicesLocator.getBookingLogic();

  const bookingParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!bookingParam) {
    logger.warn(`(api:booking-offer) booking id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'booking id parameter was not specified',
      'error-page'
    );
  }

  let bookingId: number | undefined;
  try {
    bookingId = parseInt(bookingParam);
  } catch (err: any) {
    logger.warn(`(api:booking-offer) failed to parse booking id: param=${bookingParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse booking id parameter',
      'error-page'
    );
  }

  const offer = await bookingLogic.getBooking(bookingId);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  const bookingDto = mapBooking(offer);
  return bookingDto.flightOffer ?? bookingDto.stayOffer;
}, { logResponseBody: true, authorizedOnly: false });

import type { H3Event } from 'h3';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type EntityId } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { mapBooking } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../utils/auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const bookingLogic = ServerServicesLocator.getBookingLogic();

  const bookingParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!bookingParam) {
    logger.warn(`(api:booking-details) booking id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'booking id parameter was not specified',
      'error-page'
    );
  }

  const bookingId: EntityId | undefined = bookingParam;
  const booking = await bookingLogic.getBooking(bookingId);
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  if (!userId || (booking.bookedUser.id !== userId)) {
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'access to the booking is forbidden',
      'error-page'
    );
  }

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapBooking(booking);
}, { logResponseBody: true, authorizedOnly: false });

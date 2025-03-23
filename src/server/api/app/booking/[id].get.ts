import { AppException, AppExceptionCodeEnum, type EntityId } from '@golobe-demo/shared';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../../utils/webapi-event-handler';
import { mapBooking } from '../../../utils/dto-mappers';
import { extractUserIdFromSession } from './../../../utils/auth';
import type { H3Event } from 'h3';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../helpers/service-accessors';

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

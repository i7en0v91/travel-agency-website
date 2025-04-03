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
  const userLogic = serverServices.getUserLogic();
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
  if (!userId || (booking.userId !== userId)) {
    logger.warn('cannot obtain complete booking info - access is forbidden', undefined, { path: event.path, userId, bookingUserId: booking.userId  });
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'access to the booking is forbidden',
      'error-page'
    );
  }

  const userInfo = await userLogic.getUser(userId, 'profile', event);
  if(!userInfo) {
    logger.warn('cannot obtain complete booking info - user not found', undefined, { path: event.path, userId });
    throw new AppException(
      AppExceptionCodeEnum.OBJECT_NOT_FOUND,
      'user not found',
      'error-page'
    );
  }

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapBooking(booking, userInfo);
}, { logResponseBody: true, authorizedOnly: false });

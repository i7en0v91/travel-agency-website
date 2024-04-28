import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type EntityId } from '../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { mapBooking } from '../../utils/mappers';
import AppConfig from './../../../appconfig';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const bookingLogic = ServerServicesLocator.getBookingLogic();

  const skipAuthChecks = (parseInt(getQuery(event)?.skipAuthChecks?.toString() ?? '0') === 1) && !AppConfig.ogImage.enforceAuthChecks;

  const bookingParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!bookingParam) {
    logger.warn(`(api:booking-details) booking id paramer was not speicifed: path=${event.path}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'booking id parameter was not specified',
      'error-page'
    );
  }

  let bookingId: EntityId | undefined;
  try {
    bookingId = parseInt(bookingParam);
  } catch (err: any) {
    logger.warn(`(api:booking-details) failed to parse booking id: param=${bookingParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse booking id parameter',
      'error-page'
    );
  }

  const booking = await bookingLogic.getBooking(bookingId);
  if (!skipAuthChecks) {
    const authSession = await getServerSession(event);
    let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
    if (userId && isString(userId)) {
      userId = parseInt(userId);
    }

    if (!userId || (booking.bookedUser.id !== userId)) {
      throw new AppException(
        AppExceptionCodeEnum.FORBIDDEN,
        'access to the booking is forbidden',
        'error-page'
      );
    }
  }

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/json');

  return mapBooking(booking);
}, { logResponseBody: true, authorizedOnly: false });

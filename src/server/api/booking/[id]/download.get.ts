import { Readable } from 'stream';
import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type Locale, type Theme } from '../../../../shared/constants';
import { type EntityId, type DocumentCommonParams } from '../../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { validateObject } from '../../../../shared/validation';
import { BookingDownloadQuerySchema } from './../../../dto';
import { getServerSession } from '#auth';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const bookingLogic = ServerServicesLocator.getBookingLogic();
  const documentCreator = ServerServicesLocator.getDocumentCreator();

  const bookingParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!bookingParam) {
    logger.warn(`(api:booking-download) booking id paramer was not speicifed: path=${event.path}`);
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
    logger.warn(`(api:booking-download) failed to parse booking id: param=${bookingParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse booking id parameter',
      'error-page'
    );
  }

  const query = getQuery(event);
  const validationError = validateObject(query, BookingDownloadQuerySchema);
  if (validationError) {
    logger.warn(`(api:booking-download) booking download query does not match schema, url=${event.node.req.url}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, undefined, query);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'booking download query arguments has invalid format', 'error-stub');
  }
  const requestParams = BookingDownloadQuerySchema.cast(query);

  const booking = await bookingLogic.getBooking(bookingId);
  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  if (booking.bookedUser.id !== userId) {
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'access to the booking is forbidden',
      'error-page'
    );
  }

  const documentParams: DocumentCommonParams = {
    locale: requestParams.locale as Locale,
    theme: requestParams.theme as Theme
  };
  const docBytes = await documentCreator.getBookingTicket(booking, documentParams, event);

  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/pdf');
  setHeader(event, 'content-length', docBytes.length);
  setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive');

  return await sendStream(event, Readable.from(docBytes));
}, { logResponseBody: false, authorizedOnly: true });

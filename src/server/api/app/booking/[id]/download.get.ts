import { QueryPagePreviewModeParam, validateObject, AppException, AppExceptionCodeEnum, type DocumentCommonParams, type EntityId, type Locale, type Theme } from '@golobe-demo/shared';
import { BookingDownloadQuerySchema } from '../../../../api-definitions';
import { extractUserIdFromSession } from './../../../../../server/utils/auth';
import { getBytes } from './../../../../../helpers/rest-utils';
import { Readable } from 'stream';
import type { H3Event } from 'h3';
import omit from 'lodash-es/omit';
import { defineWebApiEventHandler, getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';
import { getServerSession } from '#auth';
import { getServerServices } from '../../../../../helpers/service-accessors';

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = getWebApiLogger();
  const bookingLogic = serverServices.getBookingLogic();
  const documentCreator = serverServices.getDocumentCreator();

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
  const query = getQuery(event);
  const validationError = await validateObject(omit(query, QueryPagePreviewModeParam), BookingDownloadQuerySchema);
  if (validationError) {
    logger.warn('booking download query does not match schema', undefined, { ...(query), ...{ url: event.node.req.url, msg: validationError.message } });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'booking download query arguments has invalid format', 'error-stub');
  }
  const requestParams = BookingDownloadQuerySchema.cast(query);

  const booking = await bookingLogic.getBooking(bookingId);
  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);

  if (booking.bookedUser.id !== userId) {
    logger.warn('user has no access to booking', undefined, { ...(query), ...{ url: event.node.req.url, bookedUserId: booking.bookedUser.id, authUserId: userId } });
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
  
  const imageDownloadFn = (url: string, query: any): Promise<Buffer | undefined> => getBytes(url, query, undefined, 'no-store', true, event, 'throw');
  const docBytes = await documentCreator.getBookingTicket(booking, documentParams, imageDownloadFn, event);
  
  handleCacheHeaders(event, {
    cacheControls: ['no-store']
  });
  setHeader(event, 'content-type', 'application/pdf');
  setHeader(event, 'content-length', docBytes.length);
  setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive');

  return await sendStream(event, Readable.from(docBytes));
}, { logResponseBody: false, authorizedOnly: true });

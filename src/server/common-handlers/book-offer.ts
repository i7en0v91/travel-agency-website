import { type IOfferBookingData, AvailableStayServiceLevel, type EntityId, type OfferKind, type StayServiceLevel, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../server/utils/webapi-event-handler';
import type { IBookingResultDto } from '../../server/api-definitions';
import { extractUserIdFromSession } from '../../server/utils/auth';
import type { H3Event } from 'h3';
import { getServerSession } from '#auth';
import { getServerServices } from '../../helpers/service-accessors';

const defineBookOfferWebApiHandler = (offerKind: OfferKind) => defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = serverServices.getLogger();
  const bookingLogic = serverServices.getBookingLogic();

  const offerIdParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerIdParam) {
    logger.warn(`(api:book-offer) offer id paramer was not speicifed: path=${event.path}, kind=${offerKind}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offer id parameter was not specified',
      'error-stub'
    );
  }

  const offerId: EntityId | undefined = offerIdParam;
  if(!offerId) {
    logger.warn(`(api:book-offer) offer id parameter is not specified: param=${offerIdParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offer id parameter not specified',
      'error-stub'
    );
  }

  let serviceLevel: StayServiceLevel | undefined;
  if (offerKind === 'stays') {
    serviceLevel = ((getQuery(event).serviceLevel)?.toString() ?? '').trim() as StayServiceLevel;
    if (!AvailableStayServiceLevel.includes(serviceLevel)) {
      logger.warn(`(api:book-offer) failed to parse service level query parameter: serviceLevel=${serviceLevel}, offerId=${offerId}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid service level argument', 'error-stub');
    }
  }

  const authSession = await getServerSession(event);
  const userId : EntityId | undefined = extractUserIdFromSession(authSession);
  if (!userId) {
    logger.warn(`(api:book-offer) unauthorized attempt: offerId=${offerId}`);
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can book offers',
      'error-stub'
    );
  }

  const offerBookingData: IOfferBookingData = {
    offerId,
    bookedUserId: userId,
    kind: offerKind,
    serviceLevel
  };
  const bookingId = await bookingLogic.createBooking(offerBookingData);

  handleCacheHeaders(event, {
    cacheControls: ['no-cache'],
    maxAge: 0
  });
  setHeader(event, 'content-type', 'application/json');

  const result: IBookingResultDto = {
    bookingId
  };
  return result;
}, { logResponseBody: true, authorizedOnly: true });

export default defineBookOfferWebApiHandler;

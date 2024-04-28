import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import { defineWebApiEventHandler } from '../utils/webapi-event-handler';
import { type EntityId, type IOfferBookingData, type OfferKind, type StayServiceLevel } from '../../shared/interfaces';
import { type IBookingResultDto } from '../dto';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { getServerSession } from '#auth';

const defineBookOfferWebApiHandler = (offerKind: OfferKind) => defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const bookingLogic = ServerServicesLocator.getBookingLogic();

  const offerIdParam = getRouterParams(event)?.id?.toString() ?? '';
  if (!offerIdParam) {
    logger.warn(`(api:book-offer) offer id paramer was not speicifed: path=${event.path}, kind=${offerKind}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'offer id parameter was not specified',
      'error-stub'
    );
  }

  let offerId: EntityId | undefined;
  try {
    offerId = parseInt(offerIdParam);
  } catch (err: any) {
    logger.warn(`(api:book-offer) failed to parse offer id: param=${offerIdParam}`);
    throw new AppException(
      AppExceptionCodeEnum.BAD_REQUEST,
      'failed to parse offer id parameter',
      'error-stub'
    );
  }

  let serviceLevel: StayServiceLevel | undefined;
  if (offerKind === 'stays') {
    serviceLevel = ((getQuery(event).serviceLevel)?.toString() ?? '').trim() as StayServiceLevel;
    if (!['base', 'cityView-1', 'cityView-2', 'cityView-3'].includes(serviceLevel)) {
      logger.warn(`(api:book-offer) failed to parse service level query parameter: serviceLevel=${serviceLevel}, offerId=${offerId}`);
      throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid service level argument', 'error-stub');
    }
  }

  const authSession = await getServerSession(event);
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (!userId) {
    logger.warn(`(api:book-offer) unauthorized attempt: offerId=${offerId}`);
    throw new AppException(
      AppExceptionCodeEnum.FORBIDDEN,
      'only authorized users can book offers',
      'error-stub'
    );
  }

  if (isString(userId)) {
    userId = parseInt(userId);
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

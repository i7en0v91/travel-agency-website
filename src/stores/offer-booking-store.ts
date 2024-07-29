import isObject from 'lodash-es/isObject';
import type { UnwrapRef, WatchStopHandle } from 'vue';
import type { H3Event } from 'h3';
import { type ReviewSummary, type StayServiceLevel, type EntityDataAttrsOnly, type EntityId, type OfferKind, type IOfferBooking, type IFlightOffer, type IStayOfferDetails } from '../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { ApiEndpointBookingDetails, ApiEndpointFlightOfferBook, ApiEndpointFlightOfferDetails, ApiEndpointStayOfferBook, ApiEndpointStayOfferDetails, ApiEndpointStayOfferReviewSummary, TemporaryEntityId } from './../shared/constants';
import type { IUserAccount } from './user-account-store';
import { getObject, post } from './../shared/rest-utils';
import { mapFlightOfferDetails, mapStayOfferDetails, mapBookingDetails, mapReviewSummary } from './../shared/mappers';
import { type IAppLogger } from './../shared/applogger';
import type { IBookingDetailsDto, IBookingResultDto, IFlightOfferDetailsDto, IReviewSummaryDto, IStayOfferDetailsDto } from './../server/dto';

declare type NewBookingId = typeof TemporaryEntityId;
export type BookingStoreItem<TOffer extends IFlightOffer | IStayOfferDetails> = Omit<EntityDataAttrsOnly<IOfferBooking<TOffer>>, 'id' | 'bookedUser'> & { id: EntityId | NewBookingId } & Partial<Pick<IOfferBooking<TOffer>, 'bookedUser'>>;

export interface IOfferBookingStore<TOffer extends IFlightOffer | IStayOfferDetails> {
  bookingId: EntityId | NewBookingId,
  offerKind: OfferKind,
  status: 'pending' | 'success' | 'error',
  offerId?: EntityId | undefined,
  serviceLevel?: TOffer extends IStayOfferDetails ? StayServiceLevel : undefined,
  booking?: BookingStoreItem<TOffer> | undefined,
  store: () => Promise<EntityId>
}

interface IOfferBookingStoreInternal<TOffer extends IFlightOffer | IStayOfferDetails> extends IOfferBookingStore<TOffer> {
  onSignOut: () => void,
  fetchOffer: () => Promise<void>
}

declare type OfferBookingStoreInternalRef<TOffer extends IFlightOffer | IStayOfferDetails> = ReturnType<typeof reactive<IOfferBookingStoreInternal<TOffer>>>;
export interface IOfferBookingStoreFactory {
  createNewBooking: <TOffer extends IFlightOffer | IStayOfferDetails, TServiceLevel extends (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined) = (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined)>(offer: EntityId | IOfferBooking<TOffer>['offer'], kind: TOffer['kind'], serviceLevel: TServiceLevel) => Promise<OfferBookingStoreInternalRef<TOffer>>,
  getUserBooking: (bookingId: EntityId, isOgImageRequest: boolean, event?: H3Event) => Promise<OfferBookingStoreInternalRef<IFlightOffer | IStayOfferDetails>>
}

async function sendFetchBookingRequest (bookingId: EntityId, skipAuthChecks: boolean, logger: IAppLogger, event?: H3Event): Promise<BookingStoreItem<IFlightOffer | IStayOfferDetails>> {
  logger.debug(`(offer-booking-store) sending fetch booking HTTP request, bookingId=${bookingId}, skipAuthChecks=${skipAuthChecks}`);

  const resultDto = await getObject<IBookingDetailsDto>(`/${ApiEndpointBookingDetails(bookingId)}`, undefined, 'no-store', true, event, 'throw');
  if (!resultDto) {
    logger.warn(`(offer-booking-store) exception occured while sending fetch booking HTTP request, bookingId=${bookingId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  const result = mapBookingDetails(resultDto);

  logger.debug(`(offer-booking-store) fetch booking HTTP request completed, bookingId=${bookingId}, offerId=${result.offer.id}, kind=${result.offer.kind}, bookedUserId=${result.bookedUser.id}`);
  return result;
}

async function sendFetchStayOfferReviewSummaryRequest(offerId: EntityId, logger: IAppLogger, event?: H3Event): Promise<ReviewSummary> {
  logger.debug(`(offer-booking-store) sending fetch stay review summary HTTP request, offerId=${offerId}`);

  const resultDto = await getObject<IReviewSummaryDto>(`/${ApiEndpointStayOfferReviewSummary(offerId)}`, undefined, 'no-store', false, event, 'throw');
  if (!resultDto) {
    logger.warn(`(offer-booking-store) exception occured while sending fetch stay review summary HTTP request, offerId=${offerId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  const result = mapReviewSummary(resultDto);

  logger.debug(`(offer-booking-store) fetch stay review summary HTTP request completed, offerId=${offerId}`);
  return result;
}

async function sendFetchOfferRequest<TOffer extends IFlightOffer | IStayOfferDetails> (offerId: EntityId, kind: OfferKind, logger: IAppLogger, event?: H3Event): Promise<EntityDataAttrsOnly<TOffer>> {
  logger.debug(`(offer-booking-store) sending fetch offer HTTP request, offerId=${offerId}, kind=${kind}`);

  const url = kind === 'flights' ? `/${ApiEndpointFlightOfferDetails(offerId)}` : `/${ApiEndpointStayOfferDetails(offerId)}`;
  const resultDto = await getObject(url, undefined, 'default', false, undefined, 'default');
  if (!resultDto) {
    logger.warn(`(offer-booking-store) exception occured while sending get HTTP request, offerId=${offerId}, kind=${kind}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }
  
  let reviewSummary: ReviewSummary | undefined;
  if(kind === 'stays') {
    reviewSummary = await sendFetchStayOfferReviewSummaryRequest(offerId, logger, event);
  }

  const result = kind === 'flights'
    ? mapFlightOfferDetails(resultDto as IFlightOfferDetailsDto) as EntityDataAttrsOnly<IFlightOffer>
    : mapStayOfferDetails(resultDto as IStayOfferDetailsDto, reviewSummary!) as EntityDataAttrsOnly<IStayOfferDetails>;

  logger.debug(`(offer-booking-store) fetch offer HTTP request completed, offerId=${offerId}, kind=${kind}`);
  return (result as any) as EntityDataAttrsOnly<TOffer>;
}

async function sendBookOfferRequest (offerId: EntityId, kind: OfferKind, userId: EntityId, serviceLevel: StayServiceLevel | undefined, logger: IAppLogger, event?: H3Event): Promise<EntityId> {
  logger.verbose(`(offer-booking-store) sending create booking HTTP request, offerId=${offerId}, kind=${kind}, userId=${userId}, serviceLevel=${serviceLevel}`);

  const url = kind === 'flights' ? `/${ApiEndpointFlightOfferBook(offerId)}` : `/${ApiEndpointStayOfferBook(offerId)}`;
  const resultDto = await post(url, serviceLevel ? { serviceLevel } : undefined, undefined, undefined, true, event, 'default');
  if (!resultDto) {
    logger.warn(`(offer-booking-store) exception occured while sending create booking HTTP request, offerId=${offerId}, kind=${kind}, userId=${userId}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
  }

  const bookingId = (resultDto as IBookingResultDto).bookingId;

  logger.debug(`(offer-booking-store) create booking HTTP request completed, offerId=${offerId}, kind=${kind}, userId=${userId}, bookingId=${bookingId}`);
  return bookingId;
}

export async function useOfferBookingStoreFactory() {
  const userAccountStore = useUserAccountStore();
  const { status } = useAuth();
  const nuxtApp = useNuxtApp();
  
  if(import.meta.server) {
    await userAccountStore.getUserAccount();
  }

  return defineStore('offer-booking-store-factory', () => {
    const allInstances = new Map<EntityId | NewBookingId, OfferBookingStoreInternalRef<any>>();
    const logger = CommonServicesLocator.getLogger();
  
    let userAccount: IUserAccount | undefined;
    let userAccountStopWatch: WatchStopHandle;
    let lastUserId: EntityId | undefined;
    const getUserAccount = async (): Promise<void> => {
      logger.verbose('(offer-booking-store) initializing user account state');
      userAccount = await userAccountStore.getUserAccount();
      lastUserId = userAccount?.userId;
      if (import.meta.client) {
        if (userAccountStopWatch) {
          userAccountStopWatch();
        }
        logger.debug('(offer-booking-store) stating to watch for user account data change');
        userAccountStopWatch = watch(userAccount, () => {
          const changedUserId = lastUserId ?? userAccount?.userId;
          logger.info(`(offer-booking-store) user account data changed, changed userId=${changedUserId}`);
  
          const instances = [...allInstances.values()];
          for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            if (changedUserId && instance.booking?.bookedUser?.id === changedUserId) {
              instance.booking.bookedUser = {
                id: changedUserId,
                firstName: userAccount!.firstName,
                lastName: userAccount!.lastName,
                avatar: userAccount!.avatar
              };
            }
            if (status.value === 'unauthenticated') {
              instances[i].onSignOut();
            }
          }
          allInstances.delete(TemporaryEntityId);
          lastUserId = userAccount?.userId;
        });
      }
    };
    getUserAccount();
  
    const createInstance = async <TOffer extends IFlightOffer | IStayOfferDetails, TServiceLevel extends (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined) = (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined)>(initialBookingId: EntityId | NewBookingId, offer: EntityId | EntityDataAttrsOnly<TOffer>, kind: TOffer['kind'], serviceLevel: TServiceLevel, bookedUser: Pick<IOfferBooking<TOffer>, 'bookedUser'>['bookedUser'] | undefined): Promise<OfferBookingStoreInternalRef<TOffer>> => {
      logger.verbose(`(offer-booking-store) creating instance, offer=${isObject(offer) ? `${offer.id} [object]` : offer}, kind=${kind}, serviceLevel=${serviceLevel}, bookedUserId=${bookedUser?.id}, initialBookingId=${initialBookingId}`);
  
      const offerId = isObject(offer) ? offer.id : offer;
      const result: OfferBookingStoreInternalRef<TOffer> = reactive({
        bookingId: initialBookingId,
        offerId,
        offerKind: kind,
        serviceLevel,
        status: isObject(offer) ? 'success' : 'pending',
        booking: isObject(offer)
          ? {
              id: initialBookingId,
              offer,
              bookedUser: initialBookingId === TemporaryEntityId ? undefined : bookedUser,
              serviceLevel: serviceLevel as any
            }
          : undefined,
        fetchOffer: async (): Promise<void> => {
          logger.verbose(`(offer-booking-store) fetch offer, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
  
          result.status = 'pending';
          let fetchedOffer: EntityDataAttrsOnly<TOffer> | undefined;
          try {
            fetchedOffer = await sendFetchOfferRequest<TOffer>(offerId, kind, logger, nuxtApp?.ssrContext?.event);
            if (!fetchedOffer) {
              logger.warn(`(offer-booking-store) fetch offer - failed, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
              result.status = 'error';
              return;
            }
  
            if (result.booking) {
              result.booking.offer = fetchedOffer as UnwrapRef<EntityDataAttrsOnly<TOffer>>;
            } else {
              logger.debug(`(offer-booking-store) initializing booking on fetch offer complete, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
              result.booking = {
                id: TemporaryEntityId,
                offer: fetchedOffer as UnwrapRef<EntityDataAttrsOnly<TOffer>>,
                bookedUser: undefined,
                serviceLevel: serviceLevel as any
              };
            }
  
            logger.verbose(`(offer-booking-store) fetch offer - completed, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
            result.status = 'success';
          } catch (err: any) {
            result.status = 'error';
            logger.warn(`(offer-booking-store) failed to fetch offer data, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`, err);
          }
        },
        store: async (): Promise<EntityId> => {
          logger.verbose(`(offer-booking-store) saving booking on server, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
  
          if (result.bookingId !== TemporaryEntityId) {
            logger.debug(`(offer-booking-store) skipping store, already saved, bookingId=${result.bookingId}, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
            return result.bookingId;
          }
  
          if (!result.booking) {
            logger.warn(`(offer-booking-store) cannot process book operation, store is not initialized offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
            throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'booking is not initialized', 'error-stub');
          }
  
          if (status.value !== 'authenticated') {
            logger.warn(`(offer-booking-store) cannot create booking, user must be authneticated, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
            throw new AppException(AppExceptionCodeEnum.FORBIDDEN, 'only authenticated users can book offers', 'error-stub');
          }
  
          if (!userAccount) {
            try {
              await getUserAccount();
            } catch (err: any) {
              logger.warn(`(offer-booking-store) failed to acquire current user account data, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`, err);
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain user information', 'error-stub');
            }
          }
  
          result.status = 'pending';
          let bookingId: EntityId | undefined;
          try {
            const userId = userAccount!.userId!;
            bookingId = await sendBookOfferRequest(result.offerId!, kind, userId, result.serviceLevel, logger, nuxtApp?.ssrContext?.event);
  
            result.bookingId = bookingId;
            result.booking.bookedUser = {
              id: userId,
              avatar: userAccount!.avatar,
              firstName: userAccount!.firstName ?? '',
              lastName: userAccount!.lastName ?? ''
            };
  
            const temporaryBooking = allInstances.get(TemporaryEntityId);
            if (temporaryBooking?.offerId === offerId && temporaryBooking?.offerKind === kind) {
              allInstances.delete(TemporaryEntityId);
            }
            allInstances.set(bookingId, result as OfferBookingStoreInternalRef<any>);
            result.booking.id = bookingId;
  
            result.status = 'success';
          } catch (err: any) {
            logger.warn(`(offer-booking-store) failed to create booking on server, offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`, err);
            result.status = 'error';
            throw err;
          }
  
          logger.info(`(offer-booking-store) booking created: offerId=${result.offerId}, kind=${kind}, serviceLevel=${serviceLevel}, bookingId=${bookingId}`);
          return bookingId;
        },
        onSignOut: () => {
          logger.debug(`(offer-booking-store) user sign out handler, offerId=${result.offerId}, kind=${kind}, userId=${userAccount?.userId}, initialBookingId=${initialBookingId}`);
          if (result.booking?.bookedUser) {
            logger.verbose(`(offer-booking-store) sign out, resetting to new booking, bookingId=${result.booking.id}, offerId=${result.offerId}, kind=${kind}, userId=${result.booking.bookedUser.id}`);
            result.booking.id = TemporaryEntityId;
            result.booking.bookedUser = undefined;
          }
        }
      });
  
      if (!result.booking || !result.booking.offer) {
        await result.fetchOffer();
      }
  
      logger.verbose(`(offer-booking-store) instance created, offer=${isObject(offer) ? `${offer.id} [object]` : offer}, kind=${kind}, serviceLevel=${serviceLevel}, initialBookingId=${initialBookingId}`);
      return result;
    };
  
    const getOrCreateNewBooking = async <TOffer extends IFlightOffer | IStayOfferDetails, TServiceLevel extends (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined) = (TOffer extends IStayOfferDetails ? StayServiceLevel : undefined)>(offer: EntityId | EntityDataAttrsOnly<TOffer>, kind: TOffer['kind'], serviceLevel: TServiceLevel): Promise<OfferBookingStoreInternalRef<TOffer>> => {
      logger.debug(`(offer-booking-store) getOrCreateNewBooking, offerId=${isObject(offer) ? offer.id : offer}, kind=${kind}, serviceLevel=${serviceLevel}`);
  
      const offerId = (isObject(offer) ? offer.id : offer) as EntityId;
      const temporaryBooking = allInstances.get(TemporaryEntityId);
      if (temporaryBooking && temporaryBooking?.offerId === offerId && temporaryBooking?.offerKind === kind) {
        if (kind !== 'stays' || (serviceLevel === temporaryBooking.serviceLevel)) {
          logger.debug(`(offer-booking-store) getOrCreateNewBooking - returning temporary instance, offerId=${offerId}, kind=${kind}, serviceLevel=${serviceLevel}`);
          return temporaryBooking as OfferBookingStoreInternalRef<TOffer>;
        }
      }
  
      logger.verbose(`(offer-booking-store) getOrCreateNewBooking - creating new, offerId=${isObject(offer) ? offer.id : offer}, kind=${kind}, serviceLevel=${serviceLevel}`);
      const newBooking = (await createInstance(TemporaryEntityId, offer, kind, serviceLevel, undefined)) as OfferBookingStoreInternalRef<TOffer>;
      allInstances.set(TemporaryEntityId, newBooking as OfferBookingStoreInternalRef<any>);
      return newBooking;
    };
  
    const getUserBooking = async (bookingId: EntityId, isOgImageRequest: boolean, event?: H3Event): Promise<OfferBookingStoreInternalRef<IFlightOffer | IStayOfferDetails>> => {
      logger.debug(`(offer-booking-store) get user booking, bookingId=${bookingId}, isOgImageRequest=${isOgImageRequest}, event=${!!event}`);
      if (bookingId === TemporaryEntityId || !bookingId) {
        logger.warn(`(offer-booking-store) get user booking - invalid booking id, bookingId=${bookingId}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected error', 'error-page');
      }
  
      const existingInstance = allInstances.get(bookingId);
      if (existingInstance) {
        logger.debug(`(offer-booking-store) get user booking - returning existing instance, bookingId=${bookingId}, offerId=${existingInstance.offerId}, kind=${existingInstance.offerKind}, userId=${existingInstance.booking?.bookedUser?.id}`);
        return existingInstance as OfferBookingStoreInternalRef<IFlightOffer | IStayOfferDetails>;
      }
  
      logger.verbose(`(offer-booking-store) get user booking - fetching booking details, bookingId=${bookingId}, isOgImageRequest=${isOgImageRequest}`);
      const fetchedBooking = await sendFetchBookingRequest(bookingId, isOgImageRequest, logger, event);
      const fetchedServiceLevel = fetchedBooking.serviceLevel;
      if (!fetchedBooking) {
        logger.warn(`(offer-booking-store) fetch booking - failed, bookingId=${bookingId}, isOgImageRequest=${isOgImageRequest})`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to fetch booking details', 'error-page');
      }
  
      const instance = await createInstance(bookingId, fetchedBooking.offer, fetchedBooking.offer.kind, fetchedServiceLevel, fetchedBooking.bookedUser);
      allInstances.set(bookingId, instance);
  
      logger.debug(`(offer-booking-store) get user booking - completed, bookingId=${bookingId}, offerId=${instance.offerId}, kind=${instance.offerKind}, serviceLevel=${instance.serviceLevel}, isOgImageRequest=${isOgImageRequest})`);
      return instance;
    };
  
    logger.verbose('(offer-booking-store) factory created');
    const result: IOfferBookingStoreFactory = {
      createNewBooking: getOrCreateNewBooking,
      getUserBooking
    };
    return result;
  })();  
};
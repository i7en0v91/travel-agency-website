import { AppException, AppExceptionCodeEnum, type IAppLogger, type OfferKind, type EntityId, type IFlightOffer, type IStayOffer, type EntityDataAttrsOnly } from '@golobe-demo/shared';
import { type IToggleFavouriteOfferResultDto, type IUserFavouritesResultDto, ApiEndpointStayOfferFavourite, ApiEndpointFlightOfferFavourite, ApiEndpointUserFavourites } from './../server/api-definitions';
import { mapUserFavouriteOffersResult } from './../helpers/entity-mappers';
import { getObject, post } from './../helpers/rest-utils';
import type { NuxtApp } from 'nuxt/app';
import { getCommonServices } from '../helpers/service-accessors';

export type UserFavouriteStoreItem = EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>;

export interface IUserFavouritesStore {
  status: 'pending' | 'success' | 'error',
  items: UserFavouriteStoreItem[],
  fetchFavourites: () => Promise<void>,
  toggleFavourite: <TOfferKind extends OfferKind, TOffer extends (EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { kind: TOfferKind }>(offerId: EntityId, kind: TOfferKind, offer?: TOffer) => Promise<boolean>
}
declare type UserFavouritesStoreRef = ReturnType<typeof reactive<IUserFavouritesStore>>;
interface IUserFavouritesStoreInternal extends IUserFavouritesStore {
  onSignOut: () => void
}

declare type UserFavouritesStoreInternalRef = ReturnType<typeof reactive<IUserFavouritesStoreInternal>>;
export interface IUserFavouritesStoreFactory {
  getInstance: () => Promise<UserFavouritesStoreRef>;
}

export const useUserFavouritesStore = defineStore('userFavouritesStore', () => {
  const logger = getCommonServices().getLogger();
  let instance: UserFavouritesStoreInternalRef | undefined;

  const userAccountStore = useUserAccountStore();
  let userAccount: IUserAccount | undefined;

  const { status } = useAuth();

  const ensureUserAccount = async (): Promise<void> => {
    // logger.verbose('(user-favourites-store) ensuring user account');

    const isAuthenticated = status.value === 'authenticated';
    if (!isAuthenticated) {
      // logger.warn('(user-favourites-store) user is unauthenticated');
      throw new AppException(AppExceptionCodeEnum.UNAUTHENTICATED, 'user is unauthneticated', 'error-stub');
    }

    if (!userAccount) {
      try {
        userAccount = await userAccountStore.getUserAccount();
      } catch (err: any) {
        // logger.warn('(user-favourites-store) cannot obtain user account data', err);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot obtain user account data', 'error-stub');
      }
    }

    // logger.verbose(`(user-favourites-store) user account ensured, userId=${userAccount?.userId}`);
  };

  async function sendFetchFavouritesRequest (logger: IAppLogger): Promise<UserFavouriteStoreItem[]> {
    // logger.debug(`(user-favourites-store) sending get HTTP request, userId=${userAccount?.userId}`);
    if(import.meta.server) { 
      // ensuring user data won't be added into html payload
      // logger.warn(`(user-favourites-store) fetching user favourites data is not available on server, userId=${userAccount?.userId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'operation not available', 'error-page');
    }

    const resultDto = await getObject(`/${ApiEndpointUserFavourites}`, undefined, 'no-store', true, undefined, 'default') as IUserFavouritesResultDto;
    if (!resultDto) {
      // logger.warn(`(user-favourites-store) exception occured while sending get HTTP request, userId=${userAccount?.userId}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected HTTP request error', 'error-stub');
    }

    const result: UserFavouriteStoreItem[] = mapUserFavouriteOffersResult(resultDto);
    // logger.debug(`(user-favourites-store) get HTTP request completed, userId=${userAccount?.userId}, count=${result.length}`);
    return result;
  }

  async function getFavouriteItems (nuxtApp: NuxtApp, logger: IAppLogger): Promise<UserFavouriteStoreItem[] | undefined> {
    // logger.verbose(`(user-favourites-store) get favourite items, userId=${userAccount?.userId}`);
    let favouriteItems: UserFavouriteStoreItem[] | undefined;
    try {
      favouriteItems = await sendFetchFavouritesRequest(logger);
    } catch (err: any) {
      // logger.warn(`(user-favourites-store) failed to fetch favourites data, userId=${userAccount?.userId}`, err);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to fetch favourites data', 'error-stub');
    }
    // logger.verbose(`(user-favourites-store) get favourites data, userId=${userAccount?.userId}, count=${favouriteItems?.length}`);
    return favouriteItems;
  }

  const createInstance = (): UserFavouritesStoreInternalRef => {
    // logger.verbose('(user-favourites-store) creating new instance');

    const nuxtApp = useNuxtApp();
    const result: UserFavouritesStoreInternalRef = reactive({
      status: 'pending',
      items: [],
      fetchFavourites: async (): Promise<void> => {
        // logger.verbose(`(user-favourites-store) obtaining favourites, userId=${userAccount?.userId}`);
        if (result.status === 'error') {
          // logger.warn('(user-favourites-store) cannot obtain favourites, store is in failed state');
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error occured', 'error-stub');
        }

        await ensureUserAccount();

        result.status = 'pending';
        try {
          const itemsData = await getFavouriteItems(nuxtApp, logger);
          // logger.verbose(`(user-favourites-store) favourites obtained, userId=${userAccount?.userId}, count=${itemsData?.length}`);
          result.items.splice(0, result.items.length, ...itemsData!);
          result.status = 'success';
        } catch (err: any) {
          // logger.warn(`(user-favourites-store) failed to obtain favourites, userId=${userAccount?.userId}`, err);
          result.status = 'error';
          result.items.splice(0, result.items.length);
        }
      },
      toggleFavourite: async <TOfferKind extends OfferKind, TOffer extends (EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { kind: TOfferKind }>(offerId: EntityId, kind: TOfferKind, offer?: TOffer): Promise<boolean> => {
        // logger.verbose(`(user-favourites-store) toggling favourite, offerId=${offerId}, offerKind=${kind}`);
        if (result.status === 'error') {
          // logger.warn(`(user-favourites-store) cannot toggle offer, store is in failed state, offerId=${offerId}, offerKind=${kind}`);
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error occured', 'error-stub');
        }

        await ensureUserAccount();

        result.status = 'pending';
        try {
          const resultDto = await post(kind === 'flights' ? `/${ApiEndpointFlightOfferFavourite(offerId)}` : `/${ApiEndpointStayOfferFavourite(offerId)}`, undefined, undefined, undefined, true, undefined, 'default') as IToggleFavouriteOfferResultDto;
          if (!resultDto) {
            // logger.warn(`(user-favourites-store) exception occured while toggling favourite offer on server, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
            throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error occured', 'error-stub');
          }
          const isFavourite = resultDto.isFavourite;
          // logger.verbose(`(user-favourites-store) favourite toggled, offerId=${offerId}, offerKind=${kind}, result=${isFavourite}, userId=${userAccount?.userId}`);

          const clientOfferIdx = result.items.findIndex(o => o.id === offerId && o.kind === kind);
          if (isFavourite) {
            if (clientOfferIdx < 0) {
              if (offer) {
                // logger.debug(`(user-favourites-store) adding toggled favourite offer data on client, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
                result.items.splice(0, 0, offer);
              } else {
                // logger.verbose(`(user-favourites-store) reloading favourite offers list after toggling offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
                result.fetchFavourites();
              }
            } else {
              // logger.warn(`(user-favourites-store) failed to add toggled favourite offer data on client - data not specified, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
            }
          } else if (clientOfferIdx >= 0) {
            // logger.debug(`(user-favourites-store) removing toggled favourite from client data, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
            result.items.splice(clientOfferIdx, 1);
          } else {
            // logger.warn(`(user-favourites-store) failed to remove toggled favourite from client data - not found, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
          }

          result.status = 'success';
          return isFavourite;
        } catch (err: any) {
          // logger.warn(`(user-favourites-store) exception occured while toggling favourite, offerId=${offerId}, offerKind=${kind}, userId=${userAccount?.userId}`);
          result.status = 'error';
          throw err;
        }
      },
      onSignOut: () => {
        // logger.debug('(user-favourites-store) onSignOut');
        result.items.splice(0, result.items.length);
        result.status = 'success';
      }
    });

    return result;
  };

  const getInstance = async (): Promise<UserFavouritesStoreRef> => {
    // logger.debug('(user-favourites-store) get instance');

    if (!instance) {
      instance = createInstance();
      if (import.meta.client) {
        if (status.value === 'authenticated') {
          await ensureUserAccount();
          instance.fetchFavourites();
        }
      }
    }

    // logger.debug('(user-favourites-store) get instance - ok');
    return instance;
  };

  if (import.meta.client) {
    watch(status, async () => {
      // logger.info(`(user-favourites-store) auth status changed, status=${status.value}`);
      if(status.value === 'authenticated') {
        // fetch user favourites
        if(instance) {
          await ensureUserAccount();
          instance.fetchFavourites();
        } else {
          await getInstance();
        }
      } else if (status.value === 'unauthenticated') {
        instance?.onSignOut();
        userAccount = undefined;
      }
    });
  }

  // logger.verbose('(user-favourites-store) factory created');
  const result: IUserFavouritesStoreFactory = {
    getInstance
  };
  return result;
});

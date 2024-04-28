import type { OfferKind, EntityId } from './../shared/interfaces';
import { useUserFavouritesStore } from './../stores/user-favourites-store';

export function useOfferFavouriteStatus (offerId: EntityId, offerKind: OfferKind): { isFavourite: boolean } {
  const logger = CommonServicesLocator.getLogger();

  const { status } = useAuth();
  const userFavouritesStoreFactory = useUserFavouritesStore();

  let stopStoreWatch: ReturnType<typeof watch> | undefined;
  let stopAuthWatch: ReturnType<typeof watch> | undefined;
  const result = reactive({ isFavourite: false });
  logger.debug(`(offer-favourite-status) using watcher: offerId=${offerId}, offerKind=${offerKind}`);

  async function initializeFavouriteStatusWatcherIfNeeded (): Promise<void> {
    if (stopStoreWatch) {
      return;
    }

    logger.debug(`(offer-favourite-status) creating favourite status watcher, offerId=${offerId}, offerKind=${offerKind}`);
    const store = await userFavouritesStoreFactory.getInstance();
    const checkIsFavourite = () => { return status.value === 'authenticated' && (import.meta.client ?? false) && ((store.items?.some(i => i.id === offerId && i.kind === offerKind)) ?? false); };
    stopStoreWatch = watch(store.items, () => {
      const isFavourite = checkIsFavourite();
      if (result.isFavourite !== isFavourite) {
        logger.debug(`(offer-favourite-status) watcher status changed, offerId=${offerId}, offerKind=${offerKind}, isFavourite=${isFavourite}`);
        result.isFavourite = isFavourite;
      }
    });
    result.isFavourite = checkIsFavourite();
  }

  if (import.meta.client) {
    initializeFavouriteStatusWatcherIfNeeded();

    stopAuthWatch = watch(status, () => {
      logger.debug(`(offer-favourite-status) auth status changed, offerId=${offerId}, offerKind=${offerKind}`);
      initializeFavouriteStatusWatcherIfNeeded();
    });

    onUnmounted(() => {
      logger.debug(`(offer-favourite-status) disposing watchers, offerId=${offerId}, offerKind=${offerKind}`);
      if (stopStoreWatch) {
        stopStoreWatch();
      }
      if(stopAuthWatch) {
        stopAuthWatch();
      }
    });
  }

  return result;
}

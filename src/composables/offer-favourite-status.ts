import type { OfferKind, EntityId } from '@golobe-demo/shared';
import { useUserFavouritesStore } from './../stores/user-favourites-store';
import { getCommonServices } from '../helpers/service-accessors';

export function useOfferFavouriteStatus (offerId: EntityId, offerKind: OfferKind): { isFavourite: boolean } {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseOfferFavouriteStatus' });

  const { status } = useAuth();
  const userFavouritesStoreFactory = useUserFavouritesStore();

  let stopStoreWatch: ReturnType<typeof watch> | undefined;
  let stopAuthWatch: ReturnType<typeof watch> | undefined;
  const result = reactive({ isFavourite: false });
  logger.debug('using watcher', { offerId, offerKind });

  async function initializeFavouriteStatusWatcherIfNeeded (): Promise<void> {
    if (stopStoreWatch) {
      return;
    }

    logger.debug('creating favourite status watcher', { offerId, offerKind });
    const store = await userFavouritesStoreFactory.getInstance();
    const checkIsFavourite = () => { return status.value === 'authenticated' && (import.meta.client ?? false) && ((store.items?.some(i => i.id === offerId && i.kind === offerKind)) ?? false); };
    stopStoreWatch = watch(store.items, () => {
      const isFavourite = checkIsFavourite();
      if (result.isFavourite !== isFavourite) {
        logger.debug('watcher status changed', { offerId, offerKind, isFavourite });
        result.isFavourite = isFavourite;
      }
    });
    result.isFavourite = checkIsFavourite();
  }

  if (import.meta.client) {
    initializeFavouriteStatusWatcherIfNeeded();

    stopAuthWatch = watch(status, () => {
      logger.debug('auth status changed', { offerId, offerKind });
      initializeFavouriteStatusWatcherIfNeeded();
    });

    onUnmounted(() => {
      logger.debug('disposing watchers', { offerId, offerKind });
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

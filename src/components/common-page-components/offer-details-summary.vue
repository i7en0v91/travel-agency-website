<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { type Price, type EntityDataAttrsOnly, type EntityId, type ICity, type ILocalizableValue, type OfferKind, getI18nResName1, getI18nResName2, type I18nResName, type Locale, getLocalizeableValue, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import range from 'lodash-es/range';
import { useUserFavouritesStore } from './../../stores/user-favourites-store';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { IconSvgCustomizers } from './../../helpers/components';

interface IProps {
  ctrlKey: ControlKey,
  offerKind?: OfferKind,
  offerId?: EntityId,
  city?: EntityDataAttrsOnly<ICity>,
  title?: ILocalizableValue,
  price?: Price,
  reviewScore?: number,
  numReviews?: number,
  variant?: 'default' | 'booking' | 'booking-download',
  btnResName: I18nResName,
  btnLinkUrl: string | null
};
const { ctrlKey, offerId, offerKind, numReviews, reviewScore, variant = 'default' } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'OfferDetailsSummary' });

const isError = ref(false);
const promoTooltipShown = ref(false);

const { status } = useAuth();
const { t, locale } = useI18n();
const userNotificationStore = useUserNotificationStore();
const { requestUserAction } = usePreviewState();

const userFavouritesStoreFactory = useUserFavouritesStore();
let favouriteStatusWatcher: ReturnType<typeof useOfferFavouriteStatus> | undefined;
const isFavourite = ref(false);

const scoreClassResName = computed(() => reviewScore ? getScoreClassResName(reviewScore) : undefined);
const reviewsCountText = computed(() => numReviews ? `${numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  logger.verbose('toggling favourite', { offerId, kind: offerKind, current: isFavourite.value });
  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('favourite hasn', { offerId, kind: offerKind, current: isFavourite.value });
    return;
  }
  const store = await userFavouritesStoreFactory.getInstance();
  const result = await store.toggleFavourite(offerId!, offerKind!);
  logger.verbose('favourite toggled', { offerId, isFavourite: result });
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug('favourite button clicked', { ctrlKey, current: isFavourite.value });
  await toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

const $emit = defineEmits<{(event: 'btnClick'): void}>();

function onBtnClick () {
  logger.debug('button clicked', ctrlKey);
  $emit('btnClick');
}

function initializeFavouriteStatusWatcherIfNeeded () {
  if (favouriteStatusWatcher) {
    return;
  }

  if (offerId && offerKind) {
    logger.debug('creating favourite status watcher', { ctrlKey, offerId, offerKind });
    favouriteStatusWatcher = useOfferFavouriteStatus(offerId, offerKind);
    watch(() => favouriteStatusWatcher!.isFavourite, () => {
      logger.debug('favourite status updated', { ctrlKey, offerId, offerKind, status: favouriteStatusWatcher!.isFavourite });
      isFavourite.value = favouriteStatusWatcher!.isFavourite;
    });
    isFavourite.value = favouriteStatusWatcher!.isFavourite;
  }
}

onMounted(() => {
  watch(() => [offerId, offerKind], initializeFavouriteStatusWatcherIfNeeded);
  initializeFavouriteStatusWatcherIfNeeded();
});

</script>

<template>
  <section class="w-auto h-auto overflow-x-hidden">
    <ErrorHelm v-model:is-error="isError">
      <div class="w-full pb-2 h-auto overflow-x-auto overflow-y-hidden grid gap-2 justify-start grid-rows-offersummaryxs sm:grid-rows-offersummarysm grid-cols-offersummary mb-2">
        <div class="w-full whitespace-normal justify-center row-start-1 row-end-2 col-start-1 col-end-2">
          <div v-if="title" class="contents">
            <h1 :class="`inline w-fit whitespace-normal text-3xl font-semibold text-primary-900 dark:text-white ${variant !== 'default' ? 'sm:self-center' : ''} ${(offerKind === 'stays' && variant === 'default') ? 'mr-2 sm:mr-4' : ''}`">
              {{ getLocalizeableValue(title, locale as Locale) }}
            </h1>
            <div v-if="offerKind === 'stays' && variant === 'default'" class="flex-initial inline-flex flex-row flex-wrap items-center gap-4 translate-y-[0.1rem]">
              <div class="inline-flex flex-row flex-nowrap items-center gap-[2px]">
                <UIcon 
                  v-for="i in range(0, 5)" 
                  :key="`${toShortForm(ctrlKey)}-HotelStar-${i}`" 
                  name="i-material-symbols-star" 
                  mode="svg"
                  class="w-5 h-5 inline-block" 
                  :customize="IconSvgCustomizers.fill('#f87171')"
                />
              </div>
              <div class="text-xs">
                {{ $t(getI18nResName2('searchStays', 'stayRatingCaption')) }}
              </div>
            </div>
          </div>
          <USkeleton v-else class="w-1/2 h-6" />
        </div>
        <div class="w-auto text-red-400 group-[.booking-page-group]:text-primary-900 group-[.booking-page-group]:dark:text-white block row-start-1 row-end-2 col-start-2 col-end-3 justify-self-end">
          <span v-if="price && offerKind === 'flights'" class="font-semibold text-3xl">{{ ($n(Math.floor(price.toNumber()), 'currency')) }}</span>
          <span v-else-if="price && offerKind === 'stays'" class="font-semibold text-3xl"><span>{{ $n(Math.floor(price.toNumber()), 'currency') }}<wbr>&#47;<span class="text-sm sm:text-base">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span></span>
          <USkeleton v-else class="w-full h-8" />
        </div>
        <div :class="`w-full block row-start-2 row-end-3 col-start-1 col-end-3 sm:col-end-2 ${variant !== 'default' ? 'sm:self-center' : ''}`">
          <div class="flex flex-row flex-nowrap items-center">
            <UIcon name="i-material-symbols-location-on-rounded" class="flex-initial w-3 h-3 inline-block float-left opacity-70 mr-2"/>
            <span v-if="city" class="flex-1 w-fit break-all inline-block text-xs text-gray-500 dark:text-gray-400">
              {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
            </span>
            <USkeleton v-else class="w-1/3 h-4" />
          </div>
          <ClientOnly>    
            <div v-if="scoreClassResName && variant === 'default'" class="w-auto flex flex-row flex-wrap items-center gap-2 mb-4 sm:mb-0 mt-4">
              <UBadge 
                :ui="{ 
                  base: 'w-fit h-auto p-2 text-center',
                  rounded: 'rounded-md'
                }"
                size="sm"
              >
              {{ reviewScore!.toFixed(1) }}
              </UBadge>
              <div class="w-fit h-auto text-xs font-semibold">
                {{ $t(scoreClassResName) }}
              </div>
              <div class="w-fit h-auto text-xs text-gray-500 dark:text-gray-400">
                {{ reviewsCountText }}
              </div>
            </div>
            <USkeleton v-else-if="variant === 'default'" class="w-1/3 h-7 mt-4" />
            <template #fallback>
              <div v-if="variant === 'default'" class="w-full h-full flex flex-row justify-self-stretch items-center">
                <USkeleton class="w-1/3 h-7 my-2" />
              </div>
            </template>
          </ClientOnly>
        </div>
        <div class="w-full h-min block row-start-3 row-end-4 col-start-1 col-end-3 sm:row-start-2 sm:row-end-3 sm:col-start-2 sm:col-end-3 self-end">
          <div class="w-full flex flex-row flex-wrap gap-4 px-1">
            <UButton
              v-if="status === 'authenticated' && variant === 'default'"
              :ui="{ base: 'aspect-square justify-center' }"
              size="lg"
              :icon="isFavourite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
              variant="outline"
              color="primary"
              @click="favouriteBtnClick"
            />

            <UPopover v-model:open="promoTooltipShown" :popper="{ placement: 'bottom' }" :ui="{ wrapper: `self-stretch *:h-full ${variant === 'booking-download' ? 'invisible' : ''}` }">
              <UButton 
                :ui="{ base: 'aspect-square justify-center' }"
                size="lg" 
                icon="i-mdi-share" 
                variant="outline" 
                color="primary"
                :aria-label="t(getI18nResName2('ariaLabels', 'btnShareSocial'))" @click="scheduleTooltipAutoHide" />
              <template #panel="{ close }">
                <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
              </template>
            </UPopover>  

            <UButton size="lg" :class="`w-full flex-1 ${variant === 'booking-download' ? 'invisible' : ''}`" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="btnLinkUrl ?? undefined" :external="btnLinkUrl ? false : undefined" @click="onBtnClick">
              {{ $t(btnResName) }}
            </UButton>
          </div>
        </div>
      </div>
    </ErrorHelm>
  </section>
</template>
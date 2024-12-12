<script setup lang="ts">
import { type Price, type EntityDataAttrsOnly, type EntityId, type ICity, type ILocalizableValue, type OfferKind, getI18nResName1, getI18nResName2, type I18nResName, type Locale, getLocalizeableValue, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import range from 'lodash-es/range';
import { useUserFavouritesStore } from './../../stores/user-favourites-store';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offerKind?: OfferKind | undefined,
  offerId?: EntityId | undefined,
  city?: EntityDataAttrsOnly<ICity>,
  title?: ILocalizableValue,
  price?: Price,
  reviewScore?: number,
  numReviews?: number,
  showFavouriteBtn?: boolean,
  showReviewDetails?: boolean,
  btnResName: I18nResName,
  btnLinkUrl: string | null
};
const props = withDefaults(defineProps<IProps>(), {
  offerKind: undefined,
  offerId: undefined,
  city: undefined,
  title: undefined,
  price: undefined,
  reviewScore: undefined,
  numReviews: undefined,
  showFavouriteBtn: true,
  showReviewDetails: true
});

const logger = getCommonServices().getLogger();

const isError = ref(false);
const promoTooltipShown = ref(false);

const { status } = useAuth();
const { t, locale } = useI18n();
const { requestUserAction } = usePreviewState();

const userFavouritesStoreFactory = useUserFavouritesStore();
let favouriteStatusWatcher: ReturnType<typeof useOfferFavouriteStatus> | undefined;
const isFavourite = ref(false);

const scoreClassResName = computed(() => props.reviewScore ? getScoreClassResName(props.reviewScore) : undefined);
const reviewsCountText = computed(() => props.numReviews ? `${props.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), props.numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  const offerId = props.offerId!;
  const offerKind = props.offerKind!;
  logger.verbose(`(OfferDetailsSummary) toggling favourite, offerId=${offerId}, kind=${offerKind}, current=${isFavourite.value}`);
  if(!await requestUserAction()) {
    logger.verbose(`(OfferDetailsSummary) favourite hasn't been toggled - not allowed in preview mode, offerId=${offerId}, kind=${offerKind}, current=${isFavourite.value}`);
    return;
  }
  const store = await userFavouritesStoreFactory.getInstance();
  const result = await store.toggleFavourite(offerId, offerKind);
  logger.verbose(`(OfferDetailsSummary) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(OfferDetailsSummary) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${isFavourite.value}`);
  await toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

const $emit = defineEmits<{(event: 'btnClick'): void}>();

function onBtnClick () {
  logger.debug(`(OfferDetailsSummary) button clicked, ctrlKey=${props.ctrlKey}`);
  $emit('btnClick');
}

function initializeFavouriteStatusWatcherIfNeeded () {
  if (favouriteStatusWatcher) {
    return;
  }

  if (props.offerId && props.offerKind) {
    logger.debug(`(OfferDetailsSummary) creating favourite status watcher, ctrlKey=${props.ctrlKey}, offerId=${props.offerId}, offerKind=${props.offerKind}`);
    favouriteStatusWatcher = useOfferFavouriteStatus(props.offerId, props.offerKind);
    watch(() => favouriteStatusWatcher!.isFavourite, () => {
      logger.debug(`(OfferDetailsSummary) favourite status updated, ctrlKey=${props.ctrlKey}, offerId=${props.offerId}, offerKind=${props.offerKind}, status=${favouriteStatusWatcher!.isFavourite}`);
      isFavourite.value = favouriteStatusWatcher!.isFavourite;
    });
    isFavourite.value = favouriteStatusWatcher!.isFavourite;
  }
}

onMounted(() => {
  watch(() => [props.offerId, props.offerKind], initializeFavouriteStatusWatcherIfNeeded);
  initializeFavouriteStatusWatcherIfNeeded();
});

</script>

<template>
  <section class="w-auto h-auto overflow-x-hidden">
    <ErrorHelm v-model:is-error="isError">
      <div class="w-full pb-2 h-auto overflow-x-auto overflow-y-hidden grid gap-2 justify-start grid-rows-offersummaryxs sm:grid-rows-offersummarysm grid-cols-offersummary mb-2">
        <div class="w-full whitespace-normal justify-center row-start-1 row-end-2 col-start-1 col-end-2">
          <div v-if="title" class="contents">
            <h1 :class="`inline w-fit whitespace-normal text-3xl font-semibold text-primary-900 dark:text-white ${!showReviewDetails ? 'sm:self-center' : ''} ${(offerKind === 'stays' && showReviewDetails) ? 'mr-2 sm:mr-4' : ''}`">
              {{ getLocalizeableValue(title, locale as Locale) }}
            </h1>
            <div v-if="offerKind === 'stays' && showReviewDetails" class="flex-initial inline-flex flex-row flex-wrap items-center gap-4 translate-y-[0.1rem]">
              <div class="inline-flex flex-row flex-nowrap items-center gap-[2px]">
                <ClientOnly>
                  <UIcon v-for="i in range(0, 5)" :key="`${props.ctrlKey}-HotelStar-${i}`" name="i-material-symbols-star" class="w-5 h-5 bg-red-400 inline-block" />
                </ClientOnly>
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
        <div :class="`w-full block row-start-2 row-end-3 col-start-1 col-end-3 sm:col-end-2 ${!showReviewDetails ? 'sm:self-center' : ''}`">
          <div class="flex flex-row flex-nowrap items-center">
            <UIcon name="i-material-symbols-location-on-rounded" class="flex-initial w-3 h-3 inline-block float-left opacity-70 mr-2"/>
            <span v-if="city" class="flex-1 w-fit break-all inline-block text-xs text-gray-500 dark:text-gray-400">
              {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
            </span>
            <USkeleton v-else class="w-1/3 h-4" />
          </div>
          <ClientOnly>    
            <div v-if="scoreClassResName && showReviewDetails" class="w-auto flex flex-row flex-wrap items-center gap-2 mb-4 sm:mb-0 mt-4">
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
            <USkeleton v-else-if="showReviewDetails" class="w-1/3 h-7 mt-4" />
            <template #fallback>
              <div v-if="showReviewDetails" class="w-full h-full flex flex-row justify-self-stretch items-center">
                <USkeleton class="w-1/3 h-7 my-2" />
              </div>
            </template>
          </ClientOnly>
        </div>
        <div class="w-full h-min block row-start-3 row-end-4 col-start-1 col-end-3 sm:row-start-2 sm:row-end-3 sm:col-start-2 sm:col-end-3 self-end">
          <div class="w-full flex flex-row flex-wrap gap-4 px-1">
            <UButton
              v-if="status === 'authenticated' && showFavouriteBtn"
              :ui="{ base: 'aspect-square justify-center' }"
              size="lg"
              :icon="isFavourite ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
              variant="outline"
              color="primary"
              @click="favouriteBtnClick"
            />

            <UPopover v-model:open="promoTooltipShown" :popper="{ placement: 'bottom' }" :ui="{ wrapper: 'self-stretch *:h-full' }">
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

            <UButton size="lg" class="w-full flex-1" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="btnLinkUrl ?? undefined" :external="btnLinkUrl ? false : undefined" @click="onBtnClick">
              {{ $t(btnResName) }}
            </UButton>
          </div>
        </div>
      </div>
    </ErrorHelm>
  </section>
</template>

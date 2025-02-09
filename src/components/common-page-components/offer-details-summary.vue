<script setup lang="ts">
import { type Price, type EntityDataAttrsOnly, type EntityId, type ICity, type ILocalizableValue, type OfferKind, getI18nResName1, getI18nResName2, type I18nResName, type Locale, getLocalizeableValue, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import range from 'lodash-es/range';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import type { Tooltip } from 'floating-vue';
import { useUserFavouritesStore } from './../../stores/user-favourites-store';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
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

const logger = getCommonServices().getLogger();

const isError = ref(false);

const { status } = useAuth();
const { t, locale } = useI18n();
const { requestUserAction } = usePreviewState();

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');
const userFavouritesStoreFactory = useUserFavouritesStore();
let favouriteStatusWatcher: ReturnType<typeof useOfferFavouriteStatus> | undefined;
const isFavourite = ref(false);

const scoreClassResName = computed(() => reviewScore ? getScoreClassResName(reviewScore) : undefined);
const reviewsCountText = computed(() => numReviews ? `${numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  logger.verbose(`(OfferDetailsSummary) toggling favourite, offerId=${offerId}, kind=${offerKind}, current=${isFavourite.value}`);
  if(!await requestUserAction()) {
    logger.verbose(`(OfferDetailsSummary) favourite hasn't been toggled - not allowed in preview mode, offerId=${offerId}, kind=${offerKind}, current=${isFavourite.value}`);
    return;
  }
  const store = await userFavouritesStoreFactory.getInstance();
  const result = await store.toggleFavourite(offerId!, offerKind!);
  logger.verbose(`(OfferDetailsSummary) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(OfferDetailsSummary) favourite button clicked, ctrlKey=${ctrlKey}, current=${isFavourite.value}`);
  await toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

const $emit = defineEmits<{(event: 'btnClick'): void}>();

function onBtnClick () {
  logger.debug(`(OfferDetailsSummary) button clicked, ctrlKey=${ctrlKey}`);
  $emit('btnClick');
}

function initializeFavouriteStatusWatcherIfNeeded () {
  if (favouriteStatusWatcher) {
    return;
  }

  if (offerId && offerKind) {
    logger.debug(`(OfferDetailsSummary) creating favourite status watcher, ctrlKey=${ctrlKey}, offerId=${offerId}, offerKind=${offerKind}`);
    favouriteStatusWatcher = useOfferFavouriteStatus(offerId, offerKind);
    watch(() => favouriteStatusWatcher!.isFavourite, () => {
      logger.debug(`(OfferDetailsSummary) favourite status updated, ctrlKey=${ctrlKey}, offerId=${offerId}, offerKind=${offerKind}, status=${favouriteStatusWatcher!.isFavourite}`);
      isFavourite.value = favouriteStatusWatcher!.isFavourite;
    });
    isFavourite.value = favouriteStatusWatcher!.isFavourite;
  }
}

onMounted(() => {
  watch(() => [offerId, offerKind], initializeFavouriteStatusWatcherIfNeeded);
  initializeFavouriteStatusWatcherIfNeeded();
});

const tooltipId = useId();

</script>

<template>
  <section class="offer-details-summary">
    <ErrorHelm v-model:is-error="isError">
      <PerfectScrollbar
        :options="{
          suppressScrollY: true,
          wheelPropagation: true
        }"
        :watch-options="false"
        tag="div"
        class="offer-details-summary-main-scroll"
      >
        <div :class="`offer-details-summary-grid ${variant === 'default' ? '' : 'no-review-details'} mb-xs-2`">
          <div class="offer-details-summary-name">
            <div v-if="title">
              <h1 :class="`offer-details-summary-title ${(offerKind === 'stays' && variant === 'default') ? 'mr-xs-2 mr-s-3' : ''}`">
                {{ getLocalizeableValue(title, locale as Locale) }}
              </h1>
              <div v-if="offerKind === 'stays' && variant === 'default'" class="offer-details-hotel-rating mb-xs-2 mt-xs-1">
                <div class="offer-details-hotel-card-stars">
                  <div v-for="i in range(0, 5)" :key="`${ctrlKey}-HotelStar-${i}`" class="stay-card-star" />
                </div>
                <div class="offer-details-hotel-rating-caption">
                  {{ $t(getI18nResName2('searchStays', 'stayRatingCaption')) }}
                </div>
              </div>
            </div>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
          <div class="offer-details-summary-price pl-xs-2">
            <span v-if="price && offerKind === 'flights'">{{ ($n(Math.floor(price.toNumber()), 'currency')) }}</span>
            <span v-else-if="price && offerKind === 'stays'"><span>{{ $n(Math.floor(price.toNumber()), 'currency') }}<wbr>&#47;<span class="stays-price-night">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span></span>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
          <div class="offer-details-summary-main">
            <div class="offer-details-summary-info">
              <div class="offer-details-summary-location">
                <span class="offer-details-summary-icon offer-details-location-icon mr-xs-2" />
                <span v-if="city" class="offer-details-summary-location-text">
                  {{ getLocalizeableValue(city.country.name, locale as Locale) }}, {{ getLocalizeableValue(city.name, locale as Locale) }}
                </span>
                <div v-else class="data-loading-stub text-data-loading" />
              </div>
            </div>
            <ClientOnly>    
              <div v-if="scoreClassResName && variant === 'default'" class="offer-details-summary-stats mb-xs-3 mb-s-0 mt-xs-3">
                <div class="offer-details-summary-score p-xs-2 brdr-1">
                  {{ reviewScore!.toFixed(1) }}
                </div>
                <div class="offer-details-summary-score-class">
                  {{ $t(scoreClassResName) }}
                </div>
                <div class="offer-details-summary-reviews">
                  {{ reviewsCountText }}
                </div>
              </div>
              <div v-else-if="variant === 'default'" class="data-loading-stub text-data-loading" />
              <template #fallback>
                <div class="data-loading-stub text-data-loading" />
              </template>
            </ClientOnly>
          </div>
          <div class="offer-details-summary-buttons mt-xs-3">
            <NuxtLink v-if="btnLinkUrl" class="btn btn-primary brdr-1 offer-details-summary-btn-book" :to="btnLinkUrl">
              {{ $t(btnResName) }}
            </NuxtLink>
            <SimpleButton
              v-else
              kind="default"
              :ctrl-key="`${ctrlKey}-Btn`"
              class="offer-details-summary-btn-book"
              :style="variant === 'booking-download' ? { visibility: 'hidden' } : undefined"
              :label-res-name="btnResName"
              @click="onBtnClick"
            />
            <VTooltip
              ref="tooltip"
              :aria-id="tooltipId"
              :distance="6"
              :triggers="['click']"
              placement="bottom"
              :flip="false"
              theme="default-tooltip"
              :style="variant === 'booking-download' ? { visibility: 'hidden' } : undefined"
              :auto-hide="true"
              no-auto-focus
              @apply-show="scheduleTooltipAutoHide"
            >
              <SimpleButton
                class="offer-details-summary-btn-share"
                :style="variant === 'booking-download' ? { visibility: 'hidden' } : undefined"
                :ctrl-key="`${ctrlKey}-ShareBtn`"
                :aria-label-res-name="getI18nResName2('ariaLabels', 'btnShareSocial')"
                icon="share"
                kind="support"
              />
              <template #popper>
                <div>
                  {{ $t(getI18nResName1('notAvailableInDemo')) }}
                </div>
              </template>
            </VTooltip>
            <SimpleButton
              v-if="status === 'authenticated' && variant === 'default'"
              class="offer-details-summary-btn-like"
              :ctrl-key="`${ctrlKey}-LikeBtn`"
              :icon="`${isFavourite ? 'heart' : 'like'}`"
              kind="support"
              @click="favouriteBtnClick"
            />
          </div>
        </div>
      </PerfectScrollbar>
    </ErrorHelm>
  </section>
</template>

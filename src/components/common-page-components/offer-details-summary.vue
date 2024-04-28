<script setup lang="ts">

import range from 'lodash-es/range';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { type Price, type EntityDataAttrsOnly, type EntityId, type ICity, type ILocalizableValue, type OfferKind } from './../../shared/interfaces';
import { getLocalizeableValue, getScoreClassResName } from './../../shared/common';
import { type Locale } from './../../shared/constants';
import { useUserFavouritesStore } from './../../stores/user-favourites-store';
import { getI18nResName1, getI18nResName2, type I18nResName } from './../../shared/i18n';

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

const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

const { status } = useAuth();
const { t, locale } = useI18n();

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();
const userFavouritesStoreFactory = useUserFavouritesStore();
let favouriteStatusWatcher: ReturnType<typeof useOfferFavouriteStatus> | undefined;
const isFavourite = ref(false);

const scoreClassResName = computed(() => props.reviewScore ? getScoreClassResName(props.reviewScore) : undefined);
const reviewsCountText = computed(() => props.numReviews ? `${props.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), props.numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  const offerId = props.offerId!;
  const offerKind = props.offerKind!;
  logger.verbose(`(OfferDetailsSummary) toggling favourite, offerId=${offerId}, kind=${offerKind}, current=${isFavourite.value}`);
  const store = await userFavouritesStoreFactory.getInstance();
  const result = await store.toggleFavourite(offerId, offerKind);
  logger.verbose(`(OfferDetailsSummary) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(OfferDetailsSummary) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${isFavourite.value}`);
  await toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
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
        <div :class="`offer-details-summary-grid ${showReviewDetails ? '' : 'no-review-details'} mb-xs-2`">
          <div class="offer-details-summary-name">
            <div v-if="title">
              <h1 :class="`offer-details-summary-title ${(offerKind === 'stays' && showReviewDetails) ? 'mr-xs-2 mr-s-3' : ''}`">
                {{ getLocalizeableValue(title, locale as Locale) }}
              </h1>
              <div v-if="offerKind === 'stays' && showReviewDetails" class="offer-details-hotel-rating mb-xs-2 mt-xs-1">
                <div class="offer-details-hotel-card-stars">
                  <div v-for="i in range(0, 5)" :key="`${props.ctrlKey}-HotelStar-${i}`" class="stay-card-star" />
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
            <div v-if="scoreClassResName && showReviewDetails" class="offer-details-summary-stats mb-xs-3 mb-s-0 mt-xs-3">
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
            <div v-else-if="showReviewDetails" class="data-loading-stub text-data-loading" />
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
              :label-res-name="btnResName"
              @click="onBtnClick"
            />
            <VTooltip
              ref="tooltip"
              :distance="6"
              :triggers="['click']"
              placement="bottom"
              :flip="false"
              theme="default-tooltip"
              :auto-hide="true"
              no-auto-focus
              @apply-show="scheduleTooltipAutoHide"
            >
              <SimpleButton
                class="offer-details-summary-btn-share"
                :ctrl-key="`${props.ctrlKey}-ShareBtn`"
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
              v-if="status === 'authenticated' && showFavouriteBtn"
              class="offer-details-summary-btn-like"
              :ctrl-key="`${props.ctrlKey}-LikeBtn`"
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

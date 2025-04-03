<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { type Price, type EntityDataAttrsOnly, type EntityId, type ICity, type ILocalizableValue, type OfferKind, getI18nResName1, getI18nResName2, type I18nResName, type Locale, getLocalizeableValue, getScoreClassResName } from '@golobe-demo/shared';
import { LOADING_STATE, TooltipHideTimeout } from './../../helpers/constants';
import range from 'lodash-es/range';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import type { Tooltip } from 'floating-vue';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

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

const { t, locale } = useI18n();
const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const { requestUserAction } = usePreviewState();

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');
const isFavourite = computed(() => 
  offerKind && offerId && 
  userAccountStore.favourites && userAccountStore.favourites !== LOADING_STATE && 
  userAccountStore.favourites[offerKind].includes(offerId)
);

const scoreClassResName = computed(() => reviewScore ? getScoreClassResName(reviewScore) : undefined);
const reviewsCountText = computed(() => numReviews ? `${numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  logger.verbose('toggling favourite', { offerId, kind: offerKind, current: isFavourite.value });
  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('toggling favourite is not possible in current configuration', { offerId, kind: offerKind, current: isFavourite.value });
    return;
  }
  if(!offerKind || !offerId) {
    logger.verbose('skipping favourite toggle action, offer data is not fully available', { offerId, kind: offerKind });
    return;
  }
  const result = await userAccountStore.toggleFavourite(offerKind, offerId);
  logger.verbose('favourite toggled', { offerId, isFavourite: result });
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug('favourite button clicked', { ctrlKey, current: isFavourite.value });
  await toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

const $emit = defineEmits<{(event: 'btnClick'): void}>();

function onBtnClick () {
  logger.debug('button clicked', ctrlKey);
  $emit('btnClick');
}

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
                  <div v-for="i in range(0, 5)" :key="`${toShortForm(ctrlKey)}-HotelStar-${i}`" class="stay-card-star" />
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
              :ctrl-key="[...ctrlKey, 'Btn', 'Download']"
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
                :ctrl-key="[...ctrlKey, 'Btn', 'Share']"
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
            <ClientOnly>
              <SimpleButton
                v-if="userAccountStore.isAuthenticated && variant === 'default'"
                class="offer-details-summary-btn-like"
                :ctrl-key="[...ctrlKey, 'Btn', 'Like']"
                :icon="`${isFavourite ? 'heart' : 'like'}`"
                kind="support"
                @click="favouriteBtnClick"
              />
              <template #fallback />
            </ClientOnly>
          </div>
        </div>
      </PerfectScrollbar>
    </ErrorHelm>
  </section>
</template>

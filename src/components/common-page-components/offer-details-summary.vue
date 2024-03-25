<script setup lang="ts">

import range from 'lodash-es/range';
import { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { type Price, type MakeSearchResultEntity, type EntityId, type ICity, type ILocalizableValue, type OfferKind } from './../../shared/interfaces';
import { getLocalizeableValue, getScoreClassResName } from './../../shared/common';
import { type Locale, WebApiRoutes, PagePath } from './../../shared/constants';
import { post } from './../../shared/rest-utils';
import type { IToggleFavouriteOfferResultDto } from './../../server/dto';
import { getI18nResName1, getI18nResName2 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  offerKind: OfferKind,
  offerId: EntityId,
  city?: MakeSearchResultEntity<ICity>,
  placeName?: ILocalizableValue,
  title?: ILocalizableValue,
  price?: Price,
  reviewScore?: number,
  numReviews?: number,
  isFavourite?: boolean
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const { status } = useAuth();
const { t, locale } = useI18n();
const localePath = useLocalePath();

const tooltip = ref<InstanceType<typeof Tooltip>>();
const isFavourite = ref<boolean>(props.isFavourite ?? false);

const scoreClassResName = computed(() => props.reviewScore ? getScoreClassResName(props.reviewScore) : undefined);
const reviewsCountText = computed(() => props.numReviews ? `${props.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), props.numReviews)}` : '');

async function toggleFavourite (): Promise<void> {
  const offerId = props.offerId;
  logger.verbose(`(OfferDetailsSummary) toggling favourite, offerId=${offerId}, current=${isFavourite.value}`);

  const endpointUrl = props.offerKind === 'flights' ? WebApiRoutes.FlightOfferFavourite : WebApiRoutes.StayOfferFavourite;
  const resultDto = await post(endpointUrl(offerId), undefined, undefined) as IToggleFavouriteOfferResultDto;
  if (resultDto) {
    logger.verbose(`(OfferDetailsSummary) favourite toggled, offerId=${offerId}, result=${resultDto.isFavourite}`);
    isFavourite.value = resultDto.isFavourite;
  } else {
    logger.warn(`(OfferDetailsSummary) error occured while toggling favourite offer on server, offerId=${offerId}, current=${isFavourite.value}`);
  }
}

function favouriteBtnClick () {
  logger.debug(`(SearchStayResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${isFavourite.value}`);
  toggleFavourite();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

watch(() => props.isFavourite, () => {
  isFavourite.value = props.isFavourite;
});

</script>

<template>
  <section class="offer-details-summary">
    <ol class="offer-details-breadcrumbs">
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" :to="localePath(offerKind === 'flights' ? `/${PagePath.Flights}` : `/${PagePath.Stays}`)">
          {{ getLocalizeableValue(city.country.name, locale as Locale) }}
        </NuxtLink>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
      <li class="offer-details-breadcrumb">
        <NuxtLink v-if="city" :to="localePath(offerKind === 'flights' ? `/${PagePath.FindFlights}?fromCitySlug=${city.slug}` : `/${PagePath.FindStays}?citySlug=${city.slug}`)">
          {{ getLocalizeableValue(city.name, locale as Locale) }}
        </NuxtLink>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
      <li class="offer-details-breadcrumb">
        <div v-if="placeName">
          {{ getLocalizeableValue(placeName, locale as Locale) }}
        </div>
        <div v-else class="data-loading-stub text-data-loading" />
      </li>
    </ol>
    <div class="offer-details-summary-grid mt-xs-4 mt-s-5">
      <div class="offer-details-summary-name" role="heading" aria-level="4">
        <div v-if="title">
          <div :class="`offer-details-summary-title ${offerKind === 'stays' ? 'mr-xs-2 mr-s-3' : ''}`">
            {{ getLocalizeableValue(title, locale as Locale) }}
          </div>
          <div v-if="offerKind === 'stays'" class="offer-details-hotel-rating mb-xs-2">
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
      <div class="offer-details-summary-price">
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
        <div v-if="scoreClassResName" class="offer-details-summary-stats mb-xs-3 mb-s-0 mt-xs-3">
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
        <div v-else class="data-loading-stub text-data-loading" />
      </div>
      <div class="offer-details-summary-buttons mt-xs-3">
        <NuxtLink class="btn btn-primary brdr-1 offer-details-summary-btn-book" :to="localePath('/')">
          {{ $t(getI18nResName2('offerDetailsPage', 'bookBtn')) }}
        </NuxtLink>
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
          v-if="status === 'authenticated'"
          class="offer-details-summary-btn-like"
          :ctrl-key="`${props.ctrlKey}-LikeBtn`"
          :icon="`${isFavourite ? 'heart' : 'like'}`"
          kind="support"
          @click="favouriteBtnClick"
        />
      </div>
    </div>
  </section>
</template>

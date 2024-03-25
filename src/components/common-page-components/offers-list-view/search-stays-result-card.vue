<script setup lang="ts">

import range from 'lodash-es/range';
import { type MakeSearchResultEntity, type IStayOffer, ImageCategory } from './../../../shared/interfaces';
import { getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import { getLocalizeableValue, getScoreClassResName } from './../../../shared/common';
import { type Locale, WebApiRoutes, PagePath } from './../../../shared/constants';
import { post } from './../../../shared/rest-utils';
import type { IToggleFavouriteOfferResultDto } from './../../../server/dto';

interface IProps {
  ctrlKey: string,
  offer: MakeSearchResultEntity<IStayOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const localePath = useLocalePath();

const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

const stay = props.offer.stay;
const scoreClassResName = getScoreClassResName(stay.reviewScore);
const reviewsCountText = `${stay.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), stay.numReviews)}`;

const isFavourite = ref<boolean>(props.offer.isFavourite);

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchStayResultCard) toggling favourite, offerId=${offerId}, current=${isFavourite.value}`);
  const resultDto = await post(WebApiRoutes.StayOfferFavourite(offerId), undefined, undefined) as IToggleFavouriteOfferResultDto;
  if (resultDto) {
    logger.verbose(`(SearchStayResultCard) favourite toggled, offerId=${offerId}, result=${resultDto.isFavourite}`);
    isFavourite.value = resultDto.isFavourite;
  } else {
    logger.warn(`(SearchStayResultCard) error occured while toggling favourite offer on server, offerId=${offerId}, current=${isFavourite.value}`);
  }
}

function favouriteBtnClick () {
  logger.debug(`(SearchStayResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${isFavourite.value}`);
  toggleFavourite();
}

</script>

<template>
  <div class="search-stays-result-card p-xs-3">
    <ErrorHelm v-model:is-error="isError">
      <div class="search-stays-result-card-grid">
        <div class="search-stays-card-stay-photo">
          <StaticImage
            :ctrl-key="`${ctrlKey}-StayPhoto`"
            :entity-src="props.offer.stay.photo"
            :category="ImageCategory.Hotel"
            sizes="xs:85vw sm:50vw md:75vw lg:75vw xl:30vw"
            class="stay-photo"
            img-class="stay-photo-img"
            :show-stub="true"
            :alt-res-name="getI18nResName2('searchStays', 'hotelPhotoAlt')"
          />
        </div>
        <div class="search-stays-card-stay-name">
          {{ getLocalizeableValue(offer.stay.name, locale as Locale) }}
        </div>
        <div class="search-stays-card-pricing-div mb-xs-3 mb-s-0">
          <div class="search-stays-card-price-caption">
            {{ $t(getI18nResName2('searchOffers', 'startingPrice')) }}
          </div>
          <div class="search-stays-card-price">
            <span>{{ $n(Math.floor(offer.totalPrice.toNumber()), 'currency') }}<wbr>&#47;<span class="stays-price-night">{{ $t(getI18nResName2('searchStays', 'night')) }}</span></span>
          </div>
          <div class="search-stays-card-tax">
            <span>{{ $t(getI18nResName2('searchStays', 'excludingTax')) }}</span>
          </div>
        </div>
        <div class="search-stays-card-main">
          <div class="search-stays-card-main-div">
            <div class="search-stays-card-info">
              <div class="search-stays-card-location">
                <span class="search-stays-card-icon search-stays-location-icon mr-xs-2" />
                <span class="search-stays-card-location-text">
                  {{ getLocalizeableValue(offer.stay.city.country.name, locale as Locale) }}, {{ getLocalizeableValue(offer.stay.city.name, locale as Locale) }}
                </span>
              </div>
              <div class="search-stays-card-features mt-xs-2">
                <div class="search-stays-card-stars mt-xs-1 mr-xs-2">
                  <div v-for="i in range(0, 5)" :key="`${props.ctrlKey}-HotelStar-${i}`" class="stay-card-star" />
                </div>
                <div class="search-stays-card-rating-caption mt-xs-1 mr-xs-2">
                  {{ $t(getI18nResName2('searchStays', 'stayRatingCaption')) }}
                </div>
                <div class="search-stays-card-amenities mt-xs-1">
                  <span class="search-stays-card-icon search-stays-card-amenity-icon mr-xs-2" />
                  <span class="search-stays-card-amenity-count">20+</span>
                  <span class="search-stays-card-amenity-label">
                    {{ $t(getI18nResName3('searchStays', 'filters', 'amenities')) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="search-stays-card-stats mb-xs-3 mb-s-0 mt-xs-3">
              <div class="search-stays-card-score p-xs-2 brdr-1">
                {{ offer.stay.reviewScore.toFixed(1) }}
              </div>
              <div class="search-stays-card-score-class">
                {{ $t(scoreClassResName) }}
              </div>
              <div class="search-stays-card-reviews">
                {{ reviewsCountText }}
              </div>
            </div>
          </div>
        </div>
        <div class="search-stays-card-buttons mt-xs-3">
          <SimpleButton
            v-if="status === 'authenticated'"
            class="search-stays-card-btn-like"
            :ctrl-key="`${props.ctrlKey}-LikeBtn`"
            :icon="`${isFavourite ? 'heart' : 'like'}`"
            kind="support"
            @click="favouriteBtnClick"
          />
          <NuxtLink class="btn btn-primary brdr-1 mt-xs-3 search-stays-card-btn-details" :to="localePath(`/${PagePath.StayDetails}/${props.offer.id}`)">
            {{ $t(getI18nResName2('searchStays', 'viewPlace')) }}
          </NuxtLink>
        </div>
      </div>
    </ErrorHelm>
  </div>
</template>

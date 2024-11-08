<script setup lang="ts">
import { AppPage, getPagePath, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type IStayOffer, type OfferKind, ImageCategory } from '@golobe-demo/shared';
import range from 'lodash-es/range';
import { useUserFavouritesStore } from './../../../stores/user-favourites-store';
import { useOfferFavouriteStatus } from './../../../composables/offer-favourite-status';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offer: EntityDataAttrsOnly<IStayOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger();

const isError = ref(false);

const stay = props.offer.stay;
const scoreClassResName = getScoreClassResName(stay.reviewSummary!.score);
const reviewsCountText = `${stay.reviewSummary!.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), stay.reviewSummary!.numReviews)}`;

const userFavouritesStore = useUserFavouritesStore();
const favouriteStatusWatcher = useOfferFavouriteStatus(props.offer.id, props.offer.kind);

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchStayResultCard) toggling favourite, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
  if(!await requestUserAction()) {
    logger.verbose(`(SearchStayResultCard) favourite hasn't been toggled - not available in preview mode, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
    return;
  }
  const store = await userFavouritesStore.getInstance();
  const result = await store.toggleFavourite(offerId, 'stays' as OfferKind, props.offer);
  logger.verbose(`(SearchStayResultCard) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(SearchStayResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${favouriteStatusWatcher.isFavourite}`);
  await toggleFavourite();
}

</script>

<template>
  <article class="search-stays-result-card">
    <ErrorHelm v-model:is-error="isError">
      <div class="search-stays-result-card-grid">
        <div class="search-stays-card-stay-photo">
          <StaticImage
            :ctrl-key="`${ctrlKey}-StayPhoto`"
            :entity-src="props.offer.stay.photo"
            :category="ImageCategory.Hotel"
            sizes="xs:85vw sm:85vw md:85vw lg:75vw xl:30vw"
            :ui="{ wrapper: 'stay-photo', img: 'stay-photo-img' }"
            :show-stub="true"
            :alt-res-name="getI18nResName2('searchStays', 'hotelPhotoAlt')"
          />
        </div>
        <div class="search-stays-card-main-div">
          <PerfectScrollbar
            :options="{
              suppressScrollY: true,
              wheelPropagation: true
            }"
            :watch-options="false"
            tag="div"
            class="search-stays-card-main-scroll"
          >
            <div class="search-stays-card-main-grid p-xs-3">
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
                    <div class="search-stays-card-location mt-xs-3">
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
                      {{ offer.stay.reviewSummary!.score.toFixed(1) }}
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
              <div class="search-stays-card-buttons mt-xs-3 pt-xs-3">
                <SimpleButton
                  v-if="status === 'authenticated'"
                  class="search-stays-card-btn-like"
                  :ctrl-key="`${props.ctrlKey}-LikeBtn`"
                  :icon="`${favouriteStatusWatcher.isFavourite ? 'heart' : 'like'}`"
                  kind="support"
                  @click="favouriteBtnClick"
                />
                <NuxtLink class="btn btn-primary brdr-1 search-stays-card-btn-details" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${props.offer.id}`, locale as Locale)">
                  {{ $t(getI18nResName2('searchStays', 'viewPlace')) }}
                </NuxtLink>
              </div>
            </div>
          </PerfectScrollbar>
        </div>
      </div>
    </ErrorHelm>
  </article>
</template>

<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { LOADING_STATE } from './../../../helpers/constants';
import { AppPage, getPagePath, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName2, getI18nResName3, type EntityDataAttrsOnly, type IStayOffer, ImageCategory, isElectronBuild } from '@golobe-demo/shared';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import range from 'lodash-es/range';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offer: EntityDataAttrsOnly<IStayOffer>
}
const { ctrlKey, offer } = defineProps<IProps>();

const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const { requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchStaysResultCard' });

const isError = ref(false);

const stay = offer.stay;
const scoreClassResName = getScoreClassResName(stay.reviewSummary!.score);
const reviewsCountText = `${stay.reviewSummary!.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), stay.reviewSummary!.numReviews)}`;

const isFavourite = computed(() => 
  userAccountStore.favourites && userAccountStore.favourites !== LOADING_STATE && 
  userAccountStore.favourites['stays'].includes(offer.id)
);

async function toggleFavourite (): Promise<void> {
  const offerId = offer.id;
  logger.verbose('toggling favourite', { offerId, current: isFavourite.value });
  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('toggling favourite is not possible in current configuration', { offerId, current: isFavourite.value });
    return;
  }
  const userAccountStore = useUserAccountStore();
  const result = await userAccountStore.toggleFavourite('stays', offerId);
  logger.verbose('favourite toggled', { offerId, isFavourite: result });
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug('favourite button clicked', { ctrlKey, current: isFavourite.value });
  await toggleFavourite();
}

</script>

<template>
  <article class="search-stays-result-card">
    <ErrorHelm v-model:is-error="isError">
      <div class="search-stays-result-card-grid">
        <div class="search-stays-card-stay-photo">
          <StaticImage
            :ctrl-key="[...ctrlKey, 'StayPhoto']"
            :src="offer.stay.photo"
            :category="ImageCategory.Hotel"
            sizes="xs:85vw sm:85vw md:85vw lg:75vw xl:30vw"
            class="stay-photo"
            :ui="{ img: 'stay-photo-img' }"
            stub="default"
            :alt="{ resName: getI18nResName2('searchStays', 'hotelPhotoAlt') }"
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
                        <div v-for="i in range(0, 5)" :key="`${toShortForm(ctrlKey)}-HotelStar-${i}`" class="stay-card-star" />
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
                <ClientOnly>
                  <SimpleButton
                    v-if="userAccountStore.isAuthenticated"
                    class="search-stays-card-btn-like"
                    :ctrl-key="[...ctrlKey, 'Btn', 'Like']"
                    :icon="isFavourite ? 'heart' : 'like'"
                    kind="support"
                    @click="favouriteBtnClick"
                  />
                  <template #fallback />
                </ClientOnly>
                <NuxtLink class="btn btn-primary brdr-1 search-stays-card-btn-details" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.StayDetails)}/${offer.id}`, locale as Locale)" :target="isElectronBuild() ? '_blank' : undefined">
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

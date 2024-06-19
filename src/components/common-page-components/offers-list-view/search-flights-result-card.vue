<script setup lang="ts">

import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type EntityDataAttrsOnly, type IFlightOffer, type OfferKind, ImageCategory } from './../../../shared/interfaces';
import { getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import { getLocalizeableValue, getScoreClassResName, extractAirportCode, getValueForFlightDurationFormatting, getValueForTimeOfDayFormatting } from './../../../shared/common';
import { type Locale } from './../../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../../shared/page-query-params';
import { useUserFavouritesStore } from './../../../stores/user-favourites-store';
import { useOfferFavouriteStatus } from './../../../composables/offer-favourite-status';

interface IProps {
  ctrlKey: string,
  offer: EntityDataAttrsOnly<IFlightOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const localePath = useLocalePath();

const logger = CommonServicesLocator.getLogger();
const userFavouritesStore = useUserFavouritesStore();

const isError = ref(false);

const airlineCompany = props.offer.departFlight.airlineCompany;
const airlineCompanyLogoTooltip = computed(() => getLocalizeableValue(airlineCompany.name, locale.value as Locale));
const scoreClassResName = getScoreClassResName(airlineCompany.reviewScore);
const reviewsCountText = `${airlineCompany.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), airlineCompany.numReviews)}`;

const offerFlights = props.offer.arriveFlight ? [props.offer.departFlight, props.offer.arriveFlight] : [props.offer.departFlight];
const favouriteStatusWatcher = useOfferFavouriteStatus(props.offer.id, props.offer.kind);

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchFlightsResultCard) toggling favourite, offerId=${offerId}, current=${favouriteStatusWatcher.isFavourite}`);
  const store = await userFavouritesStore.getInstance();
  const result = await store.toggleFavourite(offerId, 'flights' as OfferKind, props.offer);
  logger.verbose(`(SearchFlightsResultCard) favourite toggled, offerId=${offerId}, isFavourite=${result}`);
}

async function favouriteBtnClick (): Promise<void> {
  logger.debug(`(SearchFlightsResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${favouriteStatusWatcher.isFavourite}`);
  await toggleFavourite();
}

</script>

<template>
  <article class="search-flights-result-card p-xs-3">
    <ErrorHelm v-model:is-error="isError">
      <div class="search-flights-result-card-grid">
        <div class="search-flights-card-company-logo">
          <StaticImage
            :ctrl-key="`${ctrlKey}-CompanyLogo`"
            :entity-src="props.offer.departFlight.airlineCompany.logoImage"
            :category="ImageCategory.AirlineLogo"
            sizes="xs:60vw sm:40vw md:40vw lg:30vw xl:30vw"
            class="airline-company-logo"
            img-class="airline-company-logo-img"
            :show-stub="false"
            :request-extra-display-options="true"
            :alt-res-name="getI18nResName2('searchFlights', 'airlineCompanyLogoAlt')"
            :title="airlineCompanyLogoTooltip"
          />
        </div>
        <div class="search-flights-card-summary">
          <div class="search-flights-card-stats mb-xs-3 mb-s-0">
            <div class="search-flights-card-score p-xs-2 brdr-1">
              {{ offer.departFlight.airlineCompany.reviewScore.toFixed(1) }}
            </div>
            <div class="search-flights-card-score-class">
              {{ $t(scoreClassResName) }}
            </div>
            <div class="search-flights-card-reviews">
              {{ reviewsCountText }}
            </div>
          </div>
          <div class="search-flights-card-pricing-div mb-xs-3 mb-s-0">
            <div class="search-flights-card-price-caption">
              {{ $t(getI18nResName3('searchOffers', 'startingPrice')) }}
            </div>
            <div class="search-flights-card-price">
              <span>{{ $n(Math.floor(offer.totalPrice.toNumber()), 'currency') }}</span>
            </div>
          </div>
        </div>
        <div class="search-flights-card-main">
          <div class="search-flights-card-main-div">
            <PerfectScrollbar
              :options="{
                suppressScrollY: true,
                wheelPropagation: true
              }"
              :watch-options="false"
              tag="div"
              class="search-flights-card-details"
            >
              <div v-for="(flight) in offerFlights" :key="`FO-${flight.id}`" class="search-flights-card-timing">
                <div class="search-flights-card-checkbox brdr-1 mr-xs-3  mb-xs-3" />
                <div class="search-flights-card-interval  mb-xs-3">
                  <div class="search-flights-card-daytime">
                    {{ $d(getValueForTimeOfDayFormatting(flight.departTimeUtc, flight.departAirport.city.utcOffsetMin), 'daytime') }}
                    &nbsp;-&nbsp;
                    {{ $d(getValueForTimeOfDayFormatting(flight.arriveTimeUtc, flight.departAirport.city.utcOffsetMin), 'daytime') }}
                  </div>
                  <div class="search-flights-card-city">
                    {{ getLocalizeableValue(flight.departAirport.city.name, locale as Locale) }}
                  </div>
                </div>
                <div class="search-flights-card-nonstop  mb-xs-3">
                  {{ $t(getI18nResName2('searchFlights', 'nonStop')) }}
                </div>
                <div class="search-flights-card-range  mb-xs-3">
                  <div class="search-flights-card-duration">
                    {{ $t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(flight.departTimeUtc, flight.arriveTimeUtc)) }}
                  </div>
                  <div class="search-flights-card-airports">
                    {{ extractAirportCode(getLocalizeableValue(flight.departAirport.city.name, locale as Locale)) }}
                    &nbsp;-&nbsp;
                    {{ extractAirportCode(getLocalizeableValue(flight.arriveAirport.city.name, locale as Locale)) }}
                  </div>
                </div>
              </div>
            </PerfectScrollbar>
          </div>
          <div class="search-flights-card-buttons pt-xs-3">
            <SimpleButton
              v-if="status === 'authenticated'"
              class="search-flights-card-btn-like"
              :ctrl-key="`${props.ctrlKey}-LikeBtn`"
              :icon="`${favouriteStatusWatcher.isFavourite ? 'heart' : 'like'}`"
              kind="support"
              @click="favouriteBtnClick"
            />
            <NuxtLink class="btn btn-primary brdr-1 search-flights-card-btn-details" :to="localePath(`/${getHtmlPagePath(HtmlPage.FlightDetails)}/${offer.id}`)">
              {{ $t(getI18nResName2('searchFlights', 'viewDetails')) }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </ErrorHelm>
  </article>
</template>

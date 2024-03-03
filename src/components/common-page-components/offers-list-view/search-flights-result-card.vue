<script setup lang="ts">

import dayjs from 'dayjs';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type MakeSearchResultEntity, type IFlight, type IFlightOffer, ImageCategory } from './../../../shared/interfaces';
import { getI18nResName2, getI18nResName3, type I18nResName } from './../../../shared/i18n';
import { getLocalizeableValue, convertTimeOfDay, getTimeOfDay } from './../../../shared/common';
import { type Locale, WebApiRoutes } from './../../../shared/constants';
import { post } from './../../../client/rest-utils';
import type { IToggleFavouriteOfferDto, IToggleFavouriteOfferResultDto } from './../../../server/dto';

interface IProps {
  ctrlKey: string,
  offer: MakeSearchResultEntity<IFlightOffer>
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const { locale, t } = useI18n();
const localePath = useLocalePath();

const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

function getScoreClassResName (score: number): I18nResName {
  if (score >= 4.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryGood');
  } else if (score >= 3.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'good');
  } else if (score >= 2.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'medium');
  } else if (score >= 1.0) {
    return getI18nResName3('searchOffers', 'scoreClass', 'low');
  } else {
    return getI18nResName3('searchOffers', 'scoreClass', 'veryLow');
  }
}

const airlineCompany = props.offer.departFlight.airlineCompany;
const airlineCompanyLogoTooltip = computed(() => getLocalizeableValue(airlineCompany.name, locale.value as Locale));
const scoreClassResName = getScoreClassResName(airlineCompany.reviewScore);
const reviewsCountText = `${airlineCompany.numReviews} ${t(getI18nResName2('searchOffers', 'reviewsCount'), airlineCompany.numReviews)}`;

const offerFlights = props.offer.arriveFlight ? [props.offer.departFlight, props.offer.arriveFlight] : [props.offer.departFlight];
const isFavourite = ref<boolean>(props.offer.isFavourite);

function getValueForTimeOfDayFormatting (dateTimeUtc: Date, utcOffsetMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(getTimeOfDay(dateTimeUtc, utcOffsetMinutes));
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

function getValueForFlightDurationFormatting (flight: MakeSearchResultEntity<IFlight>): { hours: string, minutes: string } {
  const departFlightDuration = Math.round((flight.arriveTimeUtc.getTime() - flight.departTimeUtc.getTime()) / 60000);
  const duration = convertTimeOfDay(departFlightDuration);
  return {
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

function extractAirportCode (displayName: string) {
  if (displayName.length < 3) {
    return displayName.toUpperCase();
  }
  return displayName.substring(0, 3).toUpperCase();
}

async function toggleFavourite (): Promise<void> {
  const offerId = props.offer.id;
  logger.verbose(`(SearchFlightsResultCard) toggling favourite, offerId=${offerId}, current=${isFavourite.value}`);
  const dto: IToggleFavouriteOfferDto = {
    offerId
  };
  const resultDto = await post(WebApiRoutes.FlightsFavourite, undefined, dto) as IToggleFavouriteOfferResultDto;
  if (resultDto) {
    logger.verbose(`(SearchFlightsResultCard) favourite toggled, offerId=${offerId}, result=${resultDto.isFavourite}`);
    isFavourite.value = resultDto.isFavourite;
  } else {
    logger.warn(`(SearchFlightsResultCard) error occured while toggling favourite offer on server, offerId=${offerId}, current=${isFavourite.value}`);
  }
}

function favouriteBtnClick () {
  logger.debug(`(SearchFlightsResultCard) favourite button clicked, ctrlKey=${props.ctrlKey}, current=${isFavourite.value}`);
  toggleFavourite();
}

</script>

<template>
  <div class="search-flights-result-card p-xs-3">
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
                    {{ $t(getI18nResName2('searchFlights', 'flightDuration'), getValueForFlightDurationFormatting(flight)) }}
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
          <div class="search-flights-card-buttons mt-xs-3">
            <SimpleButton
              v-if="status === 'authenticated'"
              class="search-flights-card-btn-like"
              :ctrl-key="`${props.ctrlKey}-LikeBtn`"
              :icon="`${isFavourite ? 'heart' : 'like'}`"
              kind="support"
              @click="favouriteBtnClick"
            />
            <NuxtLink class="btn btn-primary brdr-1 search-flights-card-btn-details" :to="localePath('/find-flights')">
              {{ $t(getI18nResName2('searchFlights', 'viewDetails')) }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </ErrorHelm>
  </div>
</template>

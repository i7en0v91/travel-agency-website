<script setup lang="ts">

import orderBy from 'lodash-es/orderBy';
import range from 'lodash-es/range';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import FlightDetailsCard from './../../components/common-page-components/flight-details-card.vue';
import { getLocalizeableValue } from './../../shared/common';
import { useFetchEx } from './../../shared/fetch-ex';
import { type Locale, WebApiRoutes } from './../../shared/constants';
import { AvailableFlightClasses, ImageCategory, type IFlightOffer, type ILocalizableValue } from './../../shared/interfaces';
import { type IFlightOfferDetailsDto } from './../../server/dto';
import { mapFlightOfferDetails } from './../../shared/mappers';

const NumAirplaneFeatureImages = 8;

const isError = ref(false);

const { t, locale } = useI18n();
const localePath = useLocalePath();

const route = useRoute();
const logger = CommonServicesLocator.getLogger();

const offerParam = useRoute().params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  navigateTo(localePath('/'));
}

let offerId: number | undefined;
try {
  offerId = parseInt(offerParam);
} catch (err: any) {
  logger.warn(`(FlightDetails) failed to parse flight offer id: param=${offerParam}`, err);
  isError.value = true;
}

definePageMeta({
  title: { resName: getI18nResName2('flightDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'FlightOfferDetailsSummary';

const flightDetailsFetchRequest = await useFetchEx<IFlightOfferDetailsDto, IFlightOfferDetailsDto>(WebApiRoutes.FlightOfferDetails(offerId ?? -1), 'error-page',
  {
    server: true,
    lazy: true,
    cache: 'no-cache',
    immediate: !!offerId,
    onResponse: (ctx) => {
      logger.verbose(`(FlightDetails) received flight offer details response: id=${(ctx.response._data as IFlightOfferDetailsDto)?.id}`);
      isError.value = ctx.response.status >= 400;
    },
    onResponseError: (ctx) => {
      logger.warn('(FlightDetails) got flight offer details fetch response error', ctx.error, { id: offerId });
      isError.value = true;
    },
    onRequestError: (ctx) => {
      logger.warn('(FlightDetails) got flight offer details fetch request error', ctx.error, { id: offerId });
      isError.value = true;
    }
  });
const flightDetailsFetch = await flightDetailsFetchRequest;
const offerDataAvailable = computed(() => flightDetailsFetch.status.value === 'success' && flightDetailsFetch.data?.value?.departFlight && !isError.value);
const flightOffer = ref<Omit<IFlightOffer, 'dataHash'> | undefined>(flightDetailsFetch.data?.value ? mapFlightOfferDetails(flightDetailsFetch.data.value!) : undefined);
const airplaneImages = computed(() => (offerDataAvailable.value && flightOffer.value?.departFlight) ? orderBy(flightOffer.value!.departFlight.airplane.images.filter(x => x.kind === 'window' || x.kind === 'common' || x.kind === flightOffer.value!.class), ['order'], ['asc']).map(x => x.image) : undefined);

const nuxtApp = useNuxtApp();
if (nuxtApp.isHydrating || process.server) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'flights',
      title: flightOffer.value!.departFlight.airplane.name,
      city: flightOffer.value!.departFlight.departAirport.city,
      price: flightOffer.value!.totalPrice.toNumber(),
      reviewScore: flightOffer.value!.departFlight.airlineCompany.reviewScore,
      numReviews: flightOffer.value!.departFlight.airlineCompany.numReviews,
      image: {
        ...flightOffer.value!.departFlight.airplane.images.find(x => x.kind === 'main')!.image,
        category: ImageCategory.Airplane
      }
    }
  });
}

function updatePageTitle () {
  if (offerDataAvailable.value && flightOffer.value) {
    const flight = flightOffer.value.departFlight;
    extendPageTitle(flight.departAirport.city.name, flight.arriveAirport.city.name);
  }
}

function extendPageTitle (fromCityName: ILocalizableValue, toCityName: ILocalizableValue) {
  const from = getLocalizeableValue(fromCityName, locale.value as Locale);
  const to = getLocalizeableValue(toCityName, locale.value as Locale);
  (route.meta.title as any).resName = getI18nResName2('flightDetailsPage', 'titleExt');
  (route.meta.title as any).resArgs = { from, to };
}

watch(flightDetailsFetch.status, () => {
  if (flightDetailsFetch.status.value === 'error') {
    isError.value = true;
  }
  if (offerDataAvailable.value && !flightOffer.value) {
    flightOffer.value = mapFlightOfferDetails(flightDetailsFetch.data.value!);
    updatePageTitle();
  }
});

watch(locale, () => {
  updatePageTitle();
});
if (process.server) {
  updatePageTitle();
}

onMounted(() => {
  updatePageTitle();
});

</script>

<template>
  <div class="flight-details-page no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="isError" class="flight-details-page-error-helm">
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        offer-kind="flights"
        :offer-id="offerId!"
        :city="flightOffer?.departFlight?.departAirport.city"
        :place-name="flightOffer?.departFlight?.departAirport.name"
        :title="flightOffer?.departFlight?.airplane.name"
        :price="flightOffer?.totalPrice"
        :review-score="flightOffer?.departFlight?.airlineCompany.reviewScore"
        :num-reviews="flightOffer?.departFlight?.airlineCompany.numReviews"
        :is-favourite="flightOffer?.isFavourite"
      />
      <StaticImage
        :ctrl-key="`${CtrlKey}-MainImage`"
        class="flight-details-airplane-image mt-xs-4 mt-s-5"
        :entity-src="flightOffer?.departFlight?.airplane.images.find(x => x.kind === 'main')?.image"
        :category="ImageCategory.Airplane"
        :is-high-priority="true"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        :alt-res-name="getI18nResName2('flightDetailsPage', 'airplaneMainImageAlt')"
      />
      <div class="flight-details-class-features">
        <div v-if="flightOffer?.departFlight" class="flight-details-class-features-caption mb-xs-1" role="heading" aria-level="4">
          {{ $t(getI18nResName2('flightDetailsPage', 'flightClassFeaturesTitle'), { class: t(getI18nResName3('searchFlights', 'class', flightOffer!.class)) }) }}
        </div>
        <div v-else class="data-loading-stub text-data-loading mb-xs-1" />
        <ol class="flight-details-class-checkmarks mb-xs-1">
          <li v-for="flightClass in AvailableFlightClasses" :key="`${CtrlKey}-${flightClass}Checkmark`" class="flight-details-class-checkmark-item">
            <div :class="`flight-details-class-checkmark brdr-1 ${ flightOffer?.class === flightClass ? 'checked' : ''}`" />
            <div class="flight-details-class-name ml-xs-2">
              {{ $t(getI18nResName3('searchFlights', 'class', flightClass)) }}
            </div>
          </li>
        </ol>
      </div>
      <div class="flight-details-class-images mt-xs-4">
        <StaticImage
          v-for="(image, idx) in offerDataAvailable ? airplaneImages : range(0, NumAirplaneFeatureImages).map(_ => undefined)"
          :key="`${CtrlKey}-AirplaneImage-${idx}`"
          :ctrl-key="`${CtrlKey}-AirplaneImage-${idx}`"
          class="flight-details-class-image brdr-3"
          :entity-src="image"
          :category="ImageCategory.AirplaneFeature"
          sizes="xs:50vw sm:40vw md:30vw lg:20vw xl:10vw"
          :alt-res-name="getI18nResName2('flightDetailsPage', 'airplaneFeatureImageAlt')"
        />
      </div>
      <div class="flight-details-company-policies brdr-2 p-xs-3">
        <div v-if="flightOffer?.departFlight" class="flight-details-policies-caption" role="heading" aria-level="4">
          {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', 'caption'), { company: getLocalizeableValue(flightOffer.departFlight.airlineCompany.name, locale as Locale) }) }}
        </div>
        <div v-else class="data-loading-stub text-data-loading" />
        <div class="flight-details-policies-details mt-xs-2">
          <div v-for="(item, idx) in ['cleaning', 'screening']" :key="`${CtrlKey}-CompanyPolicy-${idx}`" class="flight-details-policy-item mt-xs-1">
            <div class="flight-details-policy-item-icon" />
            <div v-if="flightOffer?.departFlight" class="flight-details-policy-item-text">
              {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', item as any)) }}
            </div>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
        </div>
      </div>
      <FlightDetailsCard
        :ctrl-key="`${CtrlKey}-DepartFlightCard`"
        class="flight-details-flight-card"
        :depart-city="flightOffer?.departFlight?.departAirport.city"
        :arrive-city="flightOffer?.departFlight?.arriveAirport.city"
        :depart-time-utc="flightOffer?.departFlight?.departTimeUtc"
        :arrive-time-utc="flightOffer?.departFlight?.arriveTimeUtc"
        :airline-company="flightOffer?.departFlight?.airlineCompany"
        :airplane-name="flightOffer?.departFlight?.airplane.name"
        :utc-offset-minutes="flightOffer?.departFlight?.departAirport.city.utcOffsetMin"
        kind="depart"
      />
      <FlightDetailsCard
        v-if="flightOffer && flightOffer.arriveFlight"
        :ctrl-key="`${CtrlKey}-ArriveFlightCard`"
        class="flight-details-flight-card"
        :depart-city="flightOffer?.arriveFlight.departAirport.city"
        :arrive-city="flightOffer?.arriveFlight.arriveAirport.city"
        :depart-time-utc="flightOffer?.arriveFlight.departTimeUtc"
        :arrive-time-utc="flightOffer?.arriveFlight.arriveTimeUtc"
        :airline-company="flightOffer?.arriveFlight.airlineCompany"
        :airplane-name="flightOffer?.arriveFlight.airplane.name"
        :utc-offset-minutes="flightOffer?.arriveFlight.departAirport.city.utcOffsetMin"
        kind="arrive"
      />
    </ErrorHelm>
  </div>
</template>

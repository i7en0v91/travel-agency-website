<script setup lang="ts">
import { toShortForm } from './../../helpers/components';
import { AppConfig, AvailableFlightClasses, ImageCategory, type IFlightOffer, type ILocalizableValue, type EntityId, AppPage, getPagePath, type Locale, getLocalizeableValue, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointFlightOfferDetails } from './../../server/api-definitions';
import orderBy from 'lodash-es/orderBy';
import range from 'lodash-es/range';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import FlightDetailsCard from './../../components/common-page-components/flight-details-card.vue';
import type { IFlightOfferDetailsDto } from '../../server/api-definitions';
import { mapFlightOfferDetails } from './../../helpers/entity-mappers';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import type { ControlKey } from './../../helpers/components';

const NumAirplaneFeatureImages = 8;

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();

const offerParam = useRoute().params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const offerId: EntityId = offerParam;

definePageMeta({
  title: { resName: getI18nResName2('flightDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey: ControlKey = ['Page', 'FlightDetails'];

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const flightDetailsFetch = await useFetch<IFlightOfferDetailsDto, IFlightOfferDetailsDto>(() => `/${ApiEndpointFlightOfferDetails(offerId)}`,
  {
    server: true,
    lazy: true,
    cache:  (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    query: { drafts: enabled },
    dedupe: 'defer',
    immediate: !!offerId,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });
const offerDataAvailable = computed(() => flightDetailsFetch.status.value === 'success' && flightDetailsFetch.data?.value?.departFlight);
const flightOffer = ref<Omit<IFlightOffer, 'dataHash'> | undefined>(flightDetailsFetch.data?.value ? mapFlightOfferDetails(flightDetailsFetch.data.value!) : undefined);
const airplaneImages = computed(() => (offerDataAvailable.value && flightOffer.value?.departFlight) ? orderBy(flightOffer.value!.departFlight.airplane.images.filter(x => x.kind === 'window' || x.kind === 'common' || x.kind === flightOffer.value!.class), ['order'], ['asc']).map(x => x.image) : undefined);

if (import.meta.server && offerDataAvailable.value) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'flights',
      title: flightOffer.value!.departFlight.airplane.name,
      city: flightOffer.value!.departFlight.departAirport.city,
      price: flightOffer.value!.totalPrice.toNumber(),
      dateUnixUtc: flightOffer.value!.departFlight.departTimeUtc.getTime(),
      utcOffsetMin: flightOffer.value!.departFlight.departAirport.city.utcOffsetMin,
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
  if (offerDataAvailable.value && !flightOffer.value) {
    flightOffer.value = mapFlightOfferDetails(flightDetailsFetch.data.value!);
    updatePageTitle();
  }
});

watch(locale, () => {
  updatePageTitle();
});
if (import.meta.server) {
  updatePageTitle();
}

onMounted(() => {
  updatePageTitle();
});

</script>

<template>
  <article class="flight-details-page no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="flightDetailsFetch.status.value === 'error'" class="flight-details-page-error-helm">
      <LazyOfferDetailsBreadcrumbs
        :ctrl-key="[...CtrlKey, 'Breadcrumbs']"
        offer-kind="flights"
        :city="flightOffer?.departFlight?.departAirport.city"
        :place-name="flightOffer?.departFlight?.departAirport.name"
      />
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        class="mt-xs-4 mt-s-5"
        offer-kind="flights"
        :offer-id="offerId!"
        :city="flightOffer?.departFlight?.departAirport.city"
        :title="flightOffer?.departFlight?.airplane.name"
        :price="flightOffer?.totalPrice"
        :review-score="flightOffer?.departFlight?.airlineCompany.reviewSummary.score"
        :num-reviews="flightOffer?.departFlight?.airlineCompany.reviewSummary.numReviews"
        :btn-res-name="getI18nResName2('offerDetailsPage', 'bookBtn')"
        :btn-link-url="navLinkBuilder.buildLink(flightOffer ? `/${getPagePath(AppPage.BookFlight)}/${offerId}` : route.fullPath, locale as Locale)"
      />
      <StaticImage
        :ctrl-key="[...CtrlKey, 'StaticImg', 1]"
        class="flight-details-airplane-image mt-xs-4 mt-s-5"
        :src="flightOffer?.departFlight?.airplane.images.find(x => x.kind === 'main')?.image"
        :category="ImageCategory.Airplane"
        :high-priority="true"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        :alt="{ resName: getI18nResName2('flightDetailsPage', 'airplaneMainImageAlt') }"
      />
      <section class="flight-details-class-features">
        <h2 v-if="flightOffer?.departFlight" class="flight-details-class-features-caption mb-xs-1">
          {{ $t(getI18nResName2('flightDetailsPage', 'flightClassFeaturesTitle'), { class: t(getI18nResName3('searchFlights', 'class', flightOffer!.class)) }) }}
        </h2>
        <div v-else class="data-loading-stub text-data-loading mb-xs-1" />
        <ol class="flight-details-class-checkmarks mb-xs-1">
          <li v-for="flightClass in AvailableFlightClasses" :key="`${toShortForm(CtrlKey)}-${flightClass}Checkmark`" class="flight-details-class-checkmark-item">
            <div :class="`flight-details-class-checkmark brdr-1 ${ flightOffer?.class === flightClass ? 'checked' : ''}`" />
            <div class="flight-details-class-name ml-xs-2">
              {{ $t(getI18nResName3('searchFlights', 'class', flightClass)) }}
            </div>
          </li>
        </ol>
      </section>
      <section class="flight-details-class-images mt-xs-4">
        <StaticImage
          v-for="(image, idx) in offerDataAvailable ? airplaneImages : range(0, NumAirplaneFeatureImages).map(_ => undefined)"
          :key="`${toShortForm(CtrlKey)}-AirplaneImage-${idx}`"
          :ctrl-key="[...CtrlKey, 'Airplane', 'StaticImg', idx]"
          class="flight-details-class-image brdr-3"
          :src="image"
          :category="ImageCategory.AirplaneFeature"
          sizes="xs:50vw sm:40vw md:30vw lg:20vw xl:10vw"
          :alt="{ resName: getI18nResName2('flightDetailsPage', 'airplaneFeatureImageAlt') }"
        />
      </section>
      <section class="flight-details-company-policies brdr-2 p-xs-3">
        <h2 v-if="flightOffer?.departFlight" class="flight-details-policies-caption">
          {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', 'caption'), { company: getLocalizeableValue(flightOffer.departFlight.airlineCompany.name, locale as Locale) }) }}
        </h2>
        <div v-else class="data-loading-stub text-data-loading" />
        <div class="flight-details-policies-details mt-xs-2">
          <div v-for="(item, idx) in ['cleaning', 'screening']" :key="`${toShortForm(CtrlKey)}-CompanyPolicy-${idx}`" class="flight-details-policy-item mt-xs-1">
            <div class="flight-details-policy-item-icon" />
            <div v-if="flightOffer?.departFlight" class="flight-details-policy-item-text">
              {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', item as any)) }}
            </div>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
        </div>
      </section>
      <FlightDetailsCard
        :ctrl-key="[...CtrlKey, 'Card', 'DepartFlight']"
        class="flight-details-flight-card"
        :depart-city="flightOffer?.departFlight?.departAirport.city"
        :arrive-city="flightOffer?.departFlight?.arriveAirport.city"
        :depart-time-utc="flightOffer?.departFlight?.departTimeUtc"
        :arrive-time-utc="flightOffer?.departFlight?.arriveTimeUtc"
        :airline-company="flightOffer?.departFlight?.airlineCompany"
        :airplane-name="flightOffer?.departFlight?.airplane.name"
        :utc-offset-minutes="flightOffer?.departFlight?.departAirport.city.utcOffsetMin"
        kind="depart"
        tag="h2"
      />
      <FlightDetailsCard
        v-if="flightOffer && flightOffer.arriveFlight"
        :ctrl-key="[...CtrlKey, 'Card', 'ArriveFlight']"
        class="flight-details-flight-card"
        :depart-city="flightOffer?.arriveFlight.departAirport.city"
        :arrive-city="flightOffer?.arriveFlight.arriveAirport.city"
        :depart-time-utc="flightOffer?.arriveFlight.departTimeUtc"
        :arrive-time-utc="flightOffer?.arriveFlight.arriveTimeUtc"
        :airline-company="flightOffer?.arriveFlight.airlineCompany"
        :airplane-name="flightOffer?.arriveFlight.airplane.name"
        :utc-offset-minutes="flightOffer?.arriveFlight.departAirport.city.utcOffsetMin"
        kind="arrive"
        tag="h2"
      />
    </ErrorHelm>
  </article>
</template>

<script setup lang="ts">
import { AvailableFlightClasses, ImageCategory, type IFlightOffer, type ILocalizableValue, type EntityId, AppPage, getPagePath, type Locale, getLocalizeableValue, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointFlightOfferDetails } from './../../server/api-definitions';
import orderBy from 'lodash-es/orderBy';
import range from 'lodash-es/range';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import FlightDetailsCard from './../../components/common-page-components/flight-details-card.vue';
import { type IFlightOfferDetailsDto } from '../../server/api-definitions';
import { mapFlightOfferDetails } from './../../helpers/entity-mappers';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';

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

const CtrlKey = 'FlightOfferDetailsSummary';

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const flightDetailsFetch = await useFetch<IFlightOfferDetailsDto, IFlightOfferDetailsDto>(`/${ApiEndpointFlightOfferDetails(offerId ?? -1)}`,
  {
    server: true,
    lazy: true,
    cache: 'no-cache',
    query: { drafts: enabled },
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
  <article class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <ErrorHelm :is-error="flightDetailsFetch.status.value === 'error'">
      <OfferDetailsBreadcrumbs
        :ctrl-key="`${CtrlKey}-Breadcrumbs`"
        offer-kind="flights"
        :city="flightOffer?.departFlight?.departAirport.city"
        :place-name="flightOffer?.departFlight?.departAirport.name"
      />
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        class="mt-6 sm:mt-8"
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
        :ctrl-key="`${CtrlKey}-MainImage`"
        class="mt-6 sm:mt-8 shadow-md shadow-gray-400 dark:shadow-gray-700"
        :ui="{ wrapper: 'w-full h-[295px] sm:h-[395px] rounded-lg', img: 'rounded-lg object-cover', stub: 'rounded-lg' }"
        :entity-src="flightOffer?.departFlight?.airplane.images.find(x => x.kind === 'main')?.image"
        :category="ImageCategory.Airplane"
        :is-high-priority="true"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        :alt-res-name="getI18nResName2('flightDetailsPage', 'airplaneMainImageAlt')"
      />
      <section class="flex flex-row flex-wrap items-center gap-3 overflow-x-hidden mt-6 sm:mt-10">
        <h2 v-if="flightOffer?.departFlight" class="flex-grow-1 flex-shrink-0 basis-auto w-fit max-w-[90vw] text-2xl font-semibold text-gray-600 dark:text-gray-300 break-words mb-1">
          {{ $t(getI18nResName2('flightDetailsPage', 'flightClassFeaturesTitle'), { class: t(getI18nResName3('searchFlights', 'class', flightOffer!.class)) }) }}
        </h2>
        <USkeleton v-else class="w-1/2 sm:w-1/3 h-8 mb-1" />
        <ol class="w-fit flex flex-row flex-wrap items-center justify-end gap-7 ml-auto mb-1">
          <li v-for="flightClass in AvailableFlightClasses" :key="`${CtrlKey}-${flightClass}Checkmark`" class="flex-grow-0 flex-shrink basis-auto flex flex-row flex-nowrap items-center align-middle justify-self-end">
            <UCheckbox :model-value="flightOffer?.class === flightClass" disabled class="inline-block" :ui="{ wrapper: 'flex-initial', base: 'disabled:opacity-100 disabled:cursor-default' }"/>
            <div class="ml-2 inline-block">
              {{ $t(getI18nResName3('searchFlights', 'class', flightClass)) }}
            </div>
          </li>
        </ol>
      </section>
      <section class="max-w-[1200px] mx-auto grid grid-flow-row auto-rows-[0] grid-rows-airplanephotosxs md:grid-rows-airplanephotosmd grid-cols-airplanephotosxs sm:grid-cols-airplanephotossm overflow-hidden justify-items-center gap-5 mt-6">
        <StaticImage
          v-for="(image, idx) in offerDataAvailable ? airplaneImages : range(0, NumAirplaneFeatureImages).map(_ => undefined)"
          :key="`${CtrlKey}-AirplaneImage-${idx}`"
          :ctrl-key="`${CtrlKey}-AirplaneImage-${idx}`"
          class="flight-details-class-image"
          :ui="{ wrapper: 'flex-initial w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] rounded-lg', img: 'rounded-lg object-cover', stub: 'rounded-lg' }"
          :entity-src="image"
          :category="ImageCategory.AirplaneFeature"
          sizes="xs:50vw sm:40vw md:30vw lg:20vw xl:10vw"
          :alt-res-name="getI18nResName2('flightDetailsPage', 'airplaneFeatureImageAlt')"
        />
      </section>
      <section class="rounded-md p-4 mt-6 sm:mt-10 bg-primary-300 dark:bg-primary-600 text-primary-900 dark:text-white">
        <h2 v-if="flightOffer?.departFlight" class="block w-fit whitespace-normal break-words text-2xl font-semibold">
          {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', 'caption'), { company: getLocalizeableValue(flightOffer.departFlight.airlineCompany.name, locale as Locale) }) }}
        </h2>
        <USkeleton v-else class="w-1/3 h-6" />
        <div class="w-full h-auto flex flex-row flex-wrap items-center mt-2 text-sm sm:text-base font-normal">
          <div v-for="(item, idx) in ['cleaning', 'screening']" :key="`${CtrlKey}-CompanyPolicy-${idx}`" class="mt-1 flex-auto w-max h-auto flex flex-row flex-nowrap items-center gap-4">
            <UIcon name="i-ion-stopwatch" class="w-6 h-6 bg-primary-900 dark:bg-white self-start"/>
            <div v-if="flightOffer?.departFlight" class="block flex-auto w-full whitespace-normal">
              {{ $t(getI18nResName3('flightDetailsPage', 'companyPolicies', item as any)) }}
            </div>
            <USkeleton v-else class="w-1/4 h-4" />
          </div>
        </div>
      </section>
      <div class="w-full h-auto mt-10">
        <FlightDetailsCard
          :ctrl-key="`${CtrlKey}-DepartFlightCard`"
          class="block w-full"
          :depart-city="flightOffer?.departFlight?.departAirport.city"
          :arrive-city="flightOffer?.departFlight?.arriveAirport.city"
          :depart-time-utc="flightOffer?.departFlight?.departTimeUtc"
          :arrive-time-utc="flightOffer?.departFlight?.arriveTimeUtc"
          :airline-company="flightOffer?.departFlight?.airlineCompany"
          :airplane-name="flightOffer?.departFlight?.airplane.name"
          :utc-offset-minutes="flightOffer?.departFlight?.departAirport.city.utcOffsetMin"
          kind="depart"
          :ui="{
            tag: 'h2',
            layout: 'landscape'
          }"
        />
      </div>
      <div v-if="flightOffer && flightOffer.arriveFlight" class="w-full h-auto mt-10">
        <FlightDetailsCard
          :ctrl-key="`${CtrlKey}-ArriveFlightCard`"
          :depart-city="flightOffer?.arriveFlight.departAirport.city"
          :arrive-city="flightOffer?.arriveFlight.arriveAirport.city"
          :depart-time-utc="flightOffer?.arriveFlight.departTimeUtc"
          :arrive-time-utc="flightOffer?.arriveFlight.arriveTimeUtc"
          :airline-company="flightOffer?.arriveFlight.airlineCompany"
          :airplane-name="flightOffer?.arriveFlight.airplane.name"
          :utc-offset-minutes="flightOffer?.arriveFlight.departAirport.city.utcOffsetMin"
          kind="arrive"
          :ui="{
            tag: 'h2',
            layout: 'landscape'
          }"
        />
      </div>
    </ErrorHelm>
  </article>
</template>

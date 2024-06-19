<script setup lang="ts">

import { type Locale } from './../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';
import { ImageCategory, type EntityDataAttrsOnly, type IFlightOffer, type ILocalizableValue, type EntityId } from './../../shared/interfaces';
import { getI18nResName3, getI18nResName2, type I18nResName } from './../../shared/i18n';
import { getLocalizeableValue } from './../../shared/common';
import OfferBooking from './../../components/booking-page/offer-booking.vue';
import { type IOfferBookingStoreFactory } from './../../stores/offer-booking-store';
import OfferDetailsBreadcrumbs from './../../components/common-page-components/offer-details-breadcrumbs.vue';
import FlightDetailsCard from './../../components/common-page-components/flight-details-card.vue';

const { locale } = useI18n();
const localePath = useLocalePath();

const route = useRoute();

const isError = ref(false);

const offerParam = route.params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  await navigateTo(localePath(`/${getHtmlPagePath(HtmlPage.Index)}`));
}
const offerId: EntityId = offerParam;

definePageMeta({
  title: { resName: getI18nResName2('flightBookingPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'FlightOfferBooking';

const PriceDecompositionWeights: { labelResName: I18nResName, amount: number }[] = [
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'fare'), amount: 0.6 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'discount'), amount: 0.05 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'taxes'), amount: 0.3 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'fee'), amount: 0.05 }
];

const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
const offerBookingStore = await offerBookingStoreFactory.createNewBooking<IFlightOffer>(offerId!, 'flights', undefined);

const flightOffer = ref<EntityDataAttrsOnly<IFlightOffer> | undefined>(offerBookingStore.booking?.offer);
const offerDataAvailable = computed(() => offerBookingStore.status === 'success' && offerBookingStore.booking?.offer && !isError.value);

const priceDecomposition = computed(() => PriceDecompositionWeights.map((w) => { return { labelResName: w.labelResName, amount: flightOffer.value ? flightOffer.value!.totalPrice.toNumber() * w.amount : undefined }; }));

if (import.meta.server) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'flights',
      title: flightOffer.value!.departFlight.airplane.name,
      city: flightOffer.value!.departFlight.departAirport.city,
      price: flightOffer.value!.totalPrice.toNumber(),
      reviewScore: flightOffer.value!.departFlight.airlineCompany.reviewScore,
      numReviews: flightOffer.value!.departFlight.airlineCompany.numReviews,
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
  if (flightOffer.value) {
    const flight = flightOffer.value.departFlight;
    extendPageTitle(flight.departAirport.city.name, flight.arriveAirport.city.name);
  }
}

function extendPageTitle (fromCityName: ILocalizableValue, toCityName: ILocalizableValue) {
  const from = getLocalizeableValue(fromCityName, locale.value as Locale);
  const to = getLocalizeableValue(toCityName, locale.value as Locale);
  (route.meta.title as any).resName = getI18nResName2('flightBookingPage', 'titleExt');
  (route.meta.title as any).resArgs = { from, to };
}

watch(() => offerBookingStore.status, () => {
  if (offerBookingStore.status === 'error') {
    isError.value = true;
    flightOffer.value = undefined;
  }
  if (offerDataAvailable.value) {
    flightOffer.value = offerBookingStore.booking!.offer;
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
  <div class="flight-book-page">
    <ErrorHelm :is-error="isError" class="flight-book-page-error-helm">
      <OfferDetailsBreadcrumbs
        :ctrl-key="`${CtrlKey}-Breadcrumbs`"
        offer-kind="flights"
        :city="flightOffer?.departFlight?.departAirport.city"
        :place-name="flightOffer?.departFlight?.departAirport.name"
      />
      <OfferBooking
        :ctrl-key="`${CtrlKey}-${offerId}`"
        :offer-id="offerId!"
        offer-kind="flights"
        :service-level="undefined"
        class="mt-xs-3 mt-s-4"
        :price-decompoisition="priceDecomposition"
      >
        <template #offer-card>
          <FlightDetailsCard
            :ctrl-key="`${CtrlKey}-DepartFlightCard`"
            class="flight-card compact-layout"
            :depart-city="flightOffer?.departFlight?.departAirport.city"
            :arrive-city="flightOffer?.departFlight?.arriveAirport.city"
            :depart-time-utc="flightOffer?.departFlight?.departTimeUtc"
            :arrive-time-utc="flightOffer?.departFlight?.arriveTimeUtc"
            :airline-company="flightOffer?.departFlight?.airlineCompany"
            :airplane-name="flightOffer?.departFlight?.airplane.name"
            :utc-offset-minutes="flightOffer?.departFlight?.departAirport.city.utcOffsetMin"
            :additional-info="flightOffer ? { price: (flightOffer.arriveFlight ? flightOffer.totalPrice.div(2) : flightOffer.totalPrice) } : { price: undefined }"
            kind="depart"
            tag="h1"
          />
          <FlightDetailsCard
            v-if="flightOffer && flightOffer.arriveFlight"
            :ctrl-key="`${CtrlKey}-ArriveFlightCard`"
            class="flight-card compact-layout mt-xs-4 mt-s-6"
            :depart-city="flightOffer?.arriveFlight.departAirport.city"
            :arrive-city="flightOffer?.arriveFlight.arriveAirport.city"
            :depart-time-utc="flightOffer?.arriveFlight.departTimeUtc"
            :arrive-time-utc="flightOffer?.arriveFlight.arriveTimeUtc"
            :airline-company="flightOffer?.arriveFlight.airlineCompany"
            :airplane-name="flightOffer?.arriveFlight.airplane.name"
            :utc-offset-minutes="flightOffer?.arriveFlight.departAirport.city.utcOffsetMin"
            :additional-info="flightOffer ? { price: flightOffer.totalPrice.div(2) } : { price: undefined }"
            kind="arrive"
            tag="div"
          />
        </template>
      </OfferBooking>
    </ErrorHelm>
  </div>
</template>

<script setup lang="ts">

import dayjs from 'dayjs';
import { type Locale } from './../../shared/constants';
import { type StayServiceLevel, ImageCategory, type EntityDataAttrsOnly, type IStayOfferDetails, type ILocalizableValue } from './../../shared/interfaces';
import { getI18nResName3, getI18nResName2, type I18nResName } from './../../shared/i18n';
import { getLocalizeableValue } from './../../shared/common';
import OfferBooking from './../../components/booking-page/offer-booking.vue';
import { useOfferBookingStoreFactory, type IOfferBookingStoreFactory } from './../../stores/offer-booking-store';
import OfferDetailsBreadcrumbs from './../../components/common-page-components/offer-details-breadcrumbs.vue';
import { AppException, AppExceptionCodeEnum } from './../../shared/exceptions';

const { d, locale } = useI18n();
const localePath = useLocalePath();

const route = useRoute();
const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

const offerParam = route.params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  navigateTo(localePath('/'));
}
let offerId: number | undefined;
try {
  offerId = parseInt(offerParam);
} catch (err: any) {
  logger.warn(`(StayOfferBooking) failed to parse stay offer id: param=${offerParam}`, err);
  throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid offer id argument', 'error-page');
}

const reqEvent = import.meta.server ? useRequestEvent() : undefined;
const serviceLevel = ((reqEvent?.context.ogImageRequest?.serviceLevel ?? route.query.serviceLevel)?.toString() ?? '').trim() as StayServiceLevel;
if (!['base', 'cityView-1', 'cityView-2', 'cityView-3'].includes(serviceLevel)) {
  logger.warn(`(StayOfferBooking) failed to parse service level argument: serviceLevel=${serviceLevel}, offerId=${offerParam}`);
  throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'invalid service level argument', 'error-page');
}

definePageMeta({
  title: { resName: getI18nResName2('stayBookingPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'StayOfferBooking';

const PriceDecompositionWeights: { labelResName: I18nResName, amount: number }[] = [
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'fare'), amount: 0.6 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'discount'), amount: 0.05 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'taxes'), amount: 0.3 },
  { labelResName: getI18nResName3('bookingCommon', 'pricingDecomposition', 'fee'), amount: 0.05 }
];

const offerBookingStoreFactory = useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
const offerBookingStore = await offerBookingStoreFactory.createNewBooking<IStayOfferDetails>(offerId!, 'stays', serviceLevel);

const stayOffer = ref<EntityDataAttrsOnly<IStayOfferDetails> | undefined>(offerBookingStore.booking?.offer);
const offerDataAvailable = computed(() => offerBookingStore.status === 'success' && offerBookingStore.booking?.offer && !isError.value);

const numDays = computed(() => stayOffer.value ? (Math.ceil(dayjs(stayOffer.value.checkOut).diff(stayOffer.value.checkIn, 'day')) ?? 1) : undefined);
const pricePerNight = computed(() => (stayOffer.value && numDays.value !== undefined) ? (stayOffer.value.prices[serviceLevel].toNumber()) : undefined);
const totalPriceForPeriod = computed(() => (numDays.value !== undefined && pricePerNight.value !== undefined) ? (numDays.value * pricePerNight.value) : undefined);
const priceDecomposition = computed(() => PriceDecompositionWeights.map((w) => { return { labelResName: w.labelResName, amount: totalPriceForPeriod.value !== undefined ? (totalPriceForPeriod.value * w.amount) : undefined }; }));

if (import.meta.server) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'stays',
      title: stayOffer.value!.stay.name,
      city: stayOffer.value!.stay.city,
      price: pricePerNight.value,
      reviewScore: stayOffer.value!.stay.reviewScore,
      numReviews: stayOffer.value!.stay.numReviews,
      dateUnixUtc: stayOffer.value!.checkIn.getTime(),
      image: {
        ...(stayOffer!.value!.stay.images.find(i => i.order === 0)),
        category: ImageCategory.Hotel
      }
    }
  });
}

function updatePageTitle () {
  if (offerDataAvailable.value && stayOffer.value) {
    extendPageTitle(stayOffer.value.stay.name, stayOffer.value.checkIn, stayOffer.value.checkOut);
  }
}

function extendPageTitle (stayName: ILocalizableValue, checkIn: Date, checkOut: Date) {
  const titleArgs = {
    stay: getLocalizeableValue(stayName, locale.value as Locale),
    from: d(checkIn, 'day'),
    to: d(checkOut, 'day')
  };
  (route.meta.title as any).resName = getI18nResName2('stayDetailsPage', 'titleExt');
  (route.meta.title as any).resArgs = titleArgs;
}

watch(() => offerBookingStore.status, () => {
  if (offerBookingStore.status === 'error') {
    isError.value = true;
    stayOffer.value = undefined;
  }
  if (offerDataAvailable.value) {
    stayOffer.value = offerBookingStore.booking!.offer;
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
  <div class="stay-book-page">
    <ErrorHelm :is-error="isError" class="stay-book-page-error-helm">
      <OfferDetailsBreadcrumbs
        :ctrl-key="`${CtrlKey}-Breadcrumbs`"
        offer-kind="stays"
        :city="stayOffer?.stay?.city"
        :place-name="stayOffer?.stay?.name"
      />
      <OfferBooking
        :ctrl-key="`${CtrlKey}-${offerId}`"
        :offer-id="offerId!"
        offer-kind="stays"
        :service-level="serviceLevel"
        class="mt-xs-3 mt-s-4"
        :price-decompoisition="priceDecomposition"
      >
        <template #offer-card>
          <StayDetailsCard
            :ctrl-key="`${CtrlKey}-StayCard`"
            :service-level="serviceLevel"
            :name="stayOffer?.stay.name"
            :price="pricePerNight"
            :city="stayOffer?.stay.city"
            :check-in="stayOffer?.checkIn"
            :check-out="stayOffer?.checkOut"
            tag="h1"
          />
        </template>
      </OfferBooking>
    </ErrorHelm>
  </div>
</template>

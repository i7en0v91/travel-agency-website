<script setup lang="ts">
import { type BookStayPageArgs, AppException, AppExceptionCodeEnum, getLocalizeableValue, type StayServiceLevel, ImageCategory, type EntityDataAttrsOnly, type IStayOfferDetails, type ILocalizableValue, type EntityId, AvailableStayServiceLevel, AppPage, type Locale, getI18nResName3, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import OfferBooking from './../../components/booking-page/offer-booking.vue';
import type { IOfferBookingStoreFactory } from './../../stores/offer-booking-store';
import OfferDetailsBreadcrumbs from './../../components/common-page-components/offer-details-breadcrumbs.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import dayjs from 'dayjs';
import { getCommonServices } from '../../helpers/service-accessors';

const { d, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();
const logger = getCommonServices().getLogger();

const isError = ref(false);

const offerParam = route.params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const offerId: EntityId = offerParam;

const reqEvent = import.meta.server ? useRequestEvent() : undefined;
const stayBookOgImageQueryInfo = (reqEvent?.context.cacheablePageParams as any) as BookStayPageArgs;
const serviceLevel = ((stayBookOgImageQueryInfo?.serviceLevel ?? route.query.serviceLevel)?.toString() ?? '').trim() as StayServiceLevel;
if (!AvailableStayServiceLevel.includes(serviceLevel)) {
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

const offerBookingStoreFactory = await useOfferBookingStoreFactory() as IOfferBookingStoreFactory;
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
  <article class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <ErrorHelm v-model:is-error="isError">
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
        class="mt-4 sm:mt-6"
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
          />
        </template>
      </OfferBooking>
    </ErrorHelm>
  </article>
</template>

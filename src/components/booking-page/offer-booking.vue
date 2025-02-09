<script setup lang="ts" generic="TOffer extends IFlightOffer | IStayOfferDetails">
import { type ILocalizableValue, ImageCategory, type StayServiceLevel, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IStayOfferDetails, type OfferKind, AppPage, getPagePath, type Locale, AvailableLocaleCodes, UserNotificationLevel, type I18nResName, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import fromPairs from 'lodash-es/fromPairs';
import PaymentController from './../payments/payment-controller.vue';
import PricingDetails from './pricing-details.vue';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offerKind: OfferKind,
  offerId: EntityId,
  serviceLevel: TOffer extends IStayOfferDetails ? StayServiceLevel : undefined,
  priceDecompoisition: { labelResName: I18nResName, amount?: number }[]
};
const { ctrlKey, offerId, offerKind, serviceLevel } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const { requestUserAction } = usePreviewState();
const userNotificationStore = useUserNotificationStore();
const offerBookingStoreFactory = await useOfferBookingStoreFactory();
const offerBookingStore = await offerBookingStoreFactory.createNewBooking<TOffer>(offerId, offerKind, serviceLevel);

const offer = ref<EntityDataAttrsOnly<IFlightOffer | IStayOfferDetails> | undefined>(offerBookingStore.booking?.offer as EntityDataAttrsOnly<TOffer>);
const offerDataAvailable = computed(() => offerBookingStore.status === 'success' && offerBookingStore.booking?.offer);

const paymentProcessing = ref(false);

watch(() => offerBookingStore.status, () => {
  if (offerBookingStore.status === 'error') {
    return;
  }
  if (offerDataAvailable.value) {
    offer.value = offerBookingStore.booking!.offer as any;
  }
});

function getI18ResAsLocalizableValue (resName: I18nResName): ILocalizableValue {
  return (fromPairs(AvailableLocaleCodes.map(l => [l, t(resName)])) as any) as ILocalizableValue;
}

async function onPay (): Promise<void> {
  logger.debug(`(OfferBooking) pay handler, ctrlKey=${ctrlKey}, offerId=${offerId}, kind=${offerKind}`);
  
  if(!await requestUserAction()) {
    logger.verbose(`(OfferBooking) pay handler hasn't run - not allowed in preview mode, ctrlKey=${ctrlKey}, offerId=${offerId}, kind=${offerKind}`);
    return;
  }

  paymentProcessing.value = true;
  try {
    const bookingId = await offerBookingStore.store();
    await navigateTo(navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale.value as Locale));
    logger.debug(`(OfferBooking) pay handler completed, ctrlKey=${ctrlKey}, offerId=${offerId}, kind=${offerKind}`);
  } catch (err: any) {
    logger.warn(`(OfferBooking) exception occured while executing book HTTP request, ctrlKey=${ctrlKey}, offerId=${offerId}, kind=${offerKind}`, err);
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'unknown')
    });
  } finally {
    paymentProcessing.value = false;
  }
}

</script>

<template>
  <section class="w-full h-auto grid grid-rows-offerbookingxs grid-cols-offerbookingxs lg:grid-rows-offerbookinglg lg:grid-cols-offerbookinglg gap-4 lg:gap-6">
    <div class="w-full h-auto row-start-1 row-end-2 col-start-1 col-end-2">
      <slot name="offer-card" />
    </div>
    <div class="w-full h-auto row-start-3 row-end-4 col-start-1 col-end-2 lg:row-start-2 lg:row-end-3">
      <ClientOnly>    
        <PaymentController :ctrl-key="`${ctrlKey}-Payments`" :payment-processing="paymentProcessing" :amount="offer?.totalPrice?.toNumber()" @pay="onPay" />
        <template #fallback>
          <ComponentWaitingIndicator :ctrl-key="`${ctrlKey}-Payments-ClientFallback`" class="mt-4"/>
        </template>
      </ClientOnly>
    </div>
    <div class="w-full h-auto row-start-2 row-end-3 col-start-1 col-end-2 lg:row-start-1 lg:row-end-3 lg:col-start-2 lg:col-end-3">
      <PricingDetails
        :ctrl-key="`${ctrlKey}-PricingDetails`"
        :image-entity-src="offer ? (offerKind === 'flights' ?
          ((offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airplane.images.find(i => i.order === 0)!.image) :
          ((offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.images.find(i => i.order === 0))
        ) : undefined"
        :category="offerKind === 'flights' ? ImageCategory.Airplane : ImageCategory.Hotel"
        :image-alt-res-name="offerKind === 'flights' ? getI18nResName2('flightDetailsPage', 'airplaneMainImageAlt') : getI18nResName2('stayDetailsPage', 'stayMainImageAlt') "
        :heading="offer ? (offerKind === 'flights' ?
          {
            sub: (offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airplane.name,
            main: getI18ResAsLocalizableValue(getI18nResName3('searchFlights', 'class', (offer as EntityDataAttrsOnly<IFlightOffer>).class as any)),
            reviewSummary: (offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.reviewSummary
          } : {
            sub: (offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.name,
            main: getI18ResAsLocalizableValue(getI18nResName3('stayDetailsPage', 'availableRooms', serviceLevel === 'Base' ? 'base' : 'city')),
            reviewSummary: (offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.reviewSummary
          }) : undefined"
        :price-decompoisition="priceDecompoisition"
      />
    </div>
  </section>
</template>

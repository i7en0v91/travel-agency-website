<script setup lang="ts" generic="TOffer extends IFlightOffer | IStayOfferDetails">
import fromPairs from 'lodash-es/fromPairs';
import { type ILocalizableValue, ImageCategory, type StayServiceLevel, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IStayOfferDetails, type OfferKind } from './../../shared/interfaces';
import PaymentController from './../payments/payment-controller.vue';
import PricingDetails from './pricing-details.vue';
import { type I18nResName, getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import { AvailableLocaleCodes, UserNotificationLevel } from './../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';
import ComponentWaiterIndicator from './../../components/component-waiting-indicator.vue';

interface IProps {
  ctrlKey: string,
  offerKind: OfferKind,
  offerId: EntityId,
  serviceLevel: TOffer extends IStayOfferDetails ? StayServiceLevel : undefined,
  priceDecompoisition: { labelResName: I18nResName, amount?: number }[]
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const { t } = useI18n();
const localePath = useLocalePath();

const userNotificationStore = useUserNotificationStore();
const offerBookingStoreFactory = await useOfferBookingStoreFactory();
const offerBookingStore = await offerBookingStoreFactory.createNewBooking<TOffer>(props.offerId, props.offerKind, props.serviceLevel);

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
  logger.debug(`(OfferBooking) pay handler, ctrlKey=${props.ctrlKey}, offerId=${props.offerId}, kind=${props.offerKind}`);
  paymentProcessing.value = true;
  try {
    const bookingId = await offerBookingStore.store();
    await navigateTo(localePath(`/${getHtmlPagePath(HtmlPage.BookingDetails)}/${bookingId}`));
    logger.debug(`(OfferBooking) pay handler completed, ctrlKey=${props.ctrlKey}, offerId=${props.offerId}, kind=${props.offerKind}`);
  } catch (err: any) {
    logger.warn(`(OfferBooking) exception occured while executing book HTTP request, ctrlKey=${props.ctrlKey}, offerId=${props.offerId}, kind=${props.offerKind}`, err);
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
  <section class="offer-booking">
    <div class="offer-booking-card-div">
      <slot name="offer-card" />
    </div>
    <div class="payment-controller-div">
      <ClientOnly>    
        <PaymentController :ctrl-key="`${ctrlKey}-Payments`" :payment-processing="paymentProcessing" :amount="offer?.totalPrice?.toNumber()" @pay="onPay" />
        <template #fallback>
          <ComponentWaiterIndicator :ctrl-key="`${ctrlKey}-Payments-ClientFallback`"/>
        </template>
      </ClientOnly>
    </div>
    <div class="pricing-details-div">
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
            reviewScore: (offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.reviewScore,
            reviewsCount: (offer as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.numReviews
          } : {
            sub: (offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.name,
            main: getI18ResAsLocalizableValue(getI18nResName3('stayDetailsPage', 'availableRooms', props.serviceLevel === 'Base' ? 'base' : 'city')),
            reviewScore: (offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.reviewScore,
            reviewsCount: (offer as EntityDataAttrsOnly<IStayOfferDetails>).stay.numReviews
          }) : undefined"
        :price-decompoisition="priceDecompoisition"
      />
    </div>
  </section>
</template>

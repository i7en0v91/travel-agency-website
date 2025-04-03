<script setup lang="ts" generic="TOffer extends IFlightOffer | IStayOfferDetails">
import type { ControlKey } from './../../helpers/components';
import { type IReviewSummaryDto, type IFlightOfferDetailsDto, type IStayOfferDetailsDto, ApiEndpointFlightOfferDetails, ApiEndpointStayOfferReviewSummary, ApiEndpointStayOfferDetails } from './../../server/api-definitions';
import { type ILocalizableValue, ImageCategory, type StayServiceLevel, type EntityId, type EntityDataAttrsOnly, type IFlightOffer, type IStayOfferDetails, type OfferKind, AppPage, getPagePath, type Locale, AvailableLocaleCodes, UserNotificationLevel, type I18nResName, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import fromPairs from 'lodash-es/fromPairs';
import PaymentController from './../payments/payment-controller.vue';
import PricingDetails from './pricing-details.vue';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';
import { mapFlightOfferDetails, mapStayOfferDetails, mapReviewSummary } from './../../helpers/entity-mappers';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offerKind: OfferKind,
  offerId: EntityId,
  serviceLevel: TOffer extends IStayOfferDetails ? StayServiceLevel : undefined,
  priceDecompoisition: { labelResName: I18nResName, amount?: number }[]
};
const { ctrlKey, offerId, offerKind, serviceLevel } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'OfferBooking' });

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const nuxtApp = useNuxtApp();
const userAccountStore = useUserAccountStore();

const { requestUserAction, enabled } = usePreviewState();
const userNotificationStore = useUserNotificationStore();

const offerFetch = offerKind === 'flights' ? 
  await useFetch<IFlightOfferDetailsDto>(() => `/${ApiEndpointFlightOfferDetails(offerId)}`,
  {
    server: true,
    lazy: true,
    cache: 'default',
    dedupe: 'cancel',
    query: { drafts: enabled },
    immediate: true,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  }) : 
  await useFetch<IStayOfferDetailsDto>(() => `/${ApiEndpointStayOfferDetails(offerId)}`,
  {
    server: true,
    lazy: true,
    cache: 'default',
    dedupe: 'cancel',
    query: { drafts: enabled },
    immediate: true,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });
const stayReviewsFetch = offerKind === 'stays' ? 
  await useFetch<IReviewSummaryDto>(() => `/${ApiEndpointStayOfferReviewSummary(offerId)}`,
  {
    server: true,
    lazy: true,
    cache: 'no-store',
    dedupe: 'cancel',
    immediate: true,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  }) : undefined;
const paymentProcessing = ref(false);

const offerData = computed(() => {
  return offerKind === 'flights' ? 
    ((offerFetch.status.value === 'success' && offerFetch.data?.value) ? 
      mapFlightOfferDetails((offerFetch.data.value as IFlightOfferDetailsDto)) : undefined) : 
    (
      (
        offerFetch.status.value === 'success' && offerFetch.data?.value && 
        stayReviewsFetch!.status.value === 'success' && stayReviewsFetch!.data?.value
      ) ? mapStayOfferDetails(offerFetch.data.value as IStayOfferDetailsDto, mapReviewSummary(stayReviewsFetch!.data.value!)) : undefined
    );
});

const amount = computed(() => offerData.value?.totalPrice?.toNumber());
const imageEntitySrc = computed(() => 
  offerData.value ? 
    (offerKind === 'flights' ?
      ((offerData.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.airplane.images.find(i => i.order === 0)!.image) :
      ((offerData.value as EntityDataAttrsOnly<IStayOfferDetails>).stay.images.find(i => i.order === 0))
    ) : undefined
  );
const heading = computed(() => 
  offerData.value ? (offerKind === 'flights' ?
    {
      sub: (offerData.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.airplane.name,
      main: getI18ResAsLocalizableValue(getI18nResName3('searchFlights', 'class', (offerData.value as EntityDataAttrsOnly<IFlightOffer>).class as any)),
      reviewSummary: (offerData.value as EntityDataAttrsOnly<IFlightOffer>).departFlight.airlineCompany.reviewSummary
    } : {
      sub: (offerData.value as EntityDataAttrsOnly<IStayOfferDetails>).stay.name,
      main: getI18ResAsLocalizableValue(getI18nResName3('stayDetailsPage', 'availableRooms', serviceLevel === 'Base' ? 'base' : 'city')),
      reviewSummary: (offerData.value as EntityDataAttrsOnly<IStayOfferDetails>).stay.reviewSummary
    }) : undefined
  );

function getI18ResAsLocalizableValue (resName: I18nResName): ILocalizableValue {
  return (fromPairs(AvailableLocaleCodes.map(l => [l, t(resName)])) as any) as ILocalizableValue;
}

async function onPay (): Promise<void> {
  logger.debug('pay handler', { ctrlKey, offerId, kind: offerKind });

  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('pay handler is not available', { ctrlKey, offerId, kind: offerKind });
    return;
  }

  const userId = userAccountStore.isAuthenticated ? userAccountStore.userId : undefined;
  if(!userId) {
    logger.warn('cannot book offer, user is unauthenticated', { ctrlKey, offerId, kind: offerKind });
    return;
  }

  paymentProcessing.value = true;
  try {
    const bookingId = await userAccountStore.bookOffer({ kind: offerKind, offerId, bookedUserId: userAccountStore.userId!, serviceLevel });
    await navigateTo(navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale.value as Locale));
    logger.verbose('pay handler completed', { ctrlKey, offerId, kind: offerKind });
  } catch (err: any) {
    logger.warn('exception occured while executing book HTTP request', err, { ctrlKey, offerId, kind: offerKind });
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
        <PaymentController :ctrl-key="[...ctrlKey, 'Payments']" :payment-processing="paymentProcessing" :amount="amount" @pay="onPay" />
        <template #fallback>
          <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'Payments', 'ClientFallback']" class="mt-4"/>
        </template>
      </ClientOnly>
    </div>
    <div class="w-full h-auto row-start-2 row-end-3 col-start-1 col-end-2 lg:row-start-1 lg:row-end-3 lg:col-start-2 lg:col-end-3">
      <PricingDetails
        :ctrl-key="[...ctrlKey, 'PricingDetails']"
        :image-entity-src="imageEntitySrc"
        :category="offerKind === 'flights' ? ImageCategory.Airplane : ImageCategory.Hotel"
        :image-alt-res-name="offerKind === 'flights' ? getI18nResName2('flightDetailsPage', 'airplaneMainImageAlt') : getI18nResName2('stayDetailsPage', 'stayMainImageAlt') "
        :heading="heading"
        :price-decompoisition="priceDecompoisition"
      />
    </div>
  </section>
</template>

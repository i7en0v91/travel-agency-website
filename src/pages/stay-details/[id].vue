<script setup lang="ts">

import range from 'lodash-es/range';
import CaptchaProtection from './../../components/forms/captcha-protection.vue';
import { getI18nResName2 } from './../../shared/i18n';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import { getLocalizeableValue } from './../../shared/common';
import { useFetchEx } from './../../shared/fetch-ex';
import { type Locale, WebApiRoutes, DefaultStayReviewScore } from './../../shared/constants';
import { type IStayOfferDetails, type ILocalizableValue, ImageCategory } from './../../shared/interfaces';
import { type IStayOfferDetailsDto } from './../../server/dto';
import { mapStayOfferDetails } from './../../shared/mappers';
import OverviewSection from './../../components/stay-details/overview-section.vue';
import AvailableRoomSection from './../../components/stay-details/available-rooms-section.vue';
import AmenitiesSection from './../../components/stay-details/amenities-section.vue';
import LocationMap from './../../components/stay-details/location-map.vue';
import ReviewSection from './../../components/stay-details/reviews/review-section.vue';
import ComponentWaiterIndicator from './../../components/component-waiting-indicator.vue';
import { useCaptchaToken, type ICaptchaTokenComposable } from './../../composables/captcha-token';
import AppConfig from './../../appconfig';
import { isRobot } from './../../composables/is-robot';

const isError = ref(false);

const { d, locale } = useI18n();
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
  logger.warn(`(StayDetails) failed to parse stay offer id: param=${offerParam}`, err);
  isError.value = true;
}

definePageMeta({
  title: { resName: getI18nResName2('stayDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'StayOfferDetailsSummary';

const isRobotRequest = isRobot();

const captcha = (process.client && AppConfig.maps && !isRobotRequest) ? ref<InstanceType<typeof CaptchaProtection>>() as Ref<InstanceType<typeof CaptchaProtection>> : undefined;
const captchaToken = ref<ICaptchaTokenComposable>();

const stayDetailsFetchRequest = await useFetchEx<IStayOfferDetailsDto, IStayOfferDetailsDto>(WebApiRoutes.StayOfferDetails(offerId ?? -1), 'error-page',
  {
    server: true,
    lazy: true,
    immediate: !!offerId,
    cache: 'no-cache',
    onResponse: (ctx) => {
      logger.verbose(`(StayDetails) received stay offer details response: id=${(ctx.response._data as IStayOfferDetailsDto)?.id}`);
      isError.value = ctx.response.status >= 400;
    },
    onResponseError: (ctx) => {
      logger.warn('(StayDetails) got stay offer details fetch response error', ctx.error, { id: offerId });
      isError.value = true;
    },
    onRequestError: (ctx) => {
      logger.warn('(StayDetails) got stay offer details fetch request error', ctx.error, { id: offerId });
      isError.value = true;
    }
  });
const stayDetailsFetch = await stayDetailsFetchRequest;
const offerDataAvailable = computed(() => stayDetailsFetch.status.value === 'success' && stayDetailsFetch.data?.value?.stay && !isError.value);
const stayOffer = ref<Omit<IStayOfferDetails, 'dataHash'> | undefined>(stayDetailsFetch.data?.value ? mapStayOfferDetails(stayDetailsFetch.data.value!) : undefined);

const nuxtApp = useNuxtApp();
if (nuxtApp.isHydrating || process.server) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'stays',
      title: stayOffer.value!.stay.name,
      city: stayOffer.value!.stay.city,
      price: stayOffer.value!.totalPrice.toNumber(),
      reviewScore: stayOffer.value!.stay.reviewScore,
      numReviews: stayOffer.value!.stay.numReviews,
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

watch(stayDetailsFetch.status, () => {
  if (stayDetailsFetch.status.value === 'error') {
    isError.value = true;
  }
  if (offerDataAvailable.value && !stayOffer.value) {
    stayOffer.value = mapStayOfferDetails(stayDetailsFetch.data.value!);
    updatePageTitle();
  }
});

watch(locale, () => {
  updatePageTitle();
});
if (process.server) {
  updatePageTitle();
}

const mapComponentVisibility = ref<'visible' | 'wait'>((AppConfig.maps || isRobotRequest) ? 'wait' : 'visible');

function onCaptchaVerified (token: string) {
  logger.info(`(StayDetails) captcha verified, ctrlKey=${CtrlKey}`);
  captchaToken.value!.onCaptchaVerified(token);
  mapComponentVisibility.value = 'visible';
}

function onCaptchaFailed (reason?: any) {
  logger.info(`(StayDetails) captcha verification failed, ctrlKey=${CtrlKey}`);
  captchaToken.value!.onCaptchaFailed(reason);
}

function startCaptchaVerification () {
  logger.verbose(`(StayDetails) starting captcha verification, ctrlKey=${CtrlKey}`);
  captchaToken.value = useCaptchaToken(captcha!);
  captchaToken.value.requestToken();
}

onMounted(() => {
  updatePageTitle();

  if (AppConfig.maps && !isRobotRequest) {
    if (captcha!.value) {
      startCaptchaVerification();
    } else {
      watch(captcha!, () => {
        if (captcha!.value) {
          startCaptchaVerification();
        }
      });
    }
  }
});

</script>

<template>
  <div class="stay-details-page no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="isError" class="stay-details-page-error-helm">
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        offer-kind="stays"
        :offer-id="offerId!"
        :city="stayOffer?.stay?.city"
        :place-name="stayOffer?.stay?.name"
        :title="stayOffer?.stay?.name"
        :price="stayOffer?.totalPrice"
        :review-score="stayOffer?.stay?.reviewScore"
        :num-reviews="stayOffer?.stay?.numReviews"
        :is-favourite="stayOffer?.isFavourite"
      />
      <div class="stay-images mt-xs-5">
        <StaticImage
          v-for="(image, idx) in (stayOffer?.stay?.images ?? range(0, 5).map(_ => undefined))"
          :key="`${CtrlKey}-StayImage-${idx}`"
          :ctrl-key="`${CtrlKey}-StayImage-${idx}`"
          :class="`stay-image stay-image-${idx}`"
          :entity-src="image"
          :category="idx === 0 ? ImageCategory.Hotel : ImageCategory.HotelRoom"
          :is-high-priority="idx === 0"
          :sizes="idx === 0 ? 'xs:100vw sm:100vw md:100vw lg:100vw xl:50vw' : 'xs:100vw sm:100vw md:50vw lg:50vw xl:30vw'"
          :alt-res-name="idx === 0 ? getI18nResName2('stayDetailsPage', 'stayMainImageAlt') : getI18nResName2('stayDetailsPage', 'stayServiceImageAlt')"
        />
      </div>
      <hr class="stay-details-section-separator">
      <OverviewSection
        ctrl-key="StayDetailsOverviewSection"
        :description="stayOffer?.stay?.description"
        :num-reviews="stayOffer?.stay?.numReviews ?? 0"
        :review-score="stayOffer?.stay?.reviewScore ?? DefaultStayReviewScore"
      />
      <hr class="stay-details-section-separator">
      <AvailableRoomSection
        ctrl-key="StayDetailsAvailableRoomsSection"
        :offer-id="stayOffer?.id"
        :rooms="stayOffer?.stay?.images.filter(i => i.serviceLevel).map(i => {
          return {
            serviceLevel: i.serviceLevel!,
            price: stayOffer!.prices[i.serviceLevel!],
            image: {
              slug: i.slug,
              timestamp: i.timestamp
            }
          };
        }) ?? undefined"
      />
      <hr class="stay-details-section-separator">
      <LocationMap :ctrl-key="`${CtrlKey}-Location`" :location="stayOffer?.stay?.geo" :city="stayOffer?.stay?.city" :visibility="mapComponentVisibility" />
      <hr class="stay-details-section-separator">
      <AmenitiesSection :ctrl-key="`${CtrlKey}-Amenities`" />
      <hr class="stay-details-section-separator">
      <ReviewSection v-if="stayOffer" :ctrl-key="`${CtrlKey}-Reviews`" :stay-id="stayOffer?.stay.id" :preloaded-summary-info="stayOffer ? { reviewScore: stayOffer.stay.reviewScore, numReviews: stayOffer.stay.numReviews } : undefined" />
      <ComponentWaiterIndicator v-else :ctrl-key="`${CtrlKey}-ReviewsWaiterFallback`" class="stay-reviews-waiting-indicator my-xs-5" />
      <CaptchaProtection v-if="AppConfig.maps && !isRobotRequest" ref="captcha" ctrl-key="StayDetailsCaptchaProtection" @verified="onCaptchaVerified" @failed="onCaptchaFailed" />
    </ErrorHelm>
  </div>
</template>

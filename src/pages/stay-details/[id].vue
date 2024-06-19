<script setup lang="ts">

import { withQuery } from 'ufo';
import range from 'lodash-es/range';
import CaptchaProtection from './../../components/forms/captcha-protection.vue';
import { getI18nResName2 } from './../../shared/i18n';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import { getLocalizeableValue } from './../../shared/common';
import { useFetchEx } from './../../shared/fetch-ex';
import { ApiEndpointStayOfferDetails, type Locale, DefaultStayReviewScore } from './../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';
import { type IStayOfferDetails, type ILocalizableValue, ImageCategory, type EntityId } from './../../shared/interfaces';
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
  await navigateTo(localePath(`/${getHtmlPagePath(HtmlPage.Index)}`));
}
const offerId: EntityId = offerParam;

definePageMeta({
  title: { resName: getI18nResName2('stayDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'StayOfferDetailsSummary';

const isRobotRequest = isRobot();

const captcha = (import.meta.client && AppConfig.maps && !isRobotRequest) ? shallowRef<InstanceType<typeof CaptchaProtection>>() as Ref<InstanceType<typeof CaptchaProtection>> : undefined;
const captchaToken = ref<ICaptchaTokenComposable>();

const stayDetailsFetchRequest = await useFetchEx<IStayOfferDetailsDto, IStayOfferDetailsDto>(ApiEndpointStayOfferDetails(offerId ?? -1), 'error-page',
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
      logger.warn('(StayDetails) got stay offer details fetch response exception', ctx.error, { id: offerId });
      isError.value = true;
    },
    onRequestError: (ctx) => {
      logger.warn('(StayDetails) got stay offer details fetch request exception', ctx.error, { id: offerId });
      isError.value = true;
    }
  });
const stayDetailsFetch = await stayDetailsFetchRequest;
const offerDataAvailable = computed(() => stayDetailsFetch.status.value === 'success' && stayDetailsFetch.data?.value?.stay && !isError.value);
const stayOffer = ref<Omit<IStayOfferDetails, 'dataHash'> | undefined>(stayDetailsFetch.data?.value ? mapStayOfferDetails(stayDetailsFetch.data.value!) : undefined);

const nuxtApp = useNuxtApp();
if (nuxtApp.isHydrating || import.meta.server) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'stays',
      title: stayOffer.value!.stay.name,
      city: stayOffer.value!.stay.city,
      price: stayOffer.value!.totalPrice.toNumber(),
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
if (import.meta.server) {
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
  <article class="stay-details-page no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="isError" class="stay-details-page-error-helm">
      <OfferDetailsBreadcrumbs
        :ctrl-key="`${CtrlKey}-Breadcrumbs`"
        offer-kind="stays"
        :city="stayOffer?.stay?.city"
        :place-name="stayOffer?.stay?.name"
      />
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        class="mt-xs-4 mt-s-5"
        offer-kind="stays"
        :offer-id="offerId!"
        :city="stayOffer?.stay?.city"
        :title="stayOffer?.stay?.name"
        :price="stayOffer?.totalPrice"
        :review-score="stayOffer?.stay?.reviewScore"
        :num-reviews="stayOffer?.stay?.numReviews"
        :btn-res-name="getI18nResName2('offerDetailsPage', 'bookBtn')"
        :btn-link-url="stayOffer ? withQuery(localePath(`/${getHtmlPagePath(HtmlPage.BookStay)}/${offerId}`), { serviceLevel: 'Base' }) : route.fullPath"
      />
      <section class="stay-images mt-xs-5">
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
      </section>
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
  </article>
</template>

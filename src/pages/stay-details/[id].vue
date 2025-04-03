<script setup lang="ts">
import { type IStayImageShort, AppConfig, type ReviewSummary, type IStayOfferDetails, type ILocalizableValue, ImageCategory, type EntityId, AppPage, getPagePath, type Locale, getLocalizeableValue, getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointStayOfferReviewSummary, ApiEndpointStayOfferDetails } from './../../server/api-definitions';
import { mapStayOfferDetails, mapReviewSummary } from './../../helpers/entity-mappers';
import range from 'lodash-es/range';
import CaptchaProtection from './../../components/forms/captcha-protection.vue';
import OfferDetailsSummary from './../../components/common-page-components/offer-details-summary.vue';
import type { IStayOfferDetailsDto, IReviewSummaryDto } from '../../server/api-definitions';
import OverviewSection from './../../components/stay-details/overview-section.vue';
import AvailableRoomSection from './../../components/stay-details/available-rooms-section.vue';
import AmenitiesSection from './../../components/stay-details/amenities-section.vue';
import LocationMap from './../../components/stay-details/location-map.vue';
import ReviewSection from './../../components/stay-details/reviews/review-section.vue';
import ComponentWaitingIndicator from './../../components/component-waiting-indicator.vue';
import { useCaptchaToken, type ICaptchaTokenComposable } from './../../composables/captcha-token';
import { isRobot } from './../../composables/is-robot';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import { toShortForm } from './../../helpers/components';
import type { ControlKey } from './../../helpers/components';

const { d, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();
const logger = getCommonServices().getLogger().addContextProps({ component: 'StayDetails' });

const offerParam = useRoute().params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const offerId: EntityId = offerParam;

definePageMeta({
  title: { resName: getI18nResName2('stayDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey: ControlKey = ['Page', 'StayDetails'];

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const isRobotRequest = isRobot();

const captcha = (import.meta.client && !!AppConfig.maps && !isRobotRequest) ? useTemplateRef('captcha') : undefined;
const captchaToken = ref<ICaptchaTokenComposable>();

const isSsr = import.meta.server && !!nuxtApp.ssrContext;
const isOgImageRequest = isSsr && !!nuxtApp.ssrContext!.event?.context.ogImageContext;
const reviewSummaryFetch = await useFetch(() => `/${ApiEndpointStayOfferReviewSummary(offerId)}`,
{
  server: isOgImageRequest,
  lazy: !isOgImageRequest,
  immediate: !!offerId,
  cache: 'no-cache',
  query: { drafts: enabled },
  transform: (response: IReviewSummaryDto): ReviewSummary | undefined => {
    const dto = response as IReviewSummaryDto;
    if (!dto) {
      logger.warn('fetch request for stay review summary returned data');
      return undefined;
    }
    return mapReviewSummary(dto);
  },
  $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
});
const reviewSummaryAvailable = computed(() => reviewSummaryFetch.status.value === 'success' && reviewSummaryFetch.data?.value);
const reviewSummary = ref<ReviewSummary | undefined>(reviewSummaryFetch.data?.value ?? undefined);

const stayDetailsFetch = await useFetch<IStayOfferDetailsDto, IStayOfferDetailsDto>(() => `/${ApiEndpointStayOfferDetails(offerId)}`,
  {
    server: true,
    lazy: true,
    immediate: !!offerId,
    cache:  (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    dedupe: 'defer',
    query: { drafts: enabled },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });
const offerDataAvailable = computed(() => stayDetailsFetch.status.value === 'success' && stayDetailsFetch.data?.value?.stay);
const stayOffer = ref<Omit<IStayOfferDetails, 'dataHash'> | undefined>((stayDetailsFetch.data?.value /*&& reviewSummaryFetch.data?.value*/) ? mapStayOfferDetails(stayDetailsFetch.data.value!, reviewSummaryFetch.data?.value ?? undefined) : undefined);

if (isSsr) {
  useOgImage({
    name: 'OgOfferSummary',
    props: {
      kind: 'stays',
      title: stayOffer.value!.stay.name,
      city: stayOffer.value!.stay.city,
      price: stayOffer.value!.totalPrice.toNumber(),
      dateUnixUtc: stayOffer.value!.checkIn.getTime(),
      image: {
        ...(stayOffer!.value!.stay.images.find(i => i.order === 0)),
        category: ImageCategory.Hotel
      }
    }
  });
}

function onReviewSummaryChanged (summary: ReviewSummary) {
  logger.debug('review summary changed handler', { ctrlKey: CtrlKey, score: summary.score, numReviews: summary.numReviews });
  reviewSummary.value = summary;
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

watch([stayDetailsFetch.status, reviewSummaryFetch.status], () => {
  if (offerDataAvailable.value) {
    stayOffer.value = mapStayOfferDetails(stayDetailsFetch.data.value!, reviewSummaryFetch.data?.value ?? undefined);
    updatePageTitle();
  }

  if(reviewSummaryAvailable.value) {
    reviewSummary.value = reviewSummaryFetch.data.value!;
  }
});

watch(locale, () => {
  updatePageTitle();
});
if (import.meta.server) {
  updatePageTitle();
}

const mapComponentVisibility = ref<'visible' | 'wait'>((!AppConfig.maps && !isRobotRequest) ? 'visible' : 'wait');

function onCaptchaVerified (token: string) {
  logger.info('captcha verified', { ctrlKey: CtrlKey });
  captchaToken.value!.onCaptchaVerified(token);
  mapComponentVisibility.value = 'visible';
}

function onCaptchaFailed (reason?: any) {
  logger.info('captcha verification failed', { ctrlKey: CtrlKey });
  captchaToken.value!.onCaptchaFailed(reason);
}

function startCaptchaVerification () {
  logger.verbose('starting captcha verification', { ctrlKey: CtrlKey });
  captchaToken.value = useCaptchaToken(captcha as any);
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
    <ErrorHelm :is-error="stayDetailsFetch.status.value === 'error'" class="stay-details-page-error-helm">
      <LazyOfferDetailsBreadcrumbs
        :ctrl-key="[...CtrlKey, 'Breadcrumbs']"
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
        :review-score="reviewSummary?.score"
        :num-reviews="reviewSummary?.numReviews"
        :btn-res-name="getI18nResName2('offerDetailsPage', 'bookBtn')"
        :btn-link-url="stayOffer ? navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookStay)}/${offerId}`, locale as Locale, { serviceLevel: 'Base' }) : navLinkBuilder.buildLink(route.fullPath, locale as Locale)"
      />
      <section class="stay-images mt-xs-5">
        <StaticImage
          v-for="(image, idx) in (stayOffer?.stay?.images ?? range(0, 5).map(() => undefined))"
          :key="`${toShortForm(CtrlKey)}-StayImage-${idx}`"
          :ctrl-key="[...CtrlKey, 'StaticImg', idx]"
          :class="`stay-image stay-image-${idx}`"
          :src="image"
          :category="idx === 0 ? ImageCategory.Hotel : ImageCategory.HotelRoom"
          :high-priority="idx === 0"
          :sizes="idx === 0 ? 'xs:100vw sm:100vw md:100vw lg:100vw xl:50vw' : 'xs:100vw sm:100vw md:50vw lg:50vw xl:30vw'"
          :alt="{ resName: idx === 0 ? getI18nResName2('stayDetailsPage', 'stayMainImageAlt') : getI18nResName2('stayDetailsPage', 'stayServiceImageAlt') }"
        />
      </section>
      <hr class="stay-details-section-separator">
      <OverviewSection
        :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Overview']"
        :description="stayOffer?.stay?.description"
        :num-reviews="reviewSummary?.numReviews ?? undefined"
        :review-score="reviewSummary?.score ?? undefined"
      />
      <hr class="stay-details-section-separator">
      <AvailableRoomSection
        :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Rooms']"
        :offer-id="stayOffer?.id"
        :rooms="stayOffer?.stay?.images.filter((i: IStayImageShort) => i.serviceLevel).map((i: IStayImageShort) => {
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
      <LocationMap :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Location']" :location="stayOffer?.stay?.geo" :city="stayOffer?.stay?.city" :visibility="mapComponentVisibility" />
      <hr class="stay-details-section-separator">
      <AmenitiesSection :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Amenities']"/>
      <hr class="stay-details-section-separator">
      <ReviewSection v-if="stayOffer" :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Reviews']" :stay-id="stayOffer?.stay.id" :preloaded-summary-info="reviewSummary" @review-summary-changed="onReviewSummaryChanged" />
      <ComponentWaitingIndicator v-else :ctrl-key="[...CtrlKey, 'StayDetailsSection', 'Reviews', 'Waiter']" class="stay-reviews-waiting-indicator my-xs-5" />
      <CaptchaProtection v-if="!!AppConfig.maps && !isRobotRequest" :ctrl-key="[...CtrlKey, 'Captcha']" ref="captcha" @verified="onCaptchaVerified" @failed="onCaptchaFailed" />
    </ErrorHelm>
  </article>
</template>

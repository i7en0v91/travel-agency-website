<script setup lang="ts">
import { AppConfig, type ReviewSummary, type IStayOfferDetails, type ILocalizableValue, ImageCategory, type EntityId, AppPage, getPagePath, type Locale, getLocalizeableValue, getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointStayOfferDetails, ApiEndpointStayOfferReviewSummary } from './../../server/api-definitions';
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
import ComponentWaitingIndicator from '../../components/forms/component-waiting-indicator.vue';
import { useCaptchaToken, type ICaptchaTokenComposable } from './../../composables/captcha-token';
import { isRobot } from './../../composables/is-robot';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';
import type { IStaticImageUiProps } from './../../types';

const { d, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const route = useRoute();
const logger = getCommonServices().getLogger();

const offerParam = useRoute().params?.id?.toString() ?? '';
if (offerParam.length === 0) {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale));
}
const offerId: EntityId = offerParam;

definePageMeta({
  title: { resName: getI18nResName2('stayDetailsPage', 'title'), resArgs: undefined }
});

const CtrlKey = 'StayOfferDetailsSummary';

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const isRobotRequest = isRobot();

const captcha = (import.meta.client && !!AppConfig.maps && !isRobotRequest) ? useTemplateRef('captcha') : undefined;
const captchaToken = ref<ICaptchaTokenComposable>();

const isSsr = import.meta.server && !!nuxtApp.ssrContext;
const isOgImageRequest = isSsr && !!nuxtApp.ssrContext!.event?.context.ogImageContext;
const reviewSummaryFetch = await useFetch(`/${ApiEndpointStayOfferReviewSummary(offerId ?? -1)}`,
{
  server: isOgImageRequest,
  lazy: !isOgImageRequest,
  immediate: !!offerId,
  cache: 'no-cache',
  query: { drafts: enabled },
  transform: (response: IReviewSummaryDto): ReviewSummary | undefined => {
    const dto = response as IReviewSummaryDto;
    if (!dto) {
      logger.warn('(StayDetails) fetch request for stay review summary returned data');
      return undefined;
    }
    return mapReviewSummary(dto);
  },
  $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
});
const reviewSummaryAvailable = computed(() => reviewSummaryFetch.status.value === 'success' && reviewSummaryFetch.data?.value);
const reviewSummary = ref<ReviewSummary | undefined>(reviewSummaryFetch.data?.value ?? undefined);

const stayDetailsFetch = await useFetch<IStayOfferDetailsDto, IStayOfferDetailsDto>(`/${ApiEndpointStayOfferDetails(offerId ?? -1)}`,
  {
    server: true,
    lazy: true,
    immediate: !!offerId,
    cache: 'no-cache',
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
  logger.debug(`(StayDetails) review summary changed handler, ctrlKey=${CtrlKey}, score=${summary.score}, numReviews=${summary.numReviews}`);
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

const imageStylings: IStaticImageUiProps[] = [
  { wrapper: 'row-start-1 row-end-2 col-start-1 col-end-2 rounded-tl-xl rounded-tr-xl md:col-end-3 xl:row-end-3 xl:col-end-2 xl:rounded-tr-none xl:rounded-bl-xl', img: 'rounded-tl-xl rounded-tr-xl xl:rounded-tr-none xl:rounded-bl-xl' },
  { wrapper: 'row-start-2 row-end-3 col-start-1 col-end-2 xl:row-start-1 xl:row-end-2 xl:col-start-2 xl:col-end-3' },
  { wrapper: 'row-start-3 row-end-4 col-start-1 col-end-2 md:row-start-2 md:row-end-3 md:col-start-2 md:col-end-3 xl:row-start-1 xl:row-end-2 xl:col-start-3 xl:col-end-4', img: 'xl:rounded-tr-xl' },
  { wrapper: 'row-start-4 row-end-5 col-start-1 col-end-2 md:row-start-3 md:row-end-4 md:rounded-bl-xl xl:row-start-2 xl:row-end-3 xl:col-start-2 xl:col-end-3 xl:rounded-bl-none', img: 'md:rounded-bl-xl xl:rounded-bl-none' },
  { wrapper: 'row-start-5 row-end-6 col-start-1 col-end-2 rounded-bl-xl rounded-br-xl md:row-start-3 md:row-end-4 md:col-start-2 md:col-end-3 md:rounded-bl-none xl:row-start-2 xl:row-end-3 xl:col-start-3 xl:col-end-4', img: 'rounded-bl-xl rounded-br-xl md:rounded-bl-none' }
].map(s => { return { ...s, img: s.img, stub: s.img, errorStub: `rounded-none ${s.img}` }; });

</script>

<template>  
  <article class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <ErrorHelm :is-error="stayDetailsFetch.status.value === 'error'">
      <OfferDetailsBreadcrumbs
        :ctrl-key="`${CtrlKey}-Breadcrumbs`"
        offer-kind="stays"
        :city="stayOffer?.stay?.city"
        :place-name="stayOffer?.stay?.name"
      />
      <OfferDetailsSummary
        :ctrl-key="CtrlKey"
        class="mt-6 sm:mt-8"
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
      <section class="w-full h-auto grid gap-[8px] grid-rows-stayphotosxs grid-cols-stayphotosxs md:grid-rows-stayphotosmd md:grid-cols-stayphotosmd xl:md:grid-rows-stayphotosxl xl:grid-cols-stayphotosxl mt-8">
        <StaticImage
          v-for="(image, idx) in (stayOffer?.stay?.images ?? range(0, 5).map(_ => undefined))"
          :key="`${CtrlKey}-StayImage-${idx}`"
          :ctrl-key="`${CtrlKey}-StayImage-${idx}`"
          :class="`stay-image stay-image-${idx}`"
          :ui="imageStylings[idx]"
          :entity-src="image"
          :category="idx === 0 ? ImageCategory.Hotel : ImageCategory.HotelRoom"
          :is-high-priority="idx === 0"
          :sizes="idx === 0 ? 'xs:100vw sm:100vw md:100vw lg:100vw xl:50vw' : 'xs:100vw sm:100vw md:50vw lg:50vw xl:30vw'"
          :alt-res-name="idx === 0 ? getI18nResName2('stayDetailsPage', 'stayMainImageAlt') : getI18nResName2('stayDetailsPage', 'stayServiceImageAlt')"
        />
      </section>
      <UDivider color="gray" orientation="horizontal" class="w-full my-16" size="sm"/>
      <OverviewSection
        ctrl-key="StayDetailsOverviewSection"
        :description="stayOffer?.stay?.description"
        :num-reviews="reviewSummary?.numReviews ?? undefined"
        :review-score="reviewSummary?.score ?? undefined"
      />
      <UDivider color="gray" orientation="horizontal" class="w-full my-16" size="sm"/>      
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
      <UDivider color="gray" orientation="horizontal" class="w-full my-16" size="sm"/>
      <LocationMap :ctrl-key="`${CtrlKey}-Location`" :location="stayOffer?.stay?.geo" :city="stayOffer?.stay?.city" :visibility="mapComponentVisibility" />
      <UDivider color="gray" orientation="horizontal" class="w-full my-16" size="sm"/>
      <AmenitiesSection :ctrl-key="`${CtrlKey}-Amenities`" />
      <UDivider color="gray" orientation="horizontal" class="w-full my-16" size="sm"/>
      
      <ReviewSection v-if="stayOffer" :ctrl-key="`${CtrlKey}-Reviews`" :stay-id="stayOffer?.stay.id" :preloaded-summary-info="reviewSummary" @review-summary-changed="onReviewSummaryChanged" />
      <ComponentWaitingIndicator v-else :ctrl-key="`${CtrlKey}-ReviewsWaiterFallback`" class="my-8" />
      <CaptchaProtection v-if="!!AppConfig.maps && !isRobotRequest" ref="captcha" ctrl-key="StayDetailsCaptchaProtection" @verified="onCaptchaVerified" @failed="onCaptchaFailed" />
    </ErrorHelm>
  </article>  
</template>

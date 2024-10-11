<script setup lang="ts">
import { mapLocalizeableValues, AppConfig, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointCompanyReviewsList, ApiEndpointPopularCitiesList, type IPopularCityDto, type ICompanyReviewDto } from '../server/api-definitions';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../helpers/dom';
import { Navigation, Autoplay, Mousewheel } from 'swiper/modules';
import range from 'lodash-es/range';
import PageSection from './../components/common-page-components/page-section.vue';
import SearchPageImageLink from './../components/index/search-page-image-link.vue';
import PopularCityCard from './../components/index/popular-city-card.vue';
import CompanyReviewCard from './../components/index/company-review-card.vue';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  title: { resName: getI18nResName2('indexPage', 'title'), resArgs: undefined }
});
useOgImage();

const logger = getCommonServices().getLogger();

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const citiesListFetch = await useFetch(`/${ApiEndpointPopularCitiesList}`, {
    server: true,
    lazy: true,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    query: { drafts: enabled },
    transform: (response: IPopularCityDto[]) => {
      logger.verbose('(indexPage) received popular cities list response');
      if (!response) {
        logger.warn('(indexPage) popular cities list response is empty');
        return range(0, 20, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    default: () => { return range(0, 20, 1).map(_ => null); },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });

const reviewsListFetch = await useFetch(`/${ApiEndpointCompanyReviewsList}`, 
  {
    server: true,
    lazy: true,
    cache: 'no-cache',
    query: { drafts: enabled },
    default: () => { return range(0, 10, 1).map(_ => null); },
    transform: (response: ICompanyReviewDto[]) => {
      logger.verbose(`(indexPage) received company reviews list response: [${JSON.stringify(response)}]`);
      if (!response) {
        logger.warn('(indexPage) company review list response is empty');
        return range(0, 10, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

function onActiveSlideChanged () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

</script>

<template>
  <div class="golobe-landing-page">
    <!--
    <PageSection
      ctrl-key="PerfectTripSection"
      :header-res-name="getI18nResName3('indexPage', 'perfectTripSection', 'title')"
      :subtext-res-name="getI18nResName3('indexPage', 'perfectTripSection', 'subtext')"
      :btn-text-res-name="getI18nResName3('indexPage', 'perfectTripSection', 'btn')"
      :content-padded="true"
      link-url="flights"
      :is-error="!!citiesListFetch.error.value"
    >
      <ul class="popular-city-grid p-xs-2 p-s-3  hidden-overflow-nontabbable">
        <PopularCityCard
          v-for="(city, idx) in citiesListFetch.data.value"
          :key="`popular-city-${idx}`"
          :ctrl-key="`PopularCityCard-${idx}`"
          search-kind="flight"
          :text="city ? mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, city.cityDisplayName, city.countryDisplayName) : undefined"
          :img-src="city ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
          :city-slug="city ? city.slug : undefined"
          :num-stays="city ? city.numStays : undefined"
          class="popular-city-grid-item"
        />
      </ul>
    </PageSection>
    <div class="page-section search-page-image-link-section">
      <div class="page-section-content content-padded search-image-links-section-content">
        <div class="search-page-image-links">
          <SearchPageImageLink ctrl-key="SearchFlightsImageLink" page="flights" />
          <SearchPageImageLink ctrl-key="SearchHotelsImageLink" page="stays" />
        </div>
      </div>
    </div>
    <PageSection
      ctrl-key="CompanyReviewSection"
      class="company-reviews-section"
      :header-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'title')"
      :subtext-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'subtext')"
      :btn-text-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'btn')"
      :content-padded="true"
      :is-error="!!reviewsListFetch.error.value"
    >
      <Swiper
        class="company-reviews-swiper pb-xs-4"
        :modules="[Navigation, Mousewheel, Autoplay]"
        slides-per-view="auto"
        :navigation="{
          enabled: true,
          nextEl: null,
          prevEl: null
        }"
        :loop="true"
        :allow-touch-move="true"
        :simulate-touch="true"
        :autoplay="{
          delay: AppConfig.sliderAutoplayPeriodMs
        }"
        :touch-start-prevent-default="false"
        :mousewheel="{
          forceToAxis: true
        }"
        @slide-change="onActiveSlideChanged"
      >
        <SwiperSlide
          v-for="(review, index) in reviewsListFetch.data.value"
          :key="`CompanyReview-${index}`"
          :style="{width: 'auto'}"
        >
          <CompanyReviewCard
            :ctrl-key="`CompanyReviewCard-${index}`"
            class="ml-xs-1 mr-xs-2 mr-s-4"
            :header="review?.header ?? undefined"
            :body="review?.body ?? undefined"
            :user-name="review?.userName ?? undefined"
            :img-src="review?.img?.slug ? { slug: review.img.slug, timestamp: review.img.timestamp } : undefined"
          />
        </SwiperSlide>
      </Swiper>
    </PageSection>
    -->
    <div class="h-screen">PAGE CONTENT</div>
  </div>
</template>

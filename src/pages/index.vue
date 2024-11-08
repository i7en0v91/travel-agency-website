<script setup lang="ts">
import { ImageCategory, MainTitleSlug, mapLocalizeableValues, AppConfig, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointCompanyReviewsList, ApiEndpointPopularCitiesList, type IPopularCityDto, type ICompanyReviewDto } from '../server/api-definitions';
import range from 'lodash-es/range';
import HeadingText from './../components/index/main-heading-text.vue';
import PageSection from './../components/common-page-components/page-section.vue';
import AppPageBody from '../components/app-page-body.vue';
import SearchPageImageLink from './../components/index/search-page-image-link.vue';
import CityOffersLinks from '../components/index/city-offers-links.vue';
import CompanyReviews from './../components/index/company-reviews.vue';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';
import throttle from 'lodash-es/throttle';

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

function updateLinksTabAvailability() {
  logger.debug('(indexPage) updating links tab availability');

  try {
    const listItemsEl = document.querySelectorAll('li.city-offers-list-item');
    let availableCount = 0;
    for(const liEl of listItemsEl) {
      const liRect = liEl.getBoundingClientRect();
      const linksAvailable = liRect.height > 0;
      if(linksAvailable) {
        availableCount++;
      }

      liEl.querySelectorAll('a').forEach(aEl => {
        if(linksAvailable) {
          aEl.removeAttribute('disabled');
          aEl.removeAttribute('tabIndex');          
        } else {
          aEl.setAttribute('disabled', 'true');
          aEl.setAttribute('tabIndex', '-1');          
        }
      });
    }

    logger.debug(`(indexPage) links tab availability updated, total=${availableCount}, available=${availableCount}`);
  } catch(err: any) {
    logger.warn('(indexPage) failed to update links tab availability', err);
  }
}

const onWindowResize = () => setTimeout(throttle(function () {
  setTimeout(() => {
    updateLinksTabAvailability();
  }, 0);
}), 100);

onMounted(() => {
  setTimeout(() => {
    updateLinksTabAvailability();
  }, 0);
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});


</script>

<template>
  <div class="golobe-landing-page">
    <SearchPageHead
      ctrl-key="MainPageHead"
      :image-entity-src="{ slug: MainTitleSlug }"
      :category="ImageCategory.MainTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      :ui="{
        content: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
        image: {
          wrapper: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
          img: 'h-full max-h-[701px] md:max-h-[581px]',
          overlay: 'bg-gradient-to-b from-gray-900 to-60% opacity-75'
        }
      }"
    >
      <HeadingText ctrl-key="IndexPageMainHeading" />
    </SearchPageHead>
    <AppPageBody>
      <PageSection
        ctrl-key="PerfectTripSection"
        :content="{
          headerResName: getI18nResName3('indexPage', 'perfectTripSection', 'title'),
          subtextResName: getI18nResName3('indexPage', 'perfectTripSection', 'subtext'),
          btnTextResName: getI18nResName3('indexPage', 'perfectTripSection', 'btn'),
          linkUrl: 'flights'
        }"        
        :content-padded="true"
        :is-error="!!citiesListFetch.error.value"
      >
        <ul class="p-2 sm:p-4 grid grid-flow-row grid-cols-cityxs md:grid-cols-citymd grid-rows-5 md:grid-rows-3 auto-rows-[0px] overflow-clip -translate-y-[40px] justify-center">
          <li v-for="(city, idx) in citiesListFetch.data.value" :key="`popular-city-${idx}`" class="w-full city-offers-list-item">
            <CityOffersLinks
              :ctrl-key="`CityOffersLinks-${idx}`"
              search-kind="flight"
              :text="city ? mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, city.cityDisplayName, city.countryDisplayName) : undefined"
              :img-src="city ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
              :city-slug="city ? city.slug : undefined"
              :num-stays="city ? city.numStays : undefined"
            />
          </li>
        </ul>
      </PageSection>
      <PageSection
        ctrl-key="SearchPageImageLinks"
        class="sm:!mt-10"
        :content-padded="true"
        :is-error="false"
      >
        <div class="flex flex-col lg:flex-row flex-nowrap gap-[24px] items-center justify-center">
          <SearchPageImageLink ctrl-key="SearchFlightsImageLink" page="flights" />
          <SearchPageImageLink ctrl-key="SearchHotelsImageLink" page="stays" />
        </div>
      </PageSection>
      <PageSection
        ctrl-key="CompanyReviewSection"
        class="company-reviews-section"
        :content="{
          headerResName: getI18nResName3('indexPage', 'companyReviewSection', 'title'),
          subtextResName: getI18nResName3('indexPage', 'companyReviewSection', 'subtext'),
          btnTextResName: getI18nResName3('indexPage', 'companyReviewSection', 'btn')
        }"
        :content-padded="true"
        :is-error="!!reviewsListFetch.error.value"
      >
        <CompanyReviews ctrl-key="CompanyReviews" :reviews="reviewsListFetch.data.value"/>
      </PageSection>
    </AppPageBody>
  </div>
</template>

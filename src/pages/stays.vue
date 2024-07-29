<script setup lang="ts">

import range from 'lodash-es/range';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import PageSection from './../components/common-page-components/page-section.vue';
import HeadingText from './../components/stays/stays-heading-text.vue';
import { getI18nResName2 } from './../shared/i18n';
import { ImageCategory } from './../shared/interfaces';
import { type Locale, ApiEndpointStayOffersSearchHistory, ApiEndpointPopularCitiesList, MaxSearchHistorySize, StaysTitleSlug, TravelDetailsHtmlAnchor } from './../shared/constants';
import { AppPage } from './../shared/page-query-params';
import TravelCities from './../components/common-page-components/travel-details/travel-cities.vue';
import TravelDetails from './../components/common-page-components/travel-details/travel-details.vue';
import { type ISearchedCityHistoryDto, type IPopularCityDto } from './../server/dto';
import { mapLocalizeableValues, getLocalizeableValue } from './../shared/common';
import AppConfig from './../appconfig';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey = 'StaysPage';

const logger = CommonServicesLocator.getLogger();

const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const popularCitiesFetch = await useFetch<IPopularCityDto[] | null[]>(`/${ApiEndpointPopularCitiesList}`, {
    server: true,
    lazy: true,
    query: { drafts: enabled },
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    default: () => { return range(0, 20, 1).map(_ => null); },
    key: 'StaysPagePopulatCitiesList',
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const searchHistoryFetch = await useFetch(`/${ApiEndpointStayOffersSearchHistory}`,
  {
    server: false,
    lazy: true,
    cache: 'no-cache',
    query: { drafts: enabled },
    default: () => { return range(0, MaxSearchHistorySize, 1).map(_ => null); },
    transform: (response: ISearchedCityHistoryDto[]) => {
      logger.verbose(`(StaysPage) received search cities history list response, count=${response.length}`);
      if (!response) {
        logger.warn('(StaysPage) search cities history list response is empty');
        return []; // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const showWaitingStub = computed(() => (!searchHistoryFetch.data?.value || !popularCitiesFetch.data?.value) && (searchHistoryFetch.status.value === 'pending' || searchHistoryFetch.status.value === 'idle'));
const somePopularCity = computed(() => popularCitiesFetch.data?.value ? popularCitiesFetch.data.value[0] : undefined);

const isError = ref(false);
watch(searchHistoryFetch.status, () => {
  if (searchHistoryFetch.status.value === 'error') {
    logger.warn('(StaysPage) failed to load search city history');
    isError.value = true;
  }
});

</script>

<template>
  <div class="stays-page no-hidden-parent-tabulation-check">
    <SearchPageHead
      ctrl-key="SearchPageHeadStays"
      class="stays-page-head"
      :image-entity-src="{ slug: StaysTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      overlay-class="search-stays-page-head-overlay"
      single-tab="stays"
    >
      <HeadingText ctrl-key="StaysPageHeading" />
    </SearchPageHead>
    <PageSection
      ctrl-key="RecentSearches"
      :header-res-name="getI18nResName2('staysPage', 'recentSearchesTitle')"
      :is-error="isError"
      :content-padded="true"
    >
    <ClientOnly>
      <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="`${CtrlKey}-WaiterIndicator`" />
      <ul v-if="searchHistoryFetch.data.value.length > 0" class="popular-city-grid p-xs-2 p-s-3  hidden-overflow-nontabbable">
        <PopularCityCard
          v-for="(city, idx) in searchHistoryFetch.data.value"
          :key="`popular-city-${idx}`"
          :ctrl-key="`SearchCityHistoryCard-${idx}`"
          search-kind="stay"
          :text="city ? mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, city.cityDisplayName, city.countryDisplayName) : undefined"
          :img-src="city ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
          :city-slug="city ? city.slug : undefined"
          :num-stays="city ? city.numStays : undefined"
          class="popular-city-grid-item"
        />
      </ul>
      <div v-else class="search-history-empty-div mt-xs-2">
        <i18n-t :keypath="getI18nResName2('staysPage', 'searchHistoryEmpty')" tag="div" scope="global" class="search-history-empty">
          <template #cityLink>
            <NuxtLink v-if="somePopularCity" class="search-history-city-link brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug : somePopularCity!.slug })">
              {{ getLocalizeableValue(somePopularCity!.cityDisplayName, locale as Locale) }}
            </NuxtLink>
          </template>
        </i18n-t>
      </div>
      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="`${CtrlKey}-ClientFallback`" />
      </template>
    </ClientOnly>
    </PageSection>
    <TravelCities ctrl-key="StaysTravelCitiesSection" book-kind="stay" class="stays-page-travel-cities-section" />
    <TravelDetails :id="TravelDetailsHtmlAnchor" ctrl-key="StaysTravelDetailsSection" book-kind="stay" />
  </div>
</template>

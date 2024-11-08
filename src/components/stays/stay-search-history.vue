<script setup lang="ts">
import { mapLocalizeableValues, getLocalizeableValue, type Locale, MaxSearchHistorySize, AppConfig, AppPage, getI18nResName2 } from '@golobe-demo/shared';
import { type ISearchedCityHistoryDto, type IPopularCityDto, ApiEndpointStayOffersSearchHistory, ApiEndpointPopularCitiesList } from './../../server/api-definitions';
import range from 'lodash-es/range';
import ComponentWaitingIndicator from './../../components/component-waiting-indicator.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from './../../helpers/service-accessors';
import { useCityGridLinksTabKeeper } from './../../composables/city-grid-links-tab-keeper';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const logger = getCommonServices().getLogger();

const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

useCityGridLinksTabKeeper();

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const popularCitiesFetch = await useFetch<IPopularCityDto[] | null[]>(`/${ApiEndpointPopularCitiesList}`, {
    server: true,
    lazy: true,
    query: { drafts: enabled },
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    default: () => { return range(0, 20, 1).map(_ => null); },
    key: 'StaySearchHistoryPopulatCitiesList',
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const searchHistoryFetch = await useFetch(`/${ApiEndpointStayOffersSearchHistory}`,
  {
    server: false,
    lazy: true,
    cache: 'no-cache',
    query: { drafts: enabled },
    default: () => { return null; },
    transform: (response: ISearchedCityHistoryDto[]) => {
      logger.verbose(`(stay-search-history) received search cities history list response, count=${response.length}`);
      if (!response) {
        logger.warn('(stay-search-history) search cities history list response is empty');
        return []; // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const showWaitingStub = computed(() => (!searchHistoryFetch.data?.value || !popularCitiesFetch.data?.value) && (searchHistoryFetch.status.value === 'pending' || searchHistoryFetch.status.value === 'idle'));
const somePopularCity = computed(() => popularCitiesFetch.data?.value ? popularCitiesFetch.data.value[0] : undefined);

const isError = ref(false);
watch([searchHistoryFetch.status, popularCitiesFetch.status], () => {
  if (searchHistoryFetch.status.value === 'error') {
    logger.warn('(stay-search-history) failed to load search city history');
    isError.value = true;
  }

  if (popularCitiesFetch.status.value === 'error') {
    logger.warn('(stay-search-history) failed to load popular cities');
    isError.value = true;
  }
});

</script>

<template>
  <ClientOnly>
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="`${ctrlKey}-WaiterIndicator`" />
    <ErrorHelm :is-error="!!searchHistoryFetch.error.value || !!popularCitiesFetch.error.value">
      <ul v-if="!showWaitingStub && (searchHistoryFetch.data.value?.length ?? 0) > 0" class="p-2 sm:p-4 grid grid-flow-row grid-cols-citylinks grid-rows-5 md:grid-rows-3 auto-rows-[0px] overflow-clip -translate-y-[40px] justify-center">
        <li v-for="(city, idx) in searchHistoryFetch.data.value" :key="`popular-city-${idx}`" class="w-full city-offers-list-item">
          <CityOffersLinks
            :ctrl-key="`CityOffersLinks-${idx}`"
            search-kind="stay"
            :text="city ? mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, city.cityDisplayName, city.countryDisplayName) : undefined"
            :img-src="city ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
            :city-slug="city ? city.slug : undefined"
            :num-stays="city ? city.numStays : undefined"
          />
        </li>
      </ul>
      <div v-else-if="!showWaitingStub" class="search-history-empty-div mt-xs-2">
        <i18n-t :keypath="getI18nResName2('staysPage', 'searchHistoryEmpty')" tag="div" scope="global" class="search-history-empty">
          <template #cityLink>
            <ULink 
              v-if="somePopularCity"
              class="font-bold underline" 
              :external="false"
              :to="navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug : somePopularCity!.slug })">
              {{ getLocalizeableValue(somePopularCity!.cityDisplayName, locale as Locale) }}
            </ULink>
          </template>
        </i18n-t>
      </div>
    </ErrorHelm>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="`${ctrlKey}-ClientFallback`" />
    </template>
  </ClientOnly>
</template>

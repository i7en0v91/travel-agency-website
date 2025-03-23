<script setup lang="ts">
import { mapLocalizeableValues, getLocalizeableValue, type Locale, AppConfig, AppPage, getI18nResName2 } from '@golobe-demo/shared';
import { type ISearchedCityHistoryDto, type IPopularCityDto, ApiEndpointStayOffersSearchHistory, ApiEndpointPopularCitiesList } from '../../server/api-definitions';
import range from 'lodash-es/range';
import type { ControlKey } from '../../helpers/components';
import type { ISearchStayOffersMainParams } from '../../types';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import { useNavLinkBuilder } from '../../composables/nav-link-builder';
import { usePreviewState } from '../../composables/preview-state';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey
};
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const nuxtApp = useNuxtApp();
const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();
const { enabled } = usePreviewState();

const showWaitingStub = computed(() => (!searchHistoryFetch.data?.value || !popularCitiesFetch.data?.value) && (searchHistoryFetch.status.value === 'pending' || searchHistoryFetch.status.value === 'idle'));
const somePopularCity = computed(() => popularCitiesFetch.data?.value ? popularCitiesFetch.data.value[0] : undefined);

const isError = ref(false);

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
    default: () => { return []; },
    transform: (response: ISearchedCityHistoryDto[]) => {
      logger.verbose('received search cities history list response', { ctrlKey, response });
      if (!response) {
        logger.warn('search cities history list response is empty', undefined, { ctrlKey });
        return []; // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });


async function onSearchBtnClick(citySlug: string): Promise<void> {
  logger.debug('search btn click', { ctrlKey, citySlug });
  const searchOffersStore = useSearchOffersStore();

  const entityCacheStore = useEntityCacheStore();
  const items = await entityCacheStore!.get({ slugs: [citySlug!] }, 'City', true);
  const cityId = items[0].id;

  const mainParams: Partial<ISearchStayOffersMainParams> = { cityId };

  logger.debug('offer search params computed', { ctrlKey, mainParams });
  await searchOffersStore.load('stays', { overrideParams: mainParams });
}

onMounted(() => {
  watch([searchHistoryFetch.status, popularCitiesFetch.status], () => {
    if (searchHistoryFetch.status.value === 'error') {
      logger.warn('failed to load search city history', searchHistoryFetch.error.value, { ctrlKey });
      isError.value = true;
    }

    if (popularCitiesFetch.status.value === 'error') {
      logger.warn('failed to load popular cities', searchHistoryFetch.error.value, { ctrlKey });
      isError.value = true;
    }
  });
});

</script>

<template>
  <ClientOnly>
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="[...ctrlKey, 'Waiter']" />
    <ErrorHelm :is-error="!!searchHistoryFetch.error.value || !!popularCitiesFetch.error.value">
      <ul v-if="searchHistoryFetch.data.value?.length > 0" class="popular-city-grid p-xs-2 p-s-3  hidden-overflow-nontabbable">
        <LazyPopularCityCard
          v-for="(city, idx) in searchHistoryFetch.data.value"
          :key="`popular-city-${idx}`"
          :ctrl-key="[...ctrlKey, 'RecentSearches', 'Card', idx]"
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
            <NuxtLink v-if="somePopularCity" class="search-history-city-link brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug : somePopularCity!.slug })" @click="() => onSearchBtnClick(somePopularCity!.slug)">
              {{ getLocalizeableValue(somePopularCity!.cityDisplayName, locale as Locale) }}
            </NuxtLink>
          </template>
        </i18n-t>
      </div>
    </ErrorHelm>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" />
    </template>
  </ClientOnly>
</template>
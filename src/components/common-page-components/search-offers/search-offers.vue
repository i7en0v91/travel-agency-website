<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { type EntityId, type OfferKind, AppPage, lookupPageByUrl, getI18nResName1, getI18nResName2, type Locale, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, CheckInOutDateUrlFormat } from '@golobe-demo/shared';
import type { ISearchFlightOffersParams, ISearchStayOffersParams } from './../../../types';
import dayjs from 'dayjs';
import TabsGroup from '../../forms/tabs-group.vue';
import { TooltipHideTimeout } from './../../../helpers/constants';
import type SearchFlightOffers from './search-flight-offers.vue';
import type SearchStayOffers from './search-stay-offers.vue';
import type { RouteLocationRaw } from 'vue-router';
import set from 'lodash-es/set';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useEntityCacheStore } from '../../../stores/entity-cache-store';

interface IProps {
  ctrlKey: ControlKey,
  singleTab?: 'flights' | 'stays',
  showPromoBtn?: boolean
}
const { ctrlKey, singleTab, showPromoBtn = false } = defineProps<IProps>();

const SearchOffersTabControl: ControlKey = [...ctrlKey, 'TabGroup'];
const SearchTabFlights: ControlKey = [...SearchOffersTabControl, 'Flights', 'Tab'];
const SearchTabStays: ControlKey = [...SearchOffersTabControl, 'Stays', 'Tab'];
const searchOffersStore = useSearchOffersStore();
const entityCacheStore = useEntityCacheStore();

const selectedTab = ref<ControlKey>();

const promoTooltipShown = ref(false);

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchOffers' });
const router = useRouter();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const { locale, t } = useI18n();
const hasMounted = ref(false);

const appPage = lookupPageByUrl(router.currentRoute.value.path);

const isFlightsTabActive = computed(() => {
  if(singleTab === 'stays') {
    return false;
  }
  if(singleTab === 'flights') {
    return true;
  }
  return !hasMounted.value || (selectedTab.value && areCtrlKeysEqual(selectedTab.value, SearchTabFlights));
});

async function resolveFlightCitiesSlugs (
  searchParams: Readonly<Partial<Pick<ISearchFlightOffersParams, 'fromCityId' | 'toCityId'>>>
): Promise<{ fromCitySlug: string | undefined, toCitySlug: string | undefined }> {
  const cityIdsToResolve: EntityId[] = [];
  if (searchParams.fromCityId) {
    cityIdsToResolve.push(searchParams.fromCityId);
  }
  if (searchParams.toCityId) {
    cityIdsToResolve.push(searchParams.toCityId);
  }
  if (cityIdsToResolve.length === 0) {
    const result = { fromCitySlug: undefined, toCitySlug: undefined };
    logger.verbose('no slugs to resolve - no cities specified', ctrlKey);
    return result;
  }

  try {
    logger.verbose('resolving cities slugs', { items: cityIdsToResolve });

    let fromCitySlug: string | undefined;
    let toCitySlug: string | undefined;
    const resolvedCities = await entityCacheStore!.get({ ids: cityIdsToResolve }, 'City', true);
    if (resolvedCities.length === 2) {
      fromCitySlug = resolvedCities[0].slug;
      toCitySlug = resolvedCities[1].slug;
    } else if (searchParams.fromCityId && !searchParams.toCityId) {
      fromCitySlug = resolvedCities[0].slug;
    } else {
      toCitySlug = resolvedCities[0].slug;
    }
    const result = { fromCitySlug, toCitySlug };
    logger.verbose('flight slugs resolved with fetch request', result);
    return result;
  } catch (err: any) {
    logger.warn('failed to resolve flight cities slugs', err, { ctrlKey, cityIds: cityIdsToResolve });
    return { fromCitySlug: undefined, toCitySlug: undefined };
  }
}

async function resolveDestinationCitySlug (
  searchParams: Readonly<Partial<Pick<ISearchStayOffersParams, 'cityId'>>>
): Promise<string | undefined> {
  if (!searchParams.cityId) {
    logger.verbose('stays city is not specified, no slug to resolve');
    return undefined;
  }

  try {
    const cityId = searchParams.cityId;
    logger.verbose('resolving stay', cityId);
    const resolvedCities = await entityCacheStore!.get({ ids: [cityId] }, 'City', true);
    const result = resolvedCities[0].slug;
    logger.verbose('destination slugs resolved with fetch request', result);
    return result;
  } catch (err: any) {
    logger.warn('failed to resolve flight cities slugs', err, { ctrlKey, cityId: searchParams.cityId });
    return undefined;
  }
}

async function validateAndGetRouteParams (): Promise<RouteLocationRaw> {
  const searchKind: OfferKind = isFlightsTabActive.value ? 'flights' : 'stays';
  logger.debug('constructing search offers url', { ctrlKey, searchKind });
  
  let result: { path: string, force: boolean, query: any };
  
  if (searchKind === 'flights') {
    const searchParams = await searchOffersStore.getSearchParams('flights', false);
    const resolvedCitySlugs = await resolveFlightCitiesSlugs(searchParams);

    const query = {
      class: searchParams.class ?? undefined,
      dateFrom: searchParams.dateFrom ? dayjs(searchParams.dateFrom!).format(CheckInOutDateUrlFormat) : undefined,
      dateTo: searchParams.dateTo ? dayjs(searchParams.dateTo!).format(CheckInOutDateUrlFormat) : undefined,
      fromCitySlug: resolvedCitySlugs.fromCitySlug ?? undefined,
      toCitySlug: resolvedCitySlugs.toCitySlug ?? undefined,
      numPassengers: searchParams.numPassengers ?? undefined,
      tripType: searchParams.tripType ?? undefined
    };
    if(enabled) {
      set(query, QueryPagePreviewModeParam, PreviewModeParamEnabledValue);
    }

    result = {
      path: navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale),
      force: false,
      query
    };
  } else {
    const searchParams = await searchOffersStore.getSearchParams('stays', false);
    const resolvedCitySlug = await resolveDestinationCitySlug(searchParams);

    const query = {
      citySlug: resolvedCitySlug ?? undefined,
      checkIn: searchParams.checkIn ? dayjs(searchParams.checkIn!).format(CheckInOutDateUrlFormat) : undefined,
      checkOut: searchParams.checkOut ? dayjs(searchParams.checkOut!).format(CheckInOutDateUrlFormat) : undefined,
      numGuests: searchParams.numGuests ?? undefined,
      numRooms: searchParams.numRooms ?? undefined
    };
    if(enabled) {
      set(query, QueryPagePreviewModeParam, PreviewModeParamEnabledValue);
    }
    
    result = {
      path: navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale),
      force: false,
      query
    };
  }

  logger.debug('search offers url constructed', { ctrlKey, searchKind, result });
  return result;
}

async function applyParamsAndFetchData (): Promise<void> {
  const searchKind: OfferKind = isFlightsTabActive.value ? 'flights' : 'stays'; 
  logger.verbose('applying user params and fetching', { ctrlKey, searchKind });
  
  const searchRoute = await validateAndGetRouteParams();
  if (appPage === AppPage.FindFlights || appPage === AppPage.FindStays) {
    logger.verbose('replacing search page query params', ctrlKey);
    router.replace(searchRoute);
  } else {
    logger.verbose('navigating to search page', ctrlKey);
    router.push(searchRoute);
  }
  searchOffersStore.load(searchKind);
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

const isSearchPage = (appPage === AppPage.FindFlights || appPage === AppPage.FindStays);
if(import.meta.client && isSearchPage) {
  const offersKind = appPage === AppPage.FindFlights ? 'flights' : 'stays';
  if(useNuxtApp().isHydrating) {
    await useSearchOffersStore().load(offersKind, { overrideParams: 'fromUrlQuery' });
  }
}

onMounted(() => {
  setTimeout(() => {
    hasMounted.value = true;
  });
});


const flightsTabHtmlId = useId()!;
const staysTabHtmlId = useId()!;

const searchBtnLabel = computed(() => {
  return showPromoBtn ? t(getI18nResName2('searchOffers', isFlightsTabActive.value ? 'showFlights' : 'showStays')) : '';
});

</script>

<template>
  <section :class="`block !overflow-visible bg-white dark:bg-gray-900 rounded-3xl shadow-lg dark:shadow-gray-700 mx-auto px-4 md:px-8 pt-1 pb-8 overflow-x-clip z-[2] ${!showPromoBtn ? 'pt-8' : ''}`" role="search">
    <div class="w-full h-auto">
      <div class="block w-full h-auto">
        <TabsGroup
          v-if="!singleTab"
          v-model:active-tab-key="selectedTab"
          :default-active-tab-key="SearchTabFlights"
          class="w-full pt-1"
          :ctrl-key="SearchOffersTabControl"
          :tabs="[
            { ctrlKey: SearchTabFlights, tabName: SearchTabFlights, slotName: 'flights', label: { resName: getI18nResName2('searchOffers', 'flightsTab'), shortIcon: 'i-material-symbols-flight' }, enabled: true },
            { ctrlKey: SearchTabStays, tabName: SearchTabStays, slotName: 'stays', label: { resName: getI18nResName2('searchOffers', 'staysTab'), shortIcon: 'i-material-symbols-bed' }, enabled: true }
          ]"
          variant="solid"
        >
          <template #flights>
            <div class="w-full h-auto">
              <SearchFlightOffers :id="flightsTabHtmlId" ref="search-flights" :ctrl-key="[...ctrlKey, 'FlightOffers']" />
            </div>
          </template>

          <template #stays>
            <div class="w-full h-auto">
              <SearchStayOffers :id="staysTabHtmlId" ref="search-stays" :ctrl-key="[...ctrlKey, 'StayOffers']" />
            </div>
          </template>
        </TabsGroup>
        <div v-else class="w-full h-auto">
          <h2 v-if="showPromoBtn" class="text-xl font-semibold mt-6 sm:mt-8 mb-8 text-primary-900 dark:text-white">
            {{ $t(getI18nResName2('searchOffers', 'whereToFly')) }}
          </h2>
          <div class="flex flex-row flex-wrap xl:flex-nowrap gap-[16px] sm:gap-[24px]">
            <div class="flex-1 w-full h-auto">
              <SearchFlightOffers v-if="isFlightsTabActive" :id="flightsTabHtmlId" ref="search-flights" :ctrl-key="[...ctrlKey, 'FlightOffers']"  />
              <SearchStayOffers v-else :id="staysTabHtmlId" ref="search-stays" :ctrl-key="[...ctrlKey, 'StayOffers']"  />
            </div>
            <UButton
              v-if="!showPromoBtn"
              class="flex-grow-1 xl:flex-grow-0 flex-shrink basis-auto w-full xl:w-auto xl:aspect-2/1 justify-center"
              size="lg"
              :aria-label="t(getI18nResName2('ariaLabels', 'ariaLabelSearch'))"
              icon="i-heroicons-magnifying-glass-solid"
              variant="solid"
              color="primary"
              @click="applyParamsAndFetchData"
            >
              {{ searchBtnLabel }}
            </UButton>
          </div>
        </div>
      </div>
      <div v-if="showPromoBtn" class="flex flex-col sm:flex-row justify-end items-center flex-nowrap gap-2 sm:gap-6 mt-2 sm:mt-8">
        <UPopover v-model:open="promoTooltipShown" :popper="{ placement: 'bottom' }" class="flex-grow-0 flex-shrink basis-auto">
          <UButton icon="i-ion-add" size="lg" class="w-fit text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-800 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent" variant="soft" color="gray" @click="scheduleTooltipAutoHide">
            {{ $t(getI18nResName2('searchOffers', 'addPromoCode')) }}
          </UButton>
          <template #panel="{ close }">
            <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
          </template>
        </UPopover>  
        <UButton
          class="flex-grow-0 flex-shrink basis-auto"
          size="lg"
          :aria-label="t(getI18nResName2('ariaLabels', 'ariaLabelSearch'))"
          icon="i-ion-paper-plane"
          variant="solid"
          color="primary"
          @click="applyParamsAndFetchData"
        >
          {{ searchBtnLabel }}
        </UButton>
      </div>
    </div>
  </section>
</template>

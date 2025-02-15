<script setup lang="ts">
import { AppConfig, type OfferKind, AppPage, getPagePath, getI18nResName1, getI18nResName2, type Locale, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, CheckInOutDateUrlFormat } from '@golobe-demo/shared';
import type { ISearchStayOffersMainParams, ISearchFlightOffersMainParams, ISearchFlightOffersParams, ISearchListItem, ISearchStayOffersParams } from './../../../types';
import dayjs from 'dayjs';
import isEqual from 'lodash-es/isEqual';
import pick from 'lodash-es/pick';
import TabsGroup from '../../forms/tabs-group.vue';
import { TooltipHideTimeout } from './../../../helpers/constants';
import type SearchFlightOffers from './search-flight-offers.vue';
import type SearchStayOffers from './search-stay-offers.vue';
import type { RouteLocationRaw } from 'vue-router';
import set from 'lodash-es/set';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getClientServices, getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  singleTab?: 'flights' | 'stays',
  showPromoBtn?: boolean,
  takeInitialValuesFromUrlQuery?: boolean // this will look into page's url query for initial values and may result into server fetch requests
}
const { ctrlKey, singleTab, showPromoBtn = false, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

const SearchTabFlights = `${ctrlKey}-TabFlights`;
const SearchTabStays = `${ctrlKey}-TabStays`;

const searchOffersStoreAccessor = useSearchOffersStore();
const clientEntityCache = import.meta.client ? getClientServices().getEntityCache() : undefined;

const selectedTab = ref<string | undefined>();
if(singleTab) {
  selectedTab.value = singleTab === 'stays' ? SearchTabStays : SearchTabFlights;
}

const promoTooltipShown = ref(false);
const searchFlights = useTemplateRef('search-flights');
const searchStays = useTemplateRef('search-stays');

const logger = getCommonServices().getLogger();
const router = useRouter();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const { locale, t } = useI18n();

const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);

async function resolveFlightCitiesSlugs (searchParams: Partial<ISearchFlightOffersParams>): Promise<{ fromCitySlug?: string | undefined, toCitySlug?: string | undefined }> {
  let fromCitySlug = searchParams.fromCity?.slug;
  let toCitySlug = searchParams.toCity?.slug;
  const citiesToResolve: ISearchListItem[] = [];
  if (searchParams.fromCity && !searchParams.fromCity.slug) {
    citiesToResolve.push(searchParams.fromCity);
  }
  if (searchParams.toCity && !searchParams.toCity.slug) {
    citiesToResolve.push(searchParams.toCity);
  }
  if (citiesToResolve.length === 0) {
    const result = { fromCitySlug, toCitySlug };
    logger.verbose(`(SearchOffers) resolved slugs without fetch requests, result=${JSON.stringify(result)}`);
    return result;
  }

  try {
    logger.verbose(`(SearchOffers) resolving cities slugs, items=${JSON.stringify(citiesToResolve)}`);
    const resolvedCities = (await clientEntityCache!.get<'City'>(citiesToResolve.map(i => i.id), [], 'City', { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default }))!;
    if (resolvedCities.length === 2) {
      fromCitySlug = resolvedCities[0].slug;
      toCitySlug = resolvedCities[1].slug;
    } else if (searchParams.fromCity && !searchParams.fromCity.slug) {
      fromCitySlug = resolvedCities[0].slug;
    } else {
      toCitySlug = resolvedCities[0].slug;
    }
    const result = { fromCitySlug, toCitySlug };
    logger.verbose(`(SearchOffers) slugs resolved with fetch request, result=${JSON.stringify(result)}`);
    return result;
  } catch (err: any) {
    logger.warn(`(SearchOffers) failed to resolve flight cities slugs, ctrlKey=${ctrlKey}`, err, citiesToResolve);
    return { fromCitySlug, toCitySlug };
  }
}

async function resolveDestinationCitySlug (searchParams: Partial<ISearchStayOffersParams>): Promise<string | undefined> {
  if (!searchParams.city) {
    logger.verbose('(SearchOffers) stay\'s city is not specified, no slug to resolve');
    return undefined;
  }

  if (searchParams.city.slug) {
    const result = searchParams.city.slug;
    logger.verbose(`(SearchOffers) stay's city slug resolved without fetch request, result=${result}`);
    return result;
  }

  try {
    const cityId = searchParams.city.id;
    logger.verbose(`(SearchOffers) resolving stay's city slug', cityId=${cityId}`);
    const resolvedCities = (await clientEntityCache!.get<'City'>([cityId], [], 'City', { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default }))!;
    const result = resolvedCities[0].slug;
    logger.verbose(`(SearchOffers) slugs resolved with fetch request, result=${result}`);
    return result;
  } catch (err: any) {
    logger.warn(`(SearchOffers) failed to resolve flight cities slugs, ctrlKey=${ctrlKey}`, err, searchParams.city);
    return undefined;
  }
}

async function validateAndGetRouteParams (): Promise<RouteLocationRaw | undefined> {
  const searchKind: OfferKind = selectedTab.value === SearchTabStays ? 'stays' : 'flights';
  if (searchKind === 'flights') {
    const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
    const userParams = searchFlightStore.viewState.currentSearchParams;
    const resolvedCitySlugs = await resolveFlightCitiesSlugs(userParams);

    const query = {
      class: userParams.class,
      dateFrom: userParams.dateFrom ? dayjs(userParams.dateFrom!).format(CheckInOutDateUrlFormat) : undefined,
      dateTo: userParams.dateTo ? dayjs(userParams.dateTo!).format(CheckInOutDateUrlFormat) : undefined,
      fromCitySlug: resolvedCitySlugs.fromCitySlug,
      toCitySlug: resolvedCitySlugs.toCitySlug,
      numPassengers: userParams.numPassengers,
      tripType: userParams.tripType,
    };
    if(enabled) {
      set(query, QueryPagePreviewModeParam, PreviewModeParamEnabledValue);
    }

    return {
      path: navLinkBuilder.buildPageLink(AppPage.FindFlights, locale.value as Locale),
      force: false,
      query
    };
  } else {
    const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);
    const userParams = searchStayStore.viewState.currentSearchParams;
    const resolvedCitySlug = await resolveDestinationCitySlug(userParams);

    const query = {
      citySlug: resolvedCitySlug,
      checkIn: userParams.checkIn ? dayjs(userParams.checkIn!).format(CheckInOutDateUrlFormat) : undefined,
      checkOut: userParams.checkOut ? dayjs(userParams.checkOut!).format(CheckInOutDateUrlFormat) : undefined,
      numGuests: userParams.numGuests,
      numRooms: userParams.numRooms
    };
    if(enabled) {
      set(query, QueryPagePreviewModeParam, PreviewModeParamEnabledValue);
    }
    
    return {
      path: navLinkBuilder.buildPageLink(AppPage.FindStays, locale.value as Locale),
      force: false,
      query
    };
  }
}

async function applyParamsAndFetchData (): Promise<void> {
  logger.verbose(`(SearchOffers) applying user params and fetching, ctrlKey=${ctrlKey}, selectedTab=${selectedTab.value}`);
  const searchKind: OfferKind = selectedTab.value === SearchTabStays ? 'stays' : 'flights';
  const store = await searchOffersStoreAccessor.getInstance(searchKind, false, false);
  if (searchKind === 'flights') {
    const searchParams = searchFlights.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  } else {
    const searchParams = searchStays.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  }
  if (store.resultState.status !== 'fetched' && store.resultState.status !== 'error') {
    logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${ctrlKey}, type=${searchKind}`);
    return;
  }

  const searchRoute = await validateAndGetRouteParams();
  if (searchRoute) {
    store.resetFetchState();

    const isOnSearchPage = router.currentRoute.value.path.includes(getPagePath(AppPage.FindFlights)) || router.currentRoute.value.path.includes(getPagePath(AppPage.FindStays));
    if (isOnSearchPage) {
      logger.info(`(SearchOffers) replacing search page query params, ctrlKey=${ctrlKey}`, searchRoute);
      router.replace(searchRoute);
      store.fetchData('full-refetch');
    } else {
      logger.info(`(SearchOffers) navigating to search page, ctrlKey=${ctrlKey}`, searchRoute);
      router.push(searchRoute);
    }
  }
  logger.verbose(`(SearchOffers) user params applied, fetch request sent, ctrlKey=${ctrlKey}`);
}

async function onSearchBtnClick () : Promise<void> {
  logger.debug(`(SearchOffers) search btn click handler, ctrlKey=${ctrlKey}`);
  await applyParamsAndFetchData();
}

async function refetchIfNotLatestSearchParams (): Promise<void> {
  logger.debug(`(SearchOffers) checking for refetch if not latest search params were used, ctrlKey=${ctrlKey}, selectedTab=${selectedTab.value}`);
  const searchKind: OfferKind = selectedTab.value === SearchTabStays ? 'stays' : 'flights';

  let paramsAreActual = true;
  if (searchKind === 'flights') {
    const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
    if (searchFlightStore.resultState.status !== 'fetched' && searchFlightStore.resultState.status !== 'error') {
      logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${ctrlKey}, type=${searchKind}`);
      return;
    }

    const fetchParams = pick(searchFlightStore.resultState.usedSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    const userParams = pick(searchFlightStore.viewState.currentSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose(`(SearchOffers) params used in last request are not actual, refetching with latest values, ctrlKey=${ctrlKey}, type=${searchKind}, fetchParams=${JSON.stringify(fetchParams)}, userParams=${JSON.stringify(userParams)}`);
    }
  } else {
    const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);
    if (searchStayStore.resultState.status !== 'fetched' && searchStayStore.resultState.status !== 'error') {
      logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${ctrlKey}, type=${searchKind}`);
      return;
    }

    const fetchParams = pick(searchStayStore.resultState.usedSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    const userParams = pick(searchStayStore.viewState.currentSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose(`(SearchOffers) params used in last request are not actual, refetching with latest values, ctrlKey=${ctrlKey}, type=${searchKind}, fetchParams=${JSON.stringify(fetchParams)}, userParams=${JSON.stringify(userParams)}`);
    }
  }

  if (paramsAreActual) {
    logger.debug(`(SearchOffers) fetch params are actual, refetch is not needed, ctrlKey=${ctrlKey}, type=${searchKind}`);
    return;
  }

  setTimeout(applyParamsAndFetchData, 0);
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

onMounted(async () => {
  watch(() => searchFlightStore.resultState.status, () => {
    refetchIfNotLatestSearchParams();
  });
  watch(() => searchStayStore.resultState.status, () => {
    refetchIfNotLatestSearchParams();
  });
});

const flightsTabHtmlId = useId()!;
const staysTabHtmlId = useId()!;

const searchBtnLabel = computed(() => {
  return showPromoBtn ? t(getI18nResName2('searchOffers', (singleTab === 'stays' || selectedTab.value === SearchTabStays) ? 'showStays' : 'showFlights')) : '';
});

</script>

<template>
  <section :class="`block !overflow-visible bg-white dark:bg-gray-900 rounded-3xl shadow-lg dark:shadow-gray-700 mx-auto px-4 md:px-8 pt-1 pb-8 overflow-x-clip z-[2] ${!showPromoBtn ? 'pt-8' : ''}`" role="search">
    <div class="w-full h-auto">
      <div class="block w-full h-auto">
        <TabsGroup
          v-if="!singleTab"
          v-model:active-tab-key="selectedTab"
          class="w-full pt-1"
          :ctrl-key="`${ctrlKey}-TabControl`"
          :tabs="[
            { ctrlKey: SearchTabFlights, tabName: SearchTabFlights, slotName: 'flights', label: { resName: getI18nResName2('searchOffers', 'flightsTab'), shortIcon: 'i-material-symbols-flight' }, enabled: true },
            { ctrlKey: SearchTabStays, tabName: SearchTabStays, slotName: 'stays', label: { resName: getI18nResName2('searchOffers', 'staysTab'), shortIcon: 'i-material-symbols-bed' }, enabled: true }
          ]"
          variant="solid"
        >
          <template #flights>
            <div class="w-full h-auto">
              <SearchFlightOffers :id="flightsTabHtmlId" ref="search-flights" ctrl-key="SearchFlightOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
            </div>
          </template>

          <template #stays>
            <div class="w-full h-auto">
              <SearchStayOffers :id="staysTabHtmlId" ref="search-stays" ctrl-key="SearchStayOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
            </div>
          </template>
        </TabsGroup>
        <div v-else class="w-full h-auto">
          <h2 v-if="showPromoBtn" class="text-xl font-semibold mt-6 sm:mt-8 mb-8 text-primary-900 dark:text-white">
            {{ $t(getI18nResName2('searchOffers', 'whereToFly')) }}
          </h2>
          <div class="flex flex-row flex-wrap xl:flex-nowrap gap-[16px] sm:gap-[24px]">
            <div class="flex-1 w-full h-auto">
              <SearchFlightOffers v-if="singleTab === 'flights'" :id="flightsTabHtmlId" ref="search-flights" ctrl-key="SearchFlightOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
              <SearchStayOffers v-else :id="staysTabHtmlId" ref="search-stays" ctrl-key="SearchStayOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
            </div>
            <UButton
              v-if="!showPromoBtn"
              class="flex-grow-1 xl:flex-grow-0 flex-shrink basis-auto w-full xl:w-auto xl:aspect-2/1 justify-center"
              size="lg"
              :aria-label="t(getI18nResName2('ariaLabels', 'ariaLabelSearch'))"
              icon="i-heroicons-magnifying-glass-solid"
              variant="solid"
              color="primary"
              @click="onSearchBtnClick"
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
          @click="onSearchBtnClick"
        >
          {{ searchBtnLabel }}
        </UButton>
      </div>
    </div>
  </section>
</template>

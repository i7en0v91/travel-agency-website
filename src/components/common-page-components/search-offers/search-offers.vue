<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { type EntityId, type OfferKind, AppPage, getPagePath, getI18nResName1, getI18nResName2, type Locale, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, CheckInOutDateUrlFormat } from '@golobe-demo/shared';
import type { ISearchStayOffersMainParams, ISearchFlightOffersMainParams, ISearchFlightOffersParams, ISearchStayOffersParams } from './../../../types';
import type { Tooltip } from 'floating-vue';
import dayjs from 'dayjs';
import isEqual from 'lodash-es/isEqual';
import pick from 'lodash-es/pick';
import OptionButtonGroup from './../../../components/option-buttons/option-button-group.vue';
import { TooltipHideTimeout } from './../../../helpers/constants';
import SearchFlightOffers from './search-flight-offers.vue';
import SearchStayOffers from './search-stay-offers.vue';
import type { RouteLocationRaw } from 'vue-router';
import set from 'lodash-es/set';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useEntityCacheStore } from '../../../stores/entity-cache-store';

interface IProps {
  ctrlKey: ControlKey,
  singleTab?: 'flights' | 'stays',
  minimumButtons?: boolean,
  takeInitialValuesFromUrlQuery?: boolean // this will look into page's url query for initial values and may result into server fetch requests
}
const { ctrlKey, singleTab, minimumButtons = false, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

const SearchOffersOptionButtonGroup: ControlKey = [...ctrlKey, 'OptionBtnGroup'];
const SearchTabFlights: ControlKey = [...SearchOffersOptionButtonGroup, 'Flights', 'Option'];
const SearchTabStays: ControlKey = [...SearchOffersOptionButtonGroup, 'Stays', 'Option'];

const searchOffersStoreAccessor = useSearchOffersStore();
const entityCacheStore = useEntityCacheStore();

const activeSearchTab = ref<ControlKey>();

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');
const searchFlights = useTemplateRef('search-flights');
const searchStays = useTemplateRef('search-stays');

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchOffers' });
const router = useRouter();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const { locale } = useI18n();
const hasMounted = ref(false);

const isFlightsTabActive = computed(() => {
  if(singleTab === 'stays') {
    return false;
  }
  if(singleTab === 'flights') {
    return true;
  }
  return !hasMounted.value || (activeSearchTab.value && areCtrlKeysEqual(activeSearchTab.value, SearchTabFlights));
});

async function resolveFlightCitiesSlugs (searchParams: Partial<ISearchFlightOffersParams>): Promise<{ fromCitySlug: string | undefined, toCitySlug: string | undefined }> {
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
    } else if (searchParams.fromCityId && !searchParams.fromCityId) {
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

async function resolveDestinationCitySlug (searchParams: Partial<ISearchStayOffersParams>): Promise<string | undefined> {
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

async function validateAndGetRouteParams (): Promise<RouteLocationRaw | undefined> {
  const searchKind: OfferKind = isFlightsTabActive.value ? 'flights' : 'stays';
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
  logger.verbose('applying user params and fetching', ctrlKey);
  const searchKind: OfferKind = isFlightsTabActive.value ? 'flights' : 'stays';
  const store = await searchOffersStoreAccessor.getInstance(searchKind, false, false);
  if (searchKind === 'flights') {
    const searchParams = searchFlights.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  } else {
    const searchParams = searchStays.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  }
  if (store.resultState.status !== 'fetched' && store.resultState.status !== 'error') {
    logger.debug('apply, checking for refetch skipped, as fetch is in progress', { ctrlKey, type: searchKind });
    return;
  }

  const searchRoute = await validateAndGetRouteParams();
  if (searchRoute) {
    store.resetFetchState();

    const isOnSearchPage = router.currentRoute.value.path.includes(getPagePath(AppPage.FindFlights)) || router.currentRoute.value.path.includes(getPagePath(AppPage.FindStays));
    if (isOnSearchPage) {
      logger.info('replacing search page query params', ctrlKey);
      router.replace(searchRoute);
      store.fetchData('full-refetch');
    } else {
      logger.info('navigating to search page', ctrlKey);
      router.push(searchRoute);
    }
  }
  logger.verbose('user params applied, fetch request sent', ctrlKey);
}

async function onSearchBtnClick () : Promise<void> {
  logger.debug('search btn click handler', ctrlKey);
  await applyParamsAndFetchData();
}

async function refetchIfNotLatestSearchParams (): Promise<void> {
  const searchKind: OfferKind = isFlightsTabActive.value ? 'flights' : 'stays';
  logger.debug('checking for refetch if not latest search params were used', { ctrlKey, type: searchKind });

  let paramsAreActual = true;
  if (searchKind === 'flights') {
    const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
    if (searchFlightStore.resultState.status !== 'fetched' && searchFlightStore.resultState.status !== 'error') {
      logger.debug('checking for flights refetch skipped, as fetch is in progress', { ctrlKey, type: searchKind });
      return;
    }

    const fetchParams = pick(searchFlightStore.resultState.usedSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    const userParams = pick(searchFlightStore.viewState.currentSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose('params used in last request are not actual, refetching flights with latest values', { ctrlKey, type: searchKind, fetchParams, userParams });
    }
  } else {
    const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);
    if (searchStayStore.resultState.status !== 'fetched' && searchStayStore.resultState.status !== 'error') {
      logger.debug('checking for stays refetch skipped, as fetch is in progress', { ctrlKey, type: searchKind });
      return;
    }

    const fetchParams = pick(searchStayStore.resultState.usedSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    const userParams = pick(searchStayStore.viewState.currentSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose('params used in last request are not actual, refetching stays with latest values', { ctrlKey, type: searchKind, fetchParams, userParams });
    }
  }

  if (paramsAreActual) {
    logger.debug('fetch params are actual, refetch is not needed', { ctrlKey, type: searchKind });
    return;
  }

  setTimeout(applyParamsAndFetchData, 0);
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

onMounted(async () => {
  const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
  const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);
  watch(() => searchFlightStore.resultState.status, () => {
    refetchIfNotLatestSearchParams();
  });
  watch(() => searchStayStore.resultState.status, () => {
    refetchIfNotLatestSearchParams();
  });
  setTimeout(() => {
    hasMounted.value = true;
  });
});

const flightsTabHtmlId = useId()!;
const staysTabHtmlId = useId()!;
const tooltipId = useId()!;

</script>

<template>
  <section class="search-offers mx-xs-3 mx-m-5 px-xs-3 px-m-4 pt-xs-1 pb-xs-4" role="search">
    <OptionButtonGroup
      v-if="!singleTab && !minimumButtons"
      v-model:active-option-key="activeSearchTab"
      :default-active-option-key="SearchTabFlights"
      class="search-offers-tab-control mt-xs-1"
      role="tablist"
      :ctrl-key="SearchOffersOptionButtonGroup"
      :options="[
        { ctrlKey: SearchTabFlights, labelResName: getI18nResName2('searchOffers', 'flightsTab'), shortIcon: 'airplane', enabled: true, role: { role: 'tab', tabPanelId: flightsTabHtmlId } },
        { ctrlKey: SearchTabStays, labelResName: getI18nResName2('searchOffers', 'staysTab'), shortIcon: 'bed', enabled: true, role: { role: 'tab', tabPanelId: staysTabHtmlId } },
      ]"
    />
    <h2 v-else-if="!minimumButtons" class="search-offers-single-header mt-xs-4 mt-s-5 mb-xs-5">
      {{ $t(getI18nResName2('searchOffers', 'whereToFly')) }}
    </h2>
    <div :class="`mt-xs-4 ${minimumButtons ? 'search-offer-minimal-buttons-container' : ''}`">
      <KeepAlive>
        <SearchFlightOffers
          v-if="isFlightsTabActive" 
          :id="flightsTabHtmlId" 
          ref="search-flights" 
          :ctrl-key="[...ctrlKey, 'FlightOffers']"
          :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" 
        />
        <SearchStayOffers 
          v-else 
          :id="staysTabHtmlId" 
          ref="search-stays" 
          :ctrl-key="[...ctrlKey, 'StayOffers']"
          :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" 
        />
      </KeepAlive>
      <SimpleButton
        v-if="minimumButtons"
        class="search-offers-btn-minimum-show"
        :ctrl-key="[...ctrlKey, 'Btn', 'Search', 1]"
        :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelSearch')"
        icon="magnifier"
        kind="default"
        @click="onSearchBtnClick"
      />
    </div>
    <div v-if="!minimumButtons" class="search-offers-buttons mt-xs-2 mt-s-5">
      <VTooltip
        ref="tooltip"
        :aria-id="tooltipId"
        :distance="6"
        :triggers="['click']"
        placement="bottom"
        :flip="false"
        theme="default-tooltip"
        :auto-hide="true"
        no-auto-focus
        @apply-show="scheduleTooltipAutoHide"
      >
        <SimpleButton
          class="search-offers-btn-promocode"
          :ctrl-key="[...ctrlKey, 'Btn', 'PromoCode']"
          icon="plus-simple"
          :label-res-name="getI18nResName2('searchOffers', 'addPromoCode')"
          kind="support"
        />
        <template #popper>
          <div>
            {{ $t(getI18nResName1('notAvailableInDemo')) }}
          </div>
        </template>
      </VTooltip>
      <SimpleButton
        class="search-offers-btn-show"
        :ctrl-key="[...ctrlKey, 'Btn', 'Search', 2]"
        :label-res-name="getI18nResName2('searchOffers', isFlightsTabActive ? 'showFlights' : 'showStays')"
        icon="paper-plane"
        kind="default"
        @click="onSearchBtnClick"
      />
    </div>
  </section>
</template>

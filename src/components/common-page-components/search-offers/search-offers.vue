<script setup lang="ts">

import type { Tooltip } from 'floating-vue';
import dayjs from 'dayjs';
import isEqual from 'lodash-es/isEqual';
import pick from 'lodash-es/pick';
import { type Locale, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, CheckInOutDateUrlFormat, TooltipHideTimeout } from './../../../shared/constants';
import { AppPage, getPagePath } from './../../../shared/page-query-params';
import OptionButtonGroup from './../../../components/option-buttons/option-button-group.vue';
import { getI18nResName1, getI18nResName2 } from './../../../shared/i18n';
import SearchFlightOffers from './search-flight-offers.vue';
import SearchStayOffers from './search-stay-offers.vue';
import { type ISearchStayOffersMainParams, type ISearchFlightOffersMainParams, type ISearchFlightOffersParams, type OfferKind, type ISearchListItem, type ISearchStayOffersParams } from './../../../shared/interfaces';
import AppConfig from './../../../appconfig';
import { type RouteLocationRaw } from 'vue-router';
import set from 'lodash-es/set';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';
import { usePreviewState } from './../../../composables/preview-state';

interface IProps {
  ctrlKey: string,
  singleTab?: 'flights' | 'stays',
  minimumButtons?: boolean,
  takeInitialValuesFromUrlQuery?: boolean // this will look into page's url query for initial values and may result into server fetch requests
}
const props = withDefaults(defineProps<IProps>(), {
  singleTab: undefined,
  minimumButtons: false,
  takeInitialValuesFromUrlQuery: false
});

const SearchTabFlights = `${props.ctrlKey}-TabFlights`;
const SearchTabStays = `${props.ctrlKey}-TabStays`;
const DefaultSearchTab = props.singleTab === 'stays' ? SearchTabStays : SearchTabFlights;

const searchOffersStoreAccessor = useSearchOffersStore();
const clientEntityCache = import.meta.client ? ClientServicesLocator.getEntityCache() : undefined;

const controlSettingsStore = useControlSettingsStore();
const activeSearchTab = controlSettingsStore.getControlValueSetting(`${props.ctrlKey}-TabControl`, DefaultSearchTab);
if (props.singleTab) {
  activeSearchTab.value = props.singleTab === 'flights' ? SearchTabFlights : SearchTabStays;
}
const tooltip = shallowRef<InstanceType<typeof Tooltip>>();
const searchFlights = shallowRef<InstanceType<typeof SearchFlightOffers> | undefined>();
const searchStays = shallowRef<InstanceType<typeof SearchStayOffers> | undefined>();

const logger = CommonServicesLocator.getLogger();
const router = useRouter();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const { locale } = useI18n();

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
    logger.warn(`(SearchOffers) failed to resolve flight cities slugs, ctrlKey=${props.ctrlKey}`, err, citiesToResolve);
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
    logger.warn(`(SearchOffers) failed to resolve flight cities slugs, ctrlKey=${props.ctrlKey}`, err, searchParams.city);
    return undefined;
  }
}

async function validateAndGetRouteParams (): Promise<RouteLocationRaw | undefined> {
  const searchKind: OfferKind = activeSearchTab.value === SearchTabStays ? 'stays' : 'flights';
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
  logger.verbose(`(SearchOffers) applying user params and fetching, ctrlKey=${props.ctrlKey}`);
  const searchKind: OfferKind = activeSearchTab.value === SearchTabStays ? 'stays' : 'flights';
  const store = await searchOffersStoreAccessor.getInstance(searchKind, false, false);
  if (searchKind === 'flights') {
    const searchParams = searchFlights.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  } else {
    const searchParams = searchStays.value!.getSearchParamsFromInputControls();
    store.setMainSearchParams(searchParams!);
  }
  if (store.resultState.status !== 'fetched' && store.resultState.status !== 'error') {
    logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${props.ctrlKey}, type=${searchKind}`);
    return;
  }

  const searchRoute = await validateAndGetRouteParams();
  if (searchRoute) {
    store.resetFetchState();

    const isOnSearchPage = router.currentRoute.value.path.includes(getPagePath(AppPage.FindFlights)) || router.currentRoute.value.path.includes(getPagePath(AppPage.FindStays));
    if (isOnSearchPage) {
      logger.info(`(SearchOffers) replacing search page query params, ctrlKey=${props.ctrlKey}`, searchRoute);
      router.replace(searchRoute);
      store.fetchData('full-refetch');
    } else {
      logger.info(`(SearchOffers) navigating to search page, ctrlKey=${props.ctrlKey}`, searchRoute);
      router.push(searchRoute);
    }
  }
  logger.verbose(`(SearchOffers) user params applied, fetch request sent, ctrlKey=${props.ctrlKey}`);
}

async function onSearchBtnClick () : Promise<void> {
  logger.debug(`(SearchOffers) search btn click handler, ctrlKey=${props.ctrlKey}`);
  await applyParamsAndFetchData();
}

async function refetchIfNotLatestSearchParams (): Promise<void> {
  const searchKind: OfferKind = activeSearchTab.value === SearchTabStays ? 'stays' : 'flights';
  logger.debug(`(SearchOffers) checking for refetch if not latest search params were used, ctrlKey=${props.ctrlKey}, type=${searchKind}`);

  let paramsAreActual = true;
  if (searchKind === 'flights') {
    const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false, false);
    if (searchFlightStore.resultState.status !== 'fetched' && searchFlightStore.resultState.status !== 'error') {
      logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${props.ctrlKey}, type=${searchKind}`);
      return;
    }

    const fetchParams = pick(searchFlightStore.resultState.usedSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    const userParams = pick(searchFlightStore.viewState.currentSearchParams, ['class', 'dateFrom', 'dateTo', 'fromCity.id', 'toCity.id', 'numPassengers', 'tripType'] as Array<keyof ISearchFlightOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose(`(SearchOffers) params used in last request are not actual, refetching with latest values, ctrlKey=${props.ctrlKey}, type=${searchKind}, fetchParams=${JSON.stringify(fetchParams)}, userParams=${JSON.stringify(userParams)}`);
    }
  } else {
    const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false, false);
    if (searchStayStore.resultState.status !== 'fetched' && searchStayStore.resultState.status !== 'error') {
      logger.debug(`(SearchOffers) checking for refetch skipped, as fetch is in progress, ctrlKey=${props.ctrlKey}, type=${searchKind}`);
      return;
    }

    const fetchParams = pick(searchStayStore.resultState.usedSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    const userParams = pick(searchStayStore.viewState.currentSearchParams, ['checkIn', 'checkOut', 'city.id', 'numGuests', 'numRooms'] as Array<keyof ISearchStayOffersMainParams>);
    paramsAreActual = isEqual(fetchParams, userParams);
    if (!paramsAreActual) {
      logger.verbose(`(SearchOffers) params used in last request are not actual, refetching with latest values, ctrlKey=${props.ctrlKey}, type=${searchKind}, fetchParams=${JSON.stringify(fetchParams)}, userParams=${JSON.stringify(userParams)}`);
    }
  }

  if (paramsAreActual) {
    logger.debug(`(SearchOffers) fetch params are actual, refetch is not needed, ctrlKey=${props.ctrlKey}, type=${searchKind}`);
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
});

const flightsTabHtmlId = useId();
const staysTabHtmlId = useId();
const tooltipId = useId();

</script>

<template>
  <section class="search-offers mx-xs-3 mx-m-5 px-xs-3 px-m-4 pt-xs-1 pb-xs-4" role="search">
    <OptionButtonGroup
      v-if="!singleTab && !minimumButtons"
      v-model:active-option-ctrl="activeSearchTab.value"
      class="search-offers-tab-control mt-xs-1"
      role="tablist"
      :ctrl-key="`${props.ctrlKey}-TabControl`"
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
        <SearchFlightOffers v-if="singleTab === 'flights' || activeSearchTab.value === SearchTabFlights" :id="flightsTabHtmlId" ref="searchFlights" ctrl-key="SearchFlightOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
        <SearchStayOffers v-else :id="staysTabHtmlId" ref="searchStays" ctrl-key="SearchStayOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
      </KeepAlive>
      <SimpleButton
        v-if="minimumButtons"
        class="search-offers-btn-minimum-show"
        :ctrl-key="`${props.ctrlKey}-ShowMinimumBtn`"
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
          :ctrl-key="`${props.ctrlKey}-PromoCodeBtn`"
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
        :ctrl-key="`${props.ctrlKey}-ShowBtn`"
        :label-res-name="getI18nResName2('searchOffers', (singleTab === 'flights' || activeSearchTab.value === SearchTabFlights) ? 'showFlights' : 'showStays')"
        icon="paper-plane"
        kind="default"
        @click="onSearchBtnClick"
      />
    </div>
  </section>
</template>

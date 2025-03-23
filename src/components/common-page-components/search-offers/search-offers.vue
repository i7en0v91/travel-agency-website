<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { type EntityId, type OfferKind, AppPage, lookupPageByUrl, getI18nResName1, getI18nResName2, type Locale, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, CheckInOutDateUrlFormat } from '@golobe-demo/shared';
import type { ISearchFlightOffersMainParams, ISearchStayOffersMainParams, ISearchFlightOffersParams, ISearchStayOffersParams } from './../../../types';
import type { Tooltip } from 'floating-vue';
import dayjs from 'dayjs';
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
  minimumButtons?: boolean
}
const { ctrlKey, singleTab, minimumButtons = false } = defineProps<IProps>();

const SearchOffersOptionButtonGroup: ControlKey = [...ctrlKey, 'OptionBtnGroup'];
const SearchTabFlights: ControlKey = [...SearchOffersOptionButtonGroup, 'Flights', 'Option'];
const SearchTabStays: ControlKey = [...SearchOffersOptionButtonGroup, 'Stays', 'Option'];

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchOffers' });

const searchOffersStore = useSearchOffersStore();
const entityCacheStore = useEntityCacheStore();

const router = useRouter();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const { locale } = useI18n();

const hasMounted = ref(false);
const activeSearchTab = ref<ControlKey>();

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');

const flightsTabHtmlId = useId()!;
const staysTabHtmlId = useId()!;
const tooltipId = useId()!;

const appPage = lookupPageByUrl(router.currentRoute.value.path);

const isFlightsTabActive = computed(() => {
  if(singleTab === 'stays') {
    return false;
  }
  if(singleTab === 'flights') {
    return true;
  }
  return !hasMounted.value || (activeSearchTab.value && areCtrlKeysEqual(activeSearchTab.value, SearchTabFlights));
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
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
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
        />
        <SearchStayOffers 
          v-else 
          :id="staysTabHtmlId" 
          ref="search-stays" 
          :ctrl-key="[...ctrlKey, 'StayOffers']"
        />
      </KeepAlive>
      <SimpleButton
        v-if="minimumButtons"
        class="search-offers-btn-minimum-show"
        :ctrl-key="[...ctrlKey, 'Btn', 'Search', 1]"
        :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelSearch')"
        icon="magnifier"
        kind="default"
        @click="applyParamsAndFetchData"
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
        @click="applyParamsAndFetchData"
      />
    </div>
  </section>
</template>

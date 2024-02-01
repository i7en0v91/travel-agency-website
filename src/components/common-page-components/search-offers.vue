<script setup lang="ts">

import { Tooltip } from 'floating-vue';
import dayjs from 'dayjs';
import { TooltipHideTimeout } from './../../shared/constants';
import OptionButtonGroup from './../components/option-buttons/option-button-group.vue';
import { getI18nResName1, getI18nResName2 } from './../../shared/i18n';
import SearchFlightOffers from './search-flight-offers.vue';
import SearchStayOffers from './search-stay-offers.vue';
import { useControlSettingsStore } from './../../stores/control-settings-store';
import { type ISearchFlightOffersParams, type SearchOfferKind, type ISearchListItem, type IEntityCacheCityItem, type ISearchStayOffersParams } from './../../shared/interfaces';
import { useSearchOffersStore } from './../../stores/search-offers-store';
import AppConfig from './../../appconfig';
import { type RouteLocationRaw } from '#vue-router';

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
const DefaultSearchTab = SearchTabFlights;

const searchOffersStoreAccessor = useSearchOffersStore();
const clientEntityCache = process.client ? ClientServicesLocator.getEntityCache() : undefined;

const controlSettingsStore = useControlSettingsStore();
const activeSearchTab = controlSettingsStore.getControlValueSetting(`${props.ctrlKey}-TabControl`, DefaultSearchTab);
if (props.minimumButtons && props.singleTab) {
  activeSearchTab.value = props.singleTab === 'flights' ? SearchTabFlights : SearchTabStays;
}
const tooltip = ref<InstanceType<typeof Tooltip>>();

const logger = CommonServicesLocator.getLogger();
const router = useRouter();
const localePath = useLocalePath();

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
    const resolvedCities = (await clientEntityCache!.get<'City', IEntityCacheCityItem>(citiesToResolve.map(i => i.id), 'City', { expireInSeconds: AppConfig.clientCache.expirationsSeconds.default }))!;
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
    const resolvedCities = (await clientEntityCache!.get<'City', IEntityCacheCityItem>([cityId], 'City', { expireInSeconds: AppConfig.clientCache.expirationsSeconds.default }))!;
    const result = resolvedCities[0].slug;
    logger.verbose(`(SearchOffers) slugs resolved with fetch request, result=${result}`);
    return result;
  } catch (err: any) {
    logger.warn(`(SearchOffers) failed to resolve flight cities slugs, ctrlKey=${props.ctrlKey}`, err, searchParams.city);
    return undefined;
  }
}

async function validateAndGetRouteParams (): Promise<RouteLocationRaw | undefined> {
  const searchKind: SearchOfferKind = activeSearchTab.value === SearchTabStays ? 'stays' : 'flights';
  if (searchKind === 'flights') {
    const searchFlightStore = await searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>('flights', false);
    const userParams = searchFlightStore.currentSearchParams;
    const resolvedCitySlugs = await resolveFlightCitiesSlugs(userParams);

    return {
      path: localePath('find-flights'),
      force: false,
      query: {
        class: userParams.class,
        dateFrom: userParams.dateFrom ? dayjs(userParams.dateFrom!).format('YYYY-MM-DD') : undefined,
        dateTo: userParams.dateTo ? dayjs(userParams.dateTo!).format('YYYY-MM-DD') : undefined,
        fromCitySlug: resolvedCitySlugs.fromCitySlug,
        toCitySlug: resolvedCitySlugs.toCitySlug,
        numPassengers: userParams.numPassengers,
        tripType: userParams.tripType
      }
    };
  } else {
    const searchStayStore = await searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>('stays', false);
    const userParams = searchStayStore.currentSearchParams;
    const resolvedCitySlug = await resolveDestinationCitySlug(userParams);

    return {
      path: localePath('find-stays'),
      force: false,
      query: {
        citySlug: resolvedCitySlug,
        checkIn: userParams.checkIn ? dayjs(userParams.checkIn!).format('YYYY-MM-DD') : undefined,
        checkOut: userParams.checkOut ? dayjs(userParams.checkOut!).format('YYYY-MM-DD') : undefined,
        numGuests: userParams.numGuests,
        numRooms: userParams.numRooms
      }
    };
  }
}

async function onSearchBtnClick () : Promise<void> {
  logger.verbose(`(SearchOffers) search btn click handler, ctrlKey=${props.ctrlKey}`);
  const searchRoute = await validateAndGetRouteParams();
  if (searchRoute) {
    logger.info(`(SearchOffers) navigating to search page, ctrlKey=${props.ctrlKey}`, searchRoute);
    router.push(searchRoute);
  }
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

</script>

<template>
  <div class="search-offers mx-xs-3 mx-m-5 mb-xs-5 px-xs-3 px-m-4 pt-xs-1 pb-xs-4" role="search">
    <OptionButtonGroup
      v-if="!singleTab && !minimumButtons"
      v-model:active-option-ctrl="activeSearchTab.value"
      class="search-offers-tab-control"
      :ctrl-key="`${props.ctrlKey}-TabControl`"
      :options="[
        { ctrlKey: SearchTabFlights, labelResName: getI18nResName2('searchOffers', 'flightsTab'), shortIcon: 'airplane', enabled: true },
        { ctrlKey: SearchTabStays, labelResName: getI18nResName2('searchOffers', 'staysTab'), shortIcon: 'bed', enabled: true },
      ]"
    />
    <div v-else-if="!minimumButtons" class="search-offers-single-header mt-xs-4 mt-s-5 mb-xs-5" role="heading" aria-level="5">
      {{ $t(getI18nResName2('searchOffers', 'whereToFly')) }}
    </div>
    <div :class="`mt-xs-4 ${minimumButtons ? 'search-offer-minimal-buttons-container' : ''}`">
      <KeepAlive>
        <SearchFlightOffers v-if="singleTab === 'flights' || activeSearchTab.value === SearchTabFlights" ctrl-key="SearchFlightOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
        <SearchStayOffers v-else ctrl-key="SearchStayOffersBox" :take-initial-values-from-url-query="takeInitialValuesFromUrlQuery" />
      </KeepAlive>
      <SimpleButton
        v-if="minimumButtons"
        class="search-offers-btn-minimum-show"
        :ctrl-key="`${props.ctrlKey}-ShowMinimumBtn`"
        icon="magnifier"
        kind="default"
        @click="onSearchBtnClick"
      />
    </div>
    <div v-if="!minimumButtons" class="search-offers-buttons mt-xs-2 mt-s-5">
      <VTooltip
        ref="tooltip"
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
  </div>
</template>

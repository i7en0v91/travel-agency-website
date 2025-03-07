<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { DefaultFlightTripType, type EntityId, type FlightClass, type TripType, getI18nResName2, FlightMinPassengers, DefaultFlightClass } from '@golobe-demo/shared';
import type { ISearchFlightOffersMainParams, ISearchFlightOffersParams } from './../../../types';
import FieldFrame from './../../forms/field-frame.vue';
import SearchListInput from './../../forms/search-list-input.vue';
import DropdownList from './../../../components/forms/dropdown-list.vue';
import SearchFlightDatePicker from './search-flights-date-picker.vue';
import SearchFlightsParams from './search-flights-params.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { defu } from 'defu';

interface IProps {
  ctrlKey: ControlKey,
  takeInitialValuesFromUrlQuery?: boolean
}
const { ctrlKey, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightOffers' });

const fromCityId = ref<EntityId | undefined>();
const toCityId = ref<EntityId | undefined>();
const fromExclusionIds = ref<EntityId[]>([]);
const toExclusionIds = ref<EntityId[]>([]);
const flightParams = ref<{ passengers: number, class: FlightClass }>();
const tripType = ref<TripType>();
const tripDates = ref<Date[]>();

const toComponent = useTemplateRef('to-component');

const searchOffersStoreAccessor = useSearchOffersStore();

defineExpose({
  getSearchParamsFromInputControls
});

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchFlightOffersMainParams>> | undefined;
if (takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', true, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  fromCityId.value = displayedSearchParams.value?.fromCityId;
  toCityId.value = displayedSearchParams.value?.toCityId;
  tripType.value = displayedSearchParams.value?.tripType ?? DefaultFlightTripType;
  tripDates.value = displayedSearchParams ? (getInitiallySelectedDates(displayedSearchParams.value) ?? []) : [];
  flightParams.value = defu({ class: displayedSearchParams.value?.class, passengers: displayedSearchParams.value?.numPassengers }, {  class: DefaultFlightClass, passengers: FlightMinPassengers });
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', false, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(getSearchParamsFromInputControls);
}

function getSearchParamsFromInputControls (): Partial<ISearchFlightOffersMainParams> {
  return {
    type: 'flights',
    fromCityId: fromCityId.value,
    toCityId: toCityId.value,
    tripType: tripType.value,
    dateFrom: (tripDates.value?.length ?? 0) > 0 ? tripDates.value![0] : undefined,
    dateTo: (tripDates.value?.length ?? 0) > 1 ? tripDates.value![1] : undefined,
    numPassengers: flightParams.value?.passengers,
    class: flightParams.value?.class
  } as Partial<ISearchFlightOffersMainParams>;
}

function getInitiallySelectedDates (params: Partial<ISearchFlightOffersMainParams>) : Date[] | undefined {
  if (params.dateFrom && params.dateTo) {
    return [params.dateFrom, params.dateTo];
  } else if (params.dateFrom) {
    return [params.dateFrom];
  }
  return undefined;
}

let swapOperationInProgress = false;
let autoFocusAllowed = false;

function onDestinationChanged (isFrom: boolean, newCityId?: EntityId | undefined) {
  logger.verbose('destination changes', { isFrom, id: newCityId ?? '[none]', swapInProgress: swapOperationInProgress });
  if (swapOperationInProgress) {
    return;
  }

  if (isFrom) {
    if (newCityId) {
      toExclusionIds.value = [newCityId];
    } else {
      toExclusionIds.value = [];
    }
    if (autoFocusAllowed && newCityId) { // newId not-null check not to jump out of empty input field
      toComponent.value?.setInputFocus();
    }
  } else {
     
    if (newCityId) {
      fromExclusionIds.value = [newCityId];
    } else {
      fromExclusionIds.value = [];
    }
  }
}

function onSwapButtonClick () {
  swapOperationInProgress = true;

  try {
    toExclusionIds.value = [];
    fromExclusionIds.value = [];

    const prevFromCityValue = fromCityId.value;
    const prevToCityValue = toCityId.value;

    toCityId.value = prevFromCityValue;
    fromCityId.value = prevToCityValue;

    setTimeout(() => {
      if (prevToCityValue) {
        toExclusionIds.value = [prevToCityValue];
      }
      if (prevFromCityValue) {
        fromExclusionIds.value = [prevFromCityValue];
      }
    }, 0);
  } finally {
    swapOperationInProgress = false;
  }
}

onMounted(() => {
  watch(fromCityId, () => {
    onDestinationChanged(true, fromCityId.value);
  });

  watch(toCityId, () => {
    onDestinationChanged(false, toCityId.value);
  });

  if (takeInitialValuesFromUrlQuery) {
    watch([fromCityId, toCityId, flightParams, tripType, tripDates], () => {
      logger.debug('search params watch handler', ctrlKey);
      const inputParams = getSearchParamsFromInputControls();
      $emit('change', inputParams);
    });
  } else {
    watch(displayedSearchParams, () => {
      logger.debug('search params change handler', ctrlKey);
      $emit('change', displayedSearchParams!.value);
    });
  }

  setTimeout(() => {
    autoFocusAllowed = true;
  }, 1000);
});

const $emit = defineEmits<{(event: 'change', params: Partial<ISearchFlightOffersMainParams>): void}>();

</script>

<template>
  <div class="search-offers-controls search-flight-offers">
    <FieldFrame class="search-flights-geo" :text-res-name="getI18nResName2('searchFlights', 'destinationCaption')">
      <div class="search-flights-geo-content">
        <div class="search-flights-geo-searchlists">
          <SearchListInput
            v-model:selected-value="fromCityId"
            :exclusion-ids="fromExclusionIds"
            :ctrl-key="[...ctrlKey, 'From', 'SearchList']"
            type="City"
            list-container-class="search-offers-dropdown-list-container"
            :placeholder-res-name="getI18nResName2('searchFlights', 'fromPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelFrom')"
          />
          <span class="flights-geo-searchlists-sep">-</span>
          <SearchListInput
            ref="to-component"
            v-model:selected-value="toCityId"
            :exclusion-ids="toExclusionIds"
            :ctrl-key="[...ctrlKey, 'To', 'SearchList']"
            type="City"
            list-container-class="search-offers-dropdown-list-container"
            :placeholder-res-name="getI18nResName2('searchFlights', 'toPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelTo')"
          />
        </div>
        <div class="search-flights-geo-swap-div brdr-1">
          <button class="search-flights-geo-swap" type="button" :aria-label="$t(getI18nResName2('ariaLabels', 'ariaLabelSwap'))" @click="onSwapButtonClick">
&nbsp;
          </button>
        </div>
      </div>
    </FieldFrame>
    <div class="search-flights-triparams">
      <DropdownList
        v-model:selected-value="tripType"
        :ctrl-key="[...ctrlKey, 'TripType', 'Dropdown']"
        class="search-flights-trip-type"
        :caption-res-name="getI18nResName2('searchFlights', 'tripCaption')"
        list-container-class="search-offers-dropdown-list-container"
        :items="[ {value: 'oneway', resName: getI18nResName2('searchFlights', 'tripOneway')}, {value: 'return', resName: getI18nResName2('searchFlights', 'tripReturn')} ]"
      />
      <SearchFlightDatePicker 
        v-model:selected-dates="tripDates" 
        :mode="tripType === 'oneway' ? 'single' : 'range'" 
        :ctrl-key="[...ctrlKey, 'Dates']" 
        :caption-res-name="tripType === 'oneway' ? (getI18nResName2('searchFlights', 'dateSingle')) : (getI18nResName2('searchFlights', 'dateRange'))" 
      />
    </div>
    <SearchFlightsParams v-model:params="flightParams" class="search-flights-flightparams" :ctrl-key="[...ctrlKey, 'FlightParams']" />
  </div>
</template>
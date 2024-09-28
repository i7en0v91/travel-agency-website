<script setup lang="ts">
import { type FlightClass, type TripType, getI18nResName2, FlightMinPassengers } from '@golobe-demo/shared';
import { type ISearchListItem, type ISearchFlightOffersMainParams, type ISearchFlightOffersParams } from './../../../types';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import FieldFrame from './../../forms/field-frame.vue';
import SearchListInput from './../../forms/search-list-input.vue';
import DropdownList from './../../../components/forms/dropdown-list.vue';
import SearchFlightDatePicker from './search-flights-date-picker.vue';
import SearchFlightsParams from './search-flights-params.vue';
import { type ComponentInstance } from 'vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  takeInitialValuesFromUrlQuery?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  takeInitialValuesFromUrlQuery: false
});

const logger = getCommonServices().getLogger();

const fromCity = ref<ISearchListItem | undefined>();
const toCity = ref<ISearchListItem | undefined>();
const flightParams = ref<{ passengers: number, class: FlightClass } | undefined>();
const tripType = ref<TripType>('return');
const tripDates = ref<Date[]>([]);

const fromComponent = shallowRef<ComponentInstance<typeof SearchListInput>>();
const toComponent = shallowRef<ComponentInstance<typeof SearchListInput>>();
const tripTypeComponent = shallowRef<ComponentInstance<typeof DropdownList>>();

const searchOffersStoreAccessor = useSearchOffersStore();

defineExpose({
  getSearchParamsFromInputControls
});

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchFlightOffersMainParams>> | undefined;
if (props.takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', true, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  watch([fromCity, toCity, flightParams, tripType, tripDates], () => {
    logger.debug(`(SearchFlightOffers) search params watch handler, ctrlKey=${props.ctrlKey}`);
    const inputParams = getSearchParamsFromInputControls();
    $emit('change', inputParams);
  });
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', false, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(getSearchParamsFromInputControls);
  watch(displayedSearchParams, () => {
    logger.debug(`(SearchFlightOffers) search params change handler, ctrlKey=${props.ctrlKey}`);
    $emit('change', displayedSearchParams!.value);
  });
}

function getSearchParamsFromInputControls (): Partial<ISearchFlightOffersMainParams> {
  return {
    type: 'flights',
    fromCity: fromCity.value,
    toCity: toCity.value,
    tripType: tripType.value,
    dateFrom: (tripDates.value?.length ?? 0) > 0 ? tripDates.value[0] : undefined,
    dateTo: (tripDates.value?.length ?? 0) > 1 ? tripDates.value[1] : undefined,
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

function onDestinationChanged (isFrom: boolean, newValue?: ISearchListItem | undefined) {
  logger.verbose(`(SearchFlightOffers) destination changes, isFrom=${isFrom}, id=${newValue?.id ?? '[none]'}}, swapInProgress=${swapOperationInProgress}`);
  if (swapOperationInProgress) {
    return;
  }

  if (isFrom) {
    if (newValue?.id) {
      toComponent.value?.setExclusionIds([newValue.id]);
    } else {
      toComponent.value?.setExclusionIds([]);
    }
    if (autoFocusAllowed && newValue) { // newId not-null check not to jump out of empty input field
      toComponent.value?.setInputFocus();
    }
  } else {
     
    if (newValue) {
      fromComponent.value?.setExclusionIds([newValue.id]);
    } else {
      fromComponent.value?.setExclusionIds([]);
    }
  }
}

function onSwapButtonClick () {
  swapOperationInProgress = true;

  try {
    toComponent.value!.setExclusionIds([]);
    fromComponent.value!.setExclusionIds([]);

    const fromCityValue = fromComponent.value!.getValue();
    const toCityValue = toComponent.value!.getValue();

    const oldFromCityId = fromCityValue?.id;
    const oldToCityId = toCityValue?.id;

    fromComponent.value!.setValue(toCityValue);
    toComponent.value!.setValue(fromCityValue);

    setTimeout(() => {
      if (oldToCityId) {
        toComponent.value!.setExclusionIds([oldToCityId]);
      }
      if (oldFromCityId) {
        fromComponent.value!.setExclusionIds([oldFromCityId]);
      }
    }, 0);
  } finally {
    swapOperationInProgress = false;
  }
}

onMounted(() => {
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
            ref="fromComponent"
            v-model:selected-value="fromCity"
            :initially-selected-value="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.fromCity ?? null) : undefined"
            :ctrl-key="`${props.ctrlKey}-From`"
            :item-search-url="`/${ApiEndpointCitiesSearch}`"
            :persistent="true"
            type="destination"
            list-container-class="search-offers-dropdown-list-container"
            :placeholder-res-name="getI18nResName2('searchFlights', 'fromPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelFrom')"
            @update:selected-value="(value?: ISearchListItem | undefined) => { onDestinationChanged(true, value); }"
          />
          <span class="flights-geo-searchlists-sep">-</span>
          <SearchListInput
            ref="toComponent"
            v-model:selected-value="toCity"
            :initially-selected-value="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.toCity ?? null) : undefined"
            :ctrl-key="`${props.ctrlKey}-To`"
            :item-search-url="`/${ApiEndpointCitiesSearch}`"
            :persistent="true"
            type="destination"
            list-container-class="search-offers-dropdown-list-container"
            :placeholder-res-name="getI18nResName2('searchFlights', 'toPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelTo')"
            @update:selected-value="(value?: ISearchListItem | undefined) => { onDestinationChanged(false, value); }"
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
        ref="tripTypeComponent"
        v-model:selected-value="tripType"
        :initially-selected-value="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.tripType ?? null) : undefined"
        :ctrl-key="`${props.ctrlKey}-TripType`"
        class="search-flights-trip-type"
        :caption-res-name="getI18nResName2('searchFlights', 'tripCaption')"
        :persistent="true"
        default-value="oneway"
        list-container-class="search-offers-dropdown-list-container"
        :items="[ {value: 'oneway', resName: getI18nResName2('searchFlights', 'tripOneway')}, {value: 'return', resName: getI18nResName2('searchFlights', 'tripReturn')} ]"
      />
      <SearchFlightDatePicker v-model:selected-dates="tripDates" :initially-selected-dates="takeInitialValuesFromUrlQuery ? (displayedSearchParams ? (getInitiallySelectedDates(displayedSearchParams) ?? null) : null) : undefined" :ctrl-key="`${ctrlKey}-Dates`" :caption-res-name="tripType === 'oneway' ? (getI18nResName2('searchFlights', 'dateSingle')) : (getI18nResName2('searchFlights', 'dateRange'))" :mode="tripType === 'oneway' ? 'single' : 'range'" />
    </div>
    <SearchFlightsParams v-model:params="flightParams" :initially-selected-params="takeInitialValuesFromUrlQuery ? ( (displayedSearchParams?.class && displayedSearchParams?.numPassengers) ? { class: displayedSearchParams?.class ?? 'economy', passengers: displayedSearchParams?.numPassengers ?? FlightMinPassengers } : null) : undefined" class="search-flights-flightparams" :ctrl-key="`${ctrlKey}-FlightParams`" />
  </div>
</template>

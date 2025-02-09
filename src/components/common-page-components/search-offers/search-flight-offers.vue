<script setup lang="ts">
import { type EntityId, type FlightClass, type TripType, getI18nResName2, FlightMinPassengers } from '@golobe-demo/shared';
import type { ISearchListItem, ISearchFlightOffersMainParams, ISearchFlightOffersParams } from './../../../types';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import SearchListInput from './../../forms/search-list-input.vue';
import DropdownList from './../../../components/forms/dropdown-list.vue';
import SearchFlightDatePicker from './search-flights-date-picker.vue';
import SearchFlightsParams from './search-flights-params.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  takeInitialValuesFromUrlQuery?: boolean
}
const { ctrlKey, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

defineExpose({
  getSearchParamsFromInputControls
});

const logger = getCommonServices().getLogger();

const fromCity: Ref<ISearchListItem | null | undefined> = ref();
const toCity: Ref<ISearchListItem | null | undefined> = ref();
const tripType: Ref<TripType | null | undefined> = ref();
const tripDates: Ref<Date[] | null | undefined> = ref();
const flightParams: Ref<{ passengers: number, class: FlightClass } | null | undefined> = ref();

const searchOffersStoreAccessor = useSearchOffersStore();

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchFlightOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchFlightOffersMainParams>> | undefined;
if (takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', true, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  fromCity.value = displayedSearchParams.value.fromCity ?? null;
  toCity.value = displayedSearchParams.value.toCity ?? null;
  tripType.value = displayedSearchParams.value.tripType ?? null;
  tripDates.value = displayedSearchParams.value ? (getInitiallySelectedDates(displayedSearchParams.value) ?? null) : null;
  flightParams.value = (displayedSearchParams.value?.class && displayedSearchParams.value?.numPassengers) ? 
    { 
      class: displayedSearchParams.value?.class ?? 'economy', 
      passengers: displayedSearchParams.value?.numPassengers ?? FlightMinPassengers 
    } 
    : null;
  watch([fromCity, toCity, flightParams, tripType, tripDates], () => {
    logger.debug(`(SearchFlightOffers) search params watch handler, ctrlKey=${ctrlKey}`);
    const inputParams = getSearchParamsFromInputControls();
    $emit('change', inputParams);
  });
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', false, false);
  displayedSearchParams = computed<Partial<ISearchFlightOffersMainParams>>(getSearchParamsFromInputControls);
  watch(displayedSearchParams, () => {
    logger.debug(`(SearchFlightOffers) search params change handler, ctrlKey=${ctrlKey}`);
    $emit('change', displayedSearchParams!.value);
  });
}

const fromComponent = useTemplateRef('from-component');
const toComponent = useTemplateRef('to-component');

function getSearchParamsFromInputControls (): Partial<ISearchFlightOffersMainParams> {
  return {
    type: 'flights',
    fromCity: fromCity.value,
    toCity: toCity.value,
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

function onDestinationChanged (isFrom: boolean, newValue?: ISearchListItem | null | undefined) {
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
      setTimeout(() => {
        toComponent.value?.setInputFocus();
      }, 1);
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
  logger.verbose(`(SearchFlightOffers) starting swap city operation, fromCityId=${fromCity.value?.id}, toCityId=${toCity.value?.id}`);

  let oldFromCityId: EntityId | undefined;
  let oldToCityId: EntityId | undefined;

  swapOperationInProgress = true;
  try {
    toComponent.value!.setExclusionIds([]);
    fromComponent.value!.setExclusionIds([]);

    const fromCityValue = fromCity.value;
    const toCityValue = toCity.value;

    oldFromCityId = fromCityValue?.id;
    oldToCityId = toCityValue?.id;

    fromCity.value = toCityValue;
    toCity.value = fromCityValue;
  } finally {
    swapOperationInProgress = false;
  }
  
  swapOperationInProgress = true;
  setTimeout(() => {
    try {
      if (oldToCityId) {
        toComponent.value!.setExclusionIds([oldToCityId]);
      }
      if (oldFromCityId) {
        fromComponent.value!.setExclusionIds([oldFromCityId]);
      }
    } finally {
      logger.debug(`(SearchFlightOffers) swap city operation completed, fromCityId=${fromCity.value?.id}, toCityId=${toCity.value?.id}`);
      swapOperationInProgress = false;
    }   
  }, 0);
}

onMounted(() => {
  setTimeout(() => {
    autoFocusAllowed = true;
  }, 1000);
});

watch(fromCity, () => {
  onDestinationChanged(true, fromCity.value);
});

watch(toCity, () => {
  onDestinationChanged(false, toCity.value);
});

const $emit = defineEmits<{(event: 'change', params: Partial<ISearchFlightOffersMainParams>): void}>();

</script>

<template>
  <div class="flex flex-col flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6 xl:flex-row w-full">
    <InputFieldFrame class="flex-grow flex-shrink-[6] basis-auto w-full" :text-res-name="getI18nResName2('searchFlights', 'destinationCaption')">
      <div class="flex flex-row flex-nowrap w-full min-h-[3.25rem] max-h-[3.25rem] align-middle items-center gap-[6px] rounded ring-1 ring-inset ring-gray-500 dark:ring-gray-400 px-[16px]">
        <div class="flex flex-row flex-grow flex-shrink basis-auto flex-nowrap items-center justify-center gap-[6px] text-gray-500 dark:text-gray-400 font-medium">
          <SearchListInput
            ref="from-component"
            v-model:selected-value="fromCity"
            class="w-full min-h-[3.25rem] max-h-[3.25rem]"
            :ctrl-key="`${ctrlKey}-From`"
            :item-search-url="`/${ApiEndpointCitiesSearch}`"
            :persistent="true"
            type="destination"
            :placeholder-res-name="getI18nResName2('searchFlights', 'fromPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelFrom')"
          />
          <span class="text-gray-500 dark:text-gray-400">-</span>
          <SearchListInput
            ref="to-component"
            v-model:selected-value="toCity"
            class="w-full min-h-[3.25rem] max-h-[3.25rem]"
            :ctrl-key="`${ctrlKey}-To`"
            :item-search-url="`/${ApiEndpointCitiesSearch}`"
            :persistent="true"
            type="destination"
            :placeholder-res-name="getI18nResName2('searchFlights', 'toPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelTo')"
          />
        </div>
        <UButton size="xl" icon="ion-swap-horizontal" class="flex-initial p-0 max-h-[3.25rem]" variant="link" color="gray" :aria-label="$t(getI18nResName2('ariaLabels', 'ariaLabelSwap'))"  @click="onSwapButtonClick"/>        
      </div>
    </InputFieldFrame>
    <div class="flex flex-col sm:flex-row flex-nowrap flex-grow flex-shrink-[5] flex-basis-auto w-full gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6">
      <DropdownList
        v-model:selected-value="tripType"
        :ctrl-key="`${ctrlKey}-TripType`"
        class="search-flights-trip-type"
        :caption-res-name="getI18nResName2('searchFlights', 'tripCaption')"
        :persistent="true"
        default-value="oneway"
        :items="[ {value: 'oneway', resName: getI18nResName2('searchFlights', 'tripOneway')}, {value: 'return', resName: getI18nResName2('searchFlights', 'tripReturn')} ]"
        :ui="{ 
          wrapper: 'flex-grow flex-shrink-[3] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', 
          input: 'min-h-[3.25rem] max-h-[3.25rem] !pl-[16px] font-medium' 
        }"
      />
      <SearchFlightDatePicker v-model:selected-dates="tripDates" :ui="{ wrapper: 'flex-grow-[2] flex-shrink-[2] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="`${ctrlKey}-Dates`" :caption-res-name="tripType === 'oneway' ? (getI18nResName2('searchFlights', 'dateSingle')) : (getI18nResName2('searchFlights', 'dateRange'))" :mode="tripType === 'oneway' ? 'single' : 'range'" />
    </div>
    <SearchFlightsParams v-model:params="flightParams" :ui="{ wrapper: 'flex-grow flex-shrink-[6.5] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="`${ctrlKey}-FlightParams`" />
  </div>
</template>

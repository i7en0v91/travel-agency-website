<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type TripType, DefaultFlightTripType, type EntityId, getI18nResName2 } from '@golobe-demo/shared';
import FieldFrame from './../../forms/field-frame.vue';
import SearchListInput from './../../forms/search-list-input.vue';
import DropdownList from './../../../components/forms/dropdown-list.vue';
import SearchFlightDatePicker from './search-flights-date-picker.vue';
import SearchFlightsParams from './search-flights-params.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightOffers' });

const fromCityId = ref<EntityId | undefined>();
const toCityId = ref<EntityId | undefined>();
const tripType = ref<TripType>();
const fromExclusionIds = ref<EntityId[]>([]);
const toExclusionIds = ref<EntityId[]>([]);

let swapOperationInProgress = false;
let autoFocusAllowed = false;

const toComponent = useTemplateRef('to-component');

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
  }, { immediate: false });

  watch(toCityId, () => {
    onDestinationChanged(false, toCityId.value);
  }, { immediate: false });

  setTimeout(() => {
    autoFocusAllowed = true;
  }, 1000);
});

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
        :mode="tripType === 'return' ? 'range' : 'single'" 
        :ctrl-key="[...ctrlKey, 'Dates']" 
        :caption-res-name="tripType === 'return' ? (getI18nResName2('searchFlights', 'dateRange')) : (getI18nResName2('searchFlights', 'dateSingle'))" 
      />
    </div>
    <SearchFlightsParams class="search-flights-flightparams" :ctrl-key="[...ctrlKey, 'FlightParams']" />
  </div>
</template>
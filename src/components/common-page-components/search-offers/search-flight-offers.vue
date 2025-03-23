<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type TripType, type EntityId, getI18nResName2 } from '@golobe-demo/shared';
import InputFieldFrame from '../../forms/input-field-frame.vue';
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

const toComponent = useTemplateRef('to-component');

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
      setTimeout(() => {
        toComponent.value?.setInputFocus();
      }, 1);
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
  logger.verbose('starting swap city operation', { fromCityId: fromCityId.value, toCityId: toCityId.value });

  const oldFromCityId = fromCityId.value;
  const oldToCityId = toCityId.value;

  swapOperationInProgress = true;
  try {
    toExclusionIds.value = [];
    fromExclusionIds.value = [];

    toCityId.value = oldFromCityId;
    fromCityId.value = oldToCityId;
  } finally {
    swapOperationInProgress = false;
  }

  swapOperationInProgress = true;
  setTimeout(() => {
    if (oldToCityId) {
      toExclusionIds.value = [oldToCityId];
    }
    if (oldFromCityId) {
      fromExclusionIds.value = [oldFromCityId];
    }
    swapOperationInProgress = false;
  }, 0);
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
  <div class="flex flex-col flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6 xl:flex-row w-full">
    <InputFieldFrame class="flex-grow flex-shrink-[6] basis-auto w-full" :text-res-name="getI18nResName2('searchFlights', 'destinationCaption')">
      <div class="flex flex-row flex-nowrap w-full min-h-[3.25rem] max-h-[3.25rem] align-middle items-center gap-[6px] rounded ring-1 ring-inset ring-gray-500 dark:ring-gray-400 px-[16px]">
        <div class="flex flex-row flex-grow flex-shrink basis-auto flex-nowrap items-center justify-center gap-[6px] text-gray-500 dark:text-gray-400 font-medium">
          <SearchListInput
            ref="from-component"
            v-model:selected-value="fromCityId"
            :exclusion-ids="fromExclusionIds"
            type="City"
            class="w-full min-h-[3.25rem] max-h-[3.25rem]"
            :ctrl-key="[...ctrlKey, 'From', 'SearchList']"
            :placeholder-res-name="getI18nResName2('searchFlights', 'fromPlaceholder')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelFrom')"
          />
          <span class="text-gray-500 dark:text-gray-400">-</span>
          <SearchListInput
            ref="to-component"
            v-model:selected-value="toCityId"
            :exclusion-ids="toExclusionIds"
            type="City"
            class="w-full min-h-[3.25rem] max-h-[3.25rem]"
            :ctrl-key="[...ctrlKey, 'To', 'SearchList']"
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
        :ctrl-key="[...ctrlKey, 'TripType', 'Dropdown']"
        :caption-res-name="getI18nResName2('searchFlights', 'tripCaption')"
        :items="[ {value: 'oneway', resName: getI18nResName2('searchFlights', 'tripOneway')}, {value: 'return', resName: getI18nResName2('searchFlights', 'tripReturn')} ]"
        :ui="{ 
          wrapper: 'flex-grow flex-shrink-[3] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', 
          input: 'min-h-[3.25rem] max-h-[3.25rem] !pl-[16px] font-medium' 
        }"
      />
      <SearchFlightDatePicker 
        :mode="tripType === 'return' ? 'range' : 'single'"
        :ui="{ wrapper: 'flex-grow-[2] flex-shrink-[2] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" 
        :ctrl-key="[...ctrlKey, 'Dates']" 
        :caption-res-name="tripType === 'return' ? (getI18nResName2('searchFlights', 'dateRange')) : (getI18nResName2('searchFlights', 'dateSingle'))" 
      />
    </div>
    <SearchFlightsParams :ui="{ wrapper: 'flex-grow flex-shrink-[6.5] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="[...ctrlKey, 'FlightParams']" />
  </div>
</template>
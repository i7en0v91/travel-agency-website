<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { DefaultFlightClass, FlightMinPassengers, FlightMaxPassengers, type FlightClass, getI18nResName1, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import DropdownList from './../../forms/dropdown-list.vue';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { LocatorClasses } from '../../../helpers/constants';
import { useControlValuesStore } from './../../../stores/control-values-store';

interface IFlightParams {
  passengers: number,
  class: FlightClass
}

interface IProps {
  ctrlKey: ControlKey,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightsParams' });
const controlValuesStore = useControlValuesStore();
const { t } = useI18n();

const paramsModel = defineModel<IFlightParams | null | undefined>('params');
const selectedClass = ref<FlightClass>();
const selectedPassengers = ref<number>();
const hasMounted = ref(false);
const mainMenuOpen = ref(false);

const displayText = import.meta.client ? (
  controlValuesStore.acquireValuesView(
    (flightClassRef, numPassengersRef) => {
      const flightClass = flightClassRef.value as FlightClass | null;
      const numPassengers = numPassengersRef.value as number | null;

      const passengersText = (numPassengers != undefined) ? `${numPassengers} ${t(getI18nResName2('searchFlights', 'passenger'), numPassengers)}` : undefined;
      const flightClassResName = flightClass ? getI18nResName3('searchFlights', 'class', flightClass) : undefined;
      if(!passengersText || !flightClassResName) {
        return '';
      }

      const flightClassText = t(flightClassResName);
      return hasMounted.value ? `${passengersText}, ${flightClassText}` : '';
    }, 
    [...ctrlKey, 'FlightClass', 'Dropdown'], 
    [...ctrlKey, 'NumPassengers', 'Counter']
  )
) : computed(() => '');

onMounted(() => {
  watch([selectedClass, selectedPassengers], () => {
    logger.debug('class or passengers control value watcher', { ctrlKey, selectedClass: selectedClass.value, modelClass: paramsModel.value?.class, selectedNumPassengers: selectedPassengers.value, modelNumPassengers: paramsModel.value?.passengers });
    
    const classChanged = selectedClass.value != paramsModel.value?.class;
    const numPassengersChanged = selectedPassengers.value != paramsModel.value?.passengers;
    const changed = classChanged || numPassengersChanged;
    if(changed) {
      paramsModel.value = { 
        class: selectedClass.value ?? DefaultFlightClass,
        passengers: selectedPassengers.value ?? FlightMinPassengers
      };
    }
  }, { immediate: false });

  watch(paramsModel, () => {
    logger.debug('model value watcher', { ctrlKey, selectedClass: selectedClass.value, modelClass: paramsModel.value?.class, selectedNumPassengers: selectedPassengers.value, modelNumPassengers: paramsModel.value?.passengers });
    const classChanged = selectedClass.value != paramsModel.value?.class;
    const numPassengersChanged = selectedPassengers.value != paramsModel.value?.passengers;
    const changed = classChanged || numPassengersChanged;
    if(changed) {
      selectedClass.value = paramsModel.value?.class ?? DefaultFlightClass;
      selectedPassengers.value = paramsModel.value?.passengers ?? FlightMinPassengers;
    }
  }, { immediate: false });

  hasMounted.value = true;
});

defineShortcuts({
  'ESCAPE': () => mainMenuOpen.value = false
});

</script>

<template>
  <UPopover v-model:open="mainMenuOpen" :class="ui?.wrapper" :popper="{ placement: 'bottom' }">
    <InputFieldFrame class="w-full" :text-res-name="getI18nResName2('searchFlights', 'flightParamsCaption')">
      <UButton size="md" :class="`justify-between flex-row-reverse cursor-pointer dark:hover:bg-transparent w-full pl-[16px] ${ui?.input ?? ''}`" variant="outline" color="gray">
        <UIcon name="i-heroicons-chevron-right-20-solid" class="w-5 h-5 text-gray-400 dark:text-gray-500 rotate-90"/>
        <span :class="`overflow-hidden line-clamp-1 text-wrap text-start ${LocatorClasses.SearchOffersFlightParams}`">{{ displayText }}</span>
      </UButton>
    </InputFieldFrame>

    <template #panel="{ close }">
      <div class="w-full p-4">
        <DropdownList
          v-model:selected-value="selectedClass"
          :ctrl-key="[...ctrlKey, 'FlightClass', 'Dropdown']"
          :caption-res-name="getI18nResName2('searchFlights', 'fieldClass')"
          :items="[{
            value: 'economy',
            resName: getI18nResName3('searchFlights', 'class', 'economy')
          }, {
            value: 'comfort',
            resName: getI18nResName3('searchFlights', 'class', 'comfort')
          }, {
            value: 'business',
            resName: getI18nResName3('searchFlights', 'class', 'business')
          }]"
        />
        <SearchOffersCounter
          v-model:value="selectedPassengers"
          :ctrl-key="[...ctrlKey, 'NumPassengers', 'Counter']"
          :min-value="FlightMinPassengers"
          :max-value="FlightMaxPassengers"
          :label-res-name="getI18nResName2('searchFlights', 'fieldPassengers')"
          class="mt-16"
        />
        <UButton
          class="mt-6 w-full justify-center"
          size="md"
          color="primary"
          variant="solid"
          @click="close"
        >
          {{  $t(getI18nResName1('close')) }}
        </UButton>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { DefaultFlightClass, FlightMinPassengers, FlightMaxPassengers, type FlightClass, getI18nResName1, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import DropdownList from './../../forms/dropdown-list.vue';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { LocatorClasses } from '../../../helpers/constants';

interface IFlightParams {
  passengers: number,
  class: FlightClass
}

interface IProps {
  ctrlKey: string,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const props = defineProps<IProps>();

const modelRef = defineModel<IFlightParams | null | undefined>('params');
const hasMounted = ref(false);
const mainMenuOpen = ref(false);

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const passengerControlValueSetting = controlSettingsStore.getControlValueSetting<string>(`${props.ctrlKey}-NumPassengers`, FlightMinPassengers.toString(), true);
const classControlValueSetting = controlSettingsStore.getControlValueSetting<FlightClass>(`${props.ctrlKey}-FlightClass`, DefaultFlightClass, true);

const selectedClass = ref<FlightClass | null | undefined>();
const numPassengers = ref<number | null | undefined>();

const { t } = useI18n();

function saveInitialValuesToSettingsIfNotEmpty () {
  const initiallySelectedParams = modelRef.value;
  if (initiallySelectedParams) {
    passengerControlValueSetting.value = initiallySelectedParams.passengers.toString();
    classControlValueSetting.value = initiallySelectedParams.class;
  } else if (initiallySelectedParams === null) {
    passengerControlValueSetting.value = FlightMinPassengers.toString();
    classControlValueSetting.value = DefaultFlightClass;
  }
}

function readParamsFromSettings(): IFlightParams {
  logger.debug(`(SearchFlightsParams) parsing flight params from settings, ctrlKey=${props.ctrlKey}`);
  let numPassengers = FlightMinPassengers;
  if(passengerControlValueSetting.value?.length) {
    try {
      numPassengers = parseInt(passengerControlValueSetting.value);
      if(numPassengers === undefined || numPassengers === null) {
        logger.warn(`(SearchFlightsParams) parsing num passenger from settings resulted into empty number, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(passengerControlValueSetting.value)}]`);
        numPassengers = FlightMinPassengers;
      }
    } catch(err: any) {
      logger.warn(`(SearchFlightsParams) failed to parse num passenger from settings, ctrlKey=${props.ctrlKey}, value=[${JSON.stringify(passengerControlValueSetting.value)}]`, err);
    }    
  }
  const result = {
    passengers: numPassengers,
    class: classControlValueSetting.value ?? DefaultFlightClass
  };
  logger.debug(`(SearchFlightsParams) flight params parsed from settings, ctrlKey=${props.ctrlKey}, result=${JSON.stringify(result)}`);
  return result;
}

const displayText = computed(() => {
  if (!hasMounted.value) {
    return '';
  }

  const passengersText = `${numPassengers.value} ${t(getI18nResName2('searchFlights', 'passenger'), numPassengers.value!)}`;
  const flightClassResName = getI18nResName3('searchFlights', 'class', modelRef.value?.class ?? classControlValueSetting.value!);
  const flightClass = t(flightClassResName);

  return `${passengersText}, ${flightClass}`;
});

function updateParams (params: IFlightParams) {
  logger.verbose(`(SearchFlightsParams) updating params: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
  passengerControlValueSetting.value = (params.passengers ?? FlightMinPassengers).toString();
  classControlValueSetting.value = params.class ?? DefaultFlightClass;
  modelRef.value = params;
  logger.verbose(`(SearchFlightsParams) selected params updated: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
}

function onParamsChange () {
  updateParams({
    class: selectedClass.value ?? modelRef.value?.class ?? DefaultFlightClass,
    passengers: numPassengers.value ?? modelRef.value?.passengers ?? FlightMinPassengers
  });
}

onBeforeMount(() => {
  saveInitialValuesToSettingsIfNotEmpty();
  const flightParams = readParamsFromSettings();
  numPassengers.value = flightParams.passengers;
  selectedClass.value = flightParams.class;
  updateParams(flightParams);
});

onMounted(() => {
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
          :ctrl-key="`${ctrlKey}-FlightClass`"
          :caption-res-name="getI18nResName2('searchFlights', 'fieldClass')"
          :persistent="false"
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
          @update:selected-value="onParamsChange"
        />
        <SearchOffersCounter
          v-model:value="numPassengers"
          :ctrl-key="`${props.ctrlKey}-NumPassengers`"
          :min-value="FlightMinPassengers"
          :max-value="FlightMaxPassengers"
          :defaul-value="FlightMinPassengers"
          :label-res-name="getI18nResName2('searchFlights', 'fieldPassengers')"
          class="mt-16"
          @update:value="onParamsChange"
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

<script setup lang="ts">
import { Dropdown } from 'floating-vue';
import DropdownList from './../../forms/dropdown-list.vue';
import { updateTabIndices } from './../../../shared/dom';
import FieldFrame from './../../forms/field-frame.vue';
import { getI18nResName1, getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import { type FlightClass } from './../../../shared/interfaces';
import SimpleButton from './../../forms/simple-button.vue';
import { FlightMinPassengers, FlightMaxPassengers, TabIndicesUpdateDefaultTimeout, DefaultFlightClass } from './../../../shared/constants';
import SearchOffersCounter from './search-offers-counter.vue';

interface IFlightParams {
  passengers: number,
  class: FlightClass
}

interface IProps {
  ctrlKey: string,
  params?: IFlightParams | undefined,
  initiallySelectedParams?: IFlightParams | null | undefined
}

const props = withDefaults(defineProps<IProps>(), {
  params: undefined,
  initiallySelectedParams: undefined
});

const FlightClassDropdownClass = 'search-offers-dropdown-list-container';

const elBtn = ref<HTMLElement>();
const elDropdownContainer = ref<HTMLElement>();
const dropdown = ref<InstanceType<typeof Dropdown>>();
const hasMounted = ref(false);

const logger = CommonServicesLocator.getLogger();

const controlSettingsStore = useControlSettingsStore();
const passengerControlValueSetting = controlSettingsStore.getControlValueSetting<number>(`${props.ctrlKey}-NumPassengers`, FlightMinPassengers, true);
const classControlValueSetting = controlSettingsStore.getControlValueSetting<FlightClass>(`${props.ctrlKey}-FlightClass`, DefaultFlightClass, true);
if (props.initiallySelectedParams) {
  passengerControlValueSetting.value = props.initiallySelectedParams.passengers;
  classControlValueSetting.value = props.initiallySelectedParams.class;
} else if (props.initiallySelectedParams === null) {
  passengerControlValueSetting.value = FlightMinPassengers;
  classControlValueSetting.value = DefaultFlightClass;
}

const selectedClass = ref<FlightClass | undefined>();
const numPassengers = ref<number | undefined>();

const { t } = useI18n();

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

const displayText = computed(() => {
  if (!hasMounted.value) {
    return '';
  }

  const passengersText = `${numPassengers.value} ${t(getI18nResName2('searchFlights', 'passenger'), numPassengers.value!)}`;
  const flightClassResName = getI18nResName3('searchFlights', 'class', props.params?.class ?? classControlValueSetting.value!);
  const flightClass = t(flightClassResName);

  return `${passengersText}, ${flightClass}`;
});

const $emit = defineEmits<{(event: 'update:params', params?: IFlightParams | undefined): void}>();

function updateParams (params: IFlightParams) {
  logger.verbose(`(SearchFlightsParams) updating params: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
  passengerControlValueSetting.value = params?.passengers ?? FlightMinPassengers;
  classControlValueSetting.value = params?.class ?? DefaultFlightClass;
  $emit('update:params', params);
  logger.verbose(`(SearchFlightsParams) selected params updated: ctrlKey=${props.ctrlKey}, params=${JSON.stringify(params)}`);
}

function onParamsChange () {
  updateParams({
    class: selectedClass.value ?? props.params?.class ?? DefaultFlightClass,
    passengers: numPassengers.value ?? props.params?.passengers ?? FlightMinPassengers
  });
}

function isDropdownShown () {
  return (dropdown.value?.$el.className as string).includes('v-popper--shown');
}

function handleDocumentEvent (evt: Event) {
  if (!isDropdownShown()) {
    return;
  }

  let isInsideDropdown = false;
  let isInsideFlightClassDropdown = false;
  evt.composedPath().forEach((e: EventTarget) => {
    if (e === elDropdownContainer.value) {
      isInsideDropdown = true;
    }
    if ((e instanceof HTMLElement) && (e as any).className.includes(FlightClassDropdownClass)) {
      isInsideFlightClassDropdown = true;
    }
  });
  if (!isInsideDropdown && !isInsideFlightClassDropdown) {
    hideDropdown();
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentEvent);

  hasMounted.value = true;
  numPassengers.value = passengerControlValueSetting.value!;
  selectedClass.value = classControlValueSetting.value!;

  updateParams({
    passengers: numPassengers.value,
    class: selectedClass.value
  });
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentEvent);
});

function onEscape () {
  hideDropdown();
}

</script>

<template>
  <div class="search-flights-params">
    <VDropdown
      ref="dropdown"
      :distance="-6"
      :hide-triggers="[(triggers: any) => [...triggers, 'click']]"
      :auto-hide="false"
      :prevent-overflow="false"
      placement="bottom-end"
      :flip="false"
      :boundary="elBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
      @keyup.escape="onEscape"
    >
      <FieldFrame :text-res-name="getI18nResName2('searchFlights', 'flightParamsCaption')" class="dropdown-list-field-frame">
        <button
          :id="`flight-params-${ctrlKey}`"
          ref="elBtn"
          class="brdr-1"
          type="button"
        >
          {{ displayText }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <div ref="elDropdownContainer" class="search-offers-dropdown-list-container flight-params-controls p-xs-2 p-s-3" :data-popper-anchor="`flight-params-${props.ctrlKey}`">
            <SearchOffersCounter
              v-model:value="numPassengers"
              :ctrl-key="`${props.ctrlKey}-NumPassengers`"
              :default-value="FlightMinPassengers"
              :min-value="FlightMinPassengers"
              :max-value="FlightMaxPassengers"
              :label-res-name="getI18nResName2('searchFlights', 'fieldPassengers')"
              @update:value="onParamsChange"
            />
            <DropdownList
              v-model:selected-value="selectedClass"
              :ctrl-key="`${ctrlKey}-FlightClass`"
              :caption-res-name="getI18nResName2('searchFlights', 'fieldClass')"
              :persistent="false"
              class="flight-params-class mt-xs-4"
              :list-container-class="FlightClassDropdownClass"
              :default-value="classControlValueSetting.value ?? DefaultFlightClass"
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
            <SimpleButton
              class="mr-xs-2 mt-xs-4 flight-params-close-dropdown-btn"
              :ctrl-key="`${ctrlKey}-FlightPrmsClose`"
              kind="accent"
              :label-res-name="getI18nResName1('close')"
              @click="hideDropdown"
            />
          </div>
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

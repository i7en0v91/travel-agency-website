<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { DefaultFlightClass, FlightMinPassengers, FlightMaxPassengers, type FlightClass, getI18nResName1, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import DropdownList from './../../forms/dropdown-list.vue';
import FieldFrame from './../../forms/field-frame.vue';
import SimpleButton from './../../forms/simple-button.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey
}

const { ctrlKey } = defineProps<IProps>();

const FlightClassDropdownClass = 'search-offers-dropdown-list-container';

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightsParams' });
const controlValuesStore = useControlValuesStore();
const { t } = useI18n();

interface IFlightParams {
  passengers: number,
  class: FlightClass
}
const paramsModel = defineModel<IFlightParams | null | undefined>('params');
const selectedClass = ref<FlightClass>();
const selectedPassengers = ref<number>();

const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdownContainer = useTemplateRef<HTMLElement>('dropdown-container');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const hasMounted = ref(false);

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

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

function onEscape () {
  hideDropdown();
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
    if (e === dropdownContainer.value) {
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

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentEvent);
});


</script>

<template>
  <div class="search-flights-params">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: -1 }"
      :ctrl-key="[...ctrlKey, 'Wrapper']"
      :aria-id="`${toShortForm(ctrlKey)}-DropDownWrapper`"
      :distance="-6"
      :hide-triggers="[(triggers: any) => [...triggers, 'click']]"
      :auto-hide="false"
      :prevent-overflow="false"
      placement="bottom-end"
      :flip="false"
      :boundary="openBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
      @keyup.escape="onEscape"
    >
      <FieldFrame :text-res-name="getI18nResName2('searchFlights', 'flightParamsCaption')" class="dropdown-list-field-frame">
        <button
          :id="`flight-params-${toShortForm(ctrlKey)}`"
          ref="open-btn"
          class="brdr-1"
          type="button"
        >
          {{ displayText }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <div ref="dropdown-container" class="search-offers-dropdown-list-container flight-params-controls p-xs-2 p-s-3" :data-popper-anchor="`flight-params-${toShortForm(ctrlKey)}`">
            <SearchOffersCounter
              v-model:value="selectedPassengers"
              :ctrl-key="[...ctrlKey, 'NumPassengers', 'Counter']"
              :default-value="FlightMinPassengers"
              :min-value="FlightMinPassengers"
              :max-value="FlightMaxPassengers"
              :label-res-name="getI18nResName2('searchFlights', 'fieldPassengers')"
            />
            <DropdownList
              v-model:selected-value="selectedClass"
              :ctrl-key="[...ctrlKey, 'FlightClass', 'Dropdown']"
              :caption-res-name="getI18nResName2('searchFlights', 'fieldClass')"
              class="flight-params-class mt-xs-4"
              :list-container-class="FlightClassDropdownClass"
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
            <SimpleButton
              class="mr-xs-2 mt-xs-4 flight-params-close-dropdown-btn"
              :ctrl-key="[...ctrlKey, 'Btn', 'Close']"
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

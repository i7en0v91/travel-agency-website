<script setup lang="ts">
import { computeNarrowedRange, type ControlKey } from './../../../../helpers/components';
import { getI18nResName3, convertTimeOfDay } from '@golobe-demo/shared';
import type { ISearchOffersRangeFilterProps, SearchOffersFilterRange } from './../../../../types';
import Slider from '@vueform/slider';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';
import isString from 'lodash-es/isString';
import isArray from 'lodash-es/isArray';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersRangeFilterProps
}

const { ctrlKey, filterParams } = defineProps<IProps>();

const DiffValuesEpsilon = 0.01;

const logger = getCommonServices().getLogger().addContextProps({ component: 'RangeFilter', filterId: filterParams.filterId });
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<{ min: number, max: number } | undefined>('modelValue');
const editValue = ref([
  modelValue.value?.min ?? filterParams.valueRange.min, 
  modelValue.value?.max  ?? filterParams.valueRange.max
]);

const leftHandlePos = ref<number>(0.0);
const rightHandlePos = ref<number>(1.0);

const { d, t } = useI18n();

function updateModelValue (value: { min: number, max: number }) {
  logger.debug('updating model value', { ctrlKey, value });
  modelValue.value = value;
}

function onSliderValueChanged (value: number[]) {
  logger.debug('slider value changed', ctrlKey);
  if (value?.length === 2) {
    updateModelValue({ min: value[0], max: value[1] });
  }
}

function onSliderValueUpdated (value: number[]) {
  logger.debug('slider value updated', ctrlKey);
  if (value && (value.length ?? 0) === 2) {
    updateHandleTooltipPositions(value[0], value[1]);
  } else {
    updateHandleTooltipPositions(filterParams.valueRange.min, filterParams.valueRange.max);
  }
}

function updateHandleTooltipPositions (fromValue: number, toValue: number) {
  logger.debug('updating handle tooltip positions', { ctrlKey, from: fromValue, to: toValue });
  const minValue = filterParams.valueRange.min;
  const maxValue = filterParams.valueRange.max;

  if (Math.abs(maxValue - minValue) < 0.1) {
    leftHandlePos.value = 0.0;
    rightHandlePos.value = 1.0;
    return;
  }

  leftHandlePos.value = Math.min(1.0, Math.max(0.0, (fromValue - minValue) / (maxValue - minValue)));
  rightHandlePos.value = Math.min(1.0, Math.max(0.0, (toValue - minValue) / (maxValue - minValue)));
}

function onHandleSlide (value: number[]) {
  if (value && (value.length ?? 0) === 2) {
    updateHandleTooltipPositions(value[0], value[1]);
  } else {
    updateHandleTooltipPositions(filterParams.valueRange.min, filterParams.valueRange.max);
  }
}

function getValueForTimeOfDayFormatting (timeOfDayMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(timeOfDayMinutes);
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

function tooltipTextFormatter (value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  let numericValue: number | undefined;
  if (isNumber(value)) {
    numericValue = value as number;
  } else if (isString(value)) {
    numericValue = parseInt(value as string);
  }
  if (numericValue === null || numericValue === undefined) {
    return value;
  }

  if (filterParams.limitLabelFormatter === 'price') {
    return `$${(Math.floor(numericValue!))}`;
  } else if (filterParams.limitLabelFormatter === 'daytime') {
    return d(getValueForTimeOfDayFormatting(numericValue), 'daytime');
  } else {
    return value.toString();
  }
}

function areRangesEqual(
  range1: SearchOffersFilterRange | number[], 
  range2: SearchOffersFilterRange | number[]
): boolean {
  return Math.abs((isArray(range1) ? range1[0] : range1.min) - (isArray(range2) ? range2[0] : range2.min)) < DiffValuesEpsilon 
    && Math.abs((isArray(range1) ? range1[1] : range1.max) - (isArray(range2) ? range2[1] : range2.max)) < DiffValuesEpsilon;
}

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<SearchOffersFilterRange | undefined>(ctrlKey, {
    initialOverwrite: undefined,
    defaultValue: undefined,
    persistent: false
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue = (storeValueRef.value as SearchOffersFilterRange) ?? undefined;
    const changed = (!!storeValueRef.value !== !!modelValue.value) || 
      (storeValueRef.value && !areRangesEqual(storeValueRef.value, modelValue.value!));
    if(changed) {
      logger.verbose('updating model value by store value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      modelValue.value = newValue;  
    }
  }, { immediate: true });

  watch(modelValue, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });

    const value = modelValue.value;
    if(!value) {
      logger.verbose('updating store value by model value change (to empty)', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      storeValueRef.value = undefined;
      editValue.value[0] = filterParams.valueRange.min;
      editValue.value[1] = filterParams.valueRange.max;
      return;
    }

    if (!areRangesEqual(value, editValue.value)) {
      logger.verbose('updating edit values by model value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      editValue.value[0] = value.min;
      editValue.value[1] = value.max;
    }

    const changed = (!!storeValueRef.value !== !!modelValue.value) || 
      (modelValue.value && !areRangesEqual(modelValue.value, storeValueRef.value!));
    if(changed) {
      logger.verbose('updating store value by model value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      storeValueRef.value = modelValue.value;
    }
  }, { immediate: true });

  watch(() => filterParams, () => { 
    logger.debug('filter params watcher', { ctrlKey, modelValue: modelValue.value, filterParams });
    if(modelValue.value) {
      const narrowedValue = computeNarrowedRange(modelValue.value, filterParams.valueRange, filterParams.valueRange);
      if(!areRangesEqual(narrowedValue, modelValue.value)) {
        logger.verbose('model value adjusted by filter limits', { ctrlKey, currentValue: modelValue.value, filterParams, narrowedValue });
        modelValue.value = narrowedValue;
      }
    }
  }, { immediate: false });
});

</script>

<template>
  <div class="range-filter">
    <Slider
      v-model:value="editValue"
      class="slider-control"
      :min="filterParams.valueRange.min"
      :max="filterParams.valueRange.max"
      :format="tooltipTextFormatter"
      :tooltips="true"
      :aria="{
        'aria-label': t(getI18nResName3('ariaLabels', 'ariaLabelRangeHandler'))
      }"
      :style="{
        '--glb-slider-left-handle-pos': leftHandlePos.toFixed(4),
        '--glb-slider-right-handle-pos': rightHandlePos.toFixed(4)
      }"
      @change="onSliderValueChanged"
      @slide="onHandleSlide"
      @update="onSliderValueUpdated"
    />
    <div class="slider-trackline" />
    <div v-if="filterParams.limitLabelFormatter === 'price'" class="range-limits mt-xs-2">
      <span>{{ $n(Math.floor(filterParams.valueRange.min), 'currency') }}</span>
      <span>{{ $n(Math.floor(filterParams.valueRange.max), 'currency') }}</span>
    </div>
    <div v-else-if="filterParams.limitLabelFormatter === 'daytime'" class="range-limits mt-xs-2">
      <span>{{ $d(getValueForTimeOfDayFormatting(filterParams.valueRange.min), 'daytime') }}</span>
      <span>{{ $d(getValueForTimeOfDayFormatting(filterParams.valueRange.max), 'daytime') }}</span>
    </div>
  </div>
</template>

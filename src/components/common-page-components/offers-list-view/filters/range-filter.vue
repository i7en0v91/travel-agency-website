<script setup lang="ts">

import Slider from '@vueform/slider';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';
import isString from 'lodash-es/isString';
import { convertTimeOfDay } from './../../../../shared/common';
import { type ISearchOffersRangeFilterProps } from './../../../../shared/interfaces';
import { getI18nResName3 } from './../../../../shared/i18n';

interface IProps {
  ctrlKey: string,
  filterParams: ISearchOffersRangeFilterProps,
  value: { min: number, max: number }
}

const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const editValue = ref([props.value.min, props.value.max]);
watch(() => props.value, () => {
  logger.debug(`(RangeFilter) received value update, ctrlKey=${props.ctrlKey}, new value min=${props.value.min}, new value max=${props.value.max}, current value min=${editValue.value[0]}, current value max=${editValue.value[1]}`);
  if (Math.abs(props.value.min - editValue.value[0]) > 0.01 || Math.abs(props.value.max - editValue.value[1]) > 0.01) {
    editValue.value[0] = props.value.min;
    editValue.value[1] = props.value.max;
  }
});

const leftHandlePos = ref<number>(0.0);
const rightHandlePos = ref<number>(1.0);

const { d, t } = useI18n();

const $emit = defineEmits<{(event: 'update:value', value: { min: number, max: number }): void}>();

function fireValueChangeEvent (value: { min: number, max: number }) {
  logger.verbose(`(RangeFilter) firing value change event, ctrlKey=${props.ctrlKey}, value min=${value.min}, value max=${value.max}`);
  $emit('update:value', value);
}

function onSliderValueChanged (value: number[]) {
  logger.debug(`(RangeFilter) slider value changed, ctrlKey=${props.ctrlKey}`);
  if (value?.length === 2) {
    fireValueChangeEvent({ min: value[0], max: value[1] });
  }
}

function onSliderValueUpdated (value: number[]) {
  logger.debug(`(RangeFilter) slider value updated, ctrlKey=${props.ctrlKey}`);
  if (value && (value.length ?? 0) === 2) {
    updateHandleTooltipPositions(value[0], value[1]);
  } else {
    updateHandleTooltipPositions(props.filterParams.valueRange.min, props.filterParams.valueRange.max);
  }
}

function updateHandleTooltipPositions (fromValue: number, toValue: number) {
  logger.debug(`(RangeFilter) updating handle tooltip positions, ctrlKey=${props.ctrlKey}, from=${fromValue}, to=${toValue}`);
  const minValue = props.filterParams.valueRange.min;
  const maxValue = props.filterParams.valueRange.max;

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
    updateHandleTooltipPositions(props.filterParams.valueRange.min, props.filterParams.valueRange.max);
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

  if (props.filterParams.limitLabelFormatter === 'price') {
    return `$${(Math.floor(numericValue!))}`;
  } else if (props.filterParams.limitLabelFormatter === 'daytime') {
    return d(getValueForTimeOfDayFormatting(numericValue), 'daytime');
  } else {
    return value.toString();
  }
}

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

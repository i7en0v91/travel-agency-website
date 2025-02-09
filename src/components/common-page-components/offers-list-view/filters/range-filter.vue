<script setup lang="ts">
import { getI18nResName3, convertTimeOfDay } from '@golobe-demo/shared';
import type { ISearchOffersRangeFilterProps } from './../../../../types';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';
import isString from 'lodash-es/isString';
import { getCommonServices } from '../../../../helpers/service-accessors';
import type { URange } from './../../../../.nuxt/components';

interface IProps {
  ctrlKey: string,
  filterParams: ISearchOffersRangeFilterProps
}

const { ctrlKey, filterParams } = defineProps<IProps>();
const modelValue = defineModel<{ min: number, max: number }>('value', { required: true });  

const editValue = ref<number>(modelValue.value.min);
const rangeRef = useTemplateRef('range');
const logger = getCommonServices().getLogger();

const { d } = useI18n();

function fireValueChangeEvent (value: number) {
  logger.debug(`(RangeFilter) firing value change event, ctrlKey=${ctrlKey}, value=${value}`);
  modelValue.value = { min: value, max: filterParams.valueRange.max };
  editValue.value = value;
}

function onMeterValueChanged (value: number) {
  logger.debug(`(RangeFilter) range value changed, ctrlKey=${ctrlKey}`);
  fireValueChangeEvent(isNumber(value) ? value : parseInt(value));
}

function getValueForTimeOfDayFormatting (timeOfDayMinutes: number): Date {
  const timeOfDay = convertTimeOfDay(timeOfDayMinutes);
  return dayjs().local().set('hour', timeOfDay.hour24).set('minute', timeOfDay.minutes).toDate();
}

function indicatorTextFormatter (value: any): string {
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

onMounted(() => {
  watch(modelValue, () => {
    logger.debug(`(RangeFilter) model value update callback, ctrlKey=${ctrlKey}, new model value=${JSON.stringify(modelValue.value)}, edit value=${editValue.value}`);
    if(modelValue.value.min !== editValue.value) {
      editValue.value = modelValue.value.min;
    }
  }, { immediate: false });
});


</script>

<template>
  <div class="w-full h-auto px-3">
    <div 
      v-if="rangeRef" 
      class="mb-2"
      :style="{ 
        marginLeft: rangeRef?.progressStyle.width ?? 0
      }">
      <UBadge 
        :ui="{ 
          base: 'text-center',
          rounded: 'rounded-lg' 
        }"
        :style="{ 
          transform: !!rangeRef ? `translateX(-${rangeRef!.progressStyle.width})` : undefined
        }"
        size="xs"
      >
        <span class="text-nowrap">{{ $t(getI18nResName3('searchOffers', 'filters', 'from')) }} {{ indicatorTextFormatter(editValue) }}</span>
      </UBadge>
    </div>
    
    <URange 
      ref="range"
      v-model:model-value="editValue"
      :min="filterParams.valueRange.min"
      :max="filterParams.valueRange.max"
      @change="onMeterValueChanged"/>

    <div class="w-full h-auto flex flex-row flex-nowrap justify-between mt-2">
      <div v-if="filterParams.limitLabelFormatter === 'price'" class="contents *:text-nowrap">
        <span>{{ $n(Math.floor(filterParams.valueRange.min), 'currency') }}</span>
        <span class="justify-self-end">{{ $n(Math.floor(filterParams.valueRange.max), 'currency') }}</span>
      </div>
      <div v-else-if="filterParams.limitLabelFormatter === 'daytime'" class="contents *:text-nowrap">
        <span>{{ $d(getValueForTimeOfDayFormatting(filterParams.valueRange.min), 'daytime') }}</span>
        <span class="justify-self-end">{{ $d(getValueForTimeOfDayFormatting(filterParams.valueRange.max), 'daytime') }}</span>
      </div>
    </div>
  </div>
</template>
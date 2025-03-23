<script setup lang="ts">
import { computeNarrowedRange, type ControlKey } from './../../../../helpers/components';
import { getI18nResName3, convertTimeOfDay } from '@golobe-demo/shared';
import type { ISearchOffersRangeFilterProps, SearchOffersFilterRange } from './../../../../types';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';
import isString from 'lodash-es/isString';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersRangeFilterProps
}

const { ctrlKey, filterParams } = defineProps<IProps>();

const DiffValuesEpsilon = 0.01;

const logger = getCommonServices().getLogger().addContextProps({ component: 'RangeFilter', filterId: filterParams.filterId });
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<{ min: number, max: number } | undefined>('value');  

const editValue = ref<number>(modelValue.value?.min ?? filterParams.valueRange.min);
const rangeRef = useTemplateRef('range');

const { d } = useI18n();

function updateModelValue (value: number) {
  logger.debug('updating model value', { ctrlKey, value });
  modelValue.value = { min: value, max: filterParams.valueRange.max };
}

function onMeterValueChanged (value: number) {
  logger.debug('range value changed', ctrlKey);
  updateModelValue(isNumber(value) ? value : parseInt(value));
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

function areValuesEqual(value1: number, value2: number): boolean {
  return Math.abs(value1 - value2) < DiffValuesEpsilon;
}

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<SearchOffersFilterRange | undefined>(ctrlKey, {
    persistent: false
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue = (storeValueRef.value as SearchOffersFilterRange) ?? undefined;
    const changed = (!!storeValueRef.value !== !!modelValue.value) || 
      (storeValueRef.value && !areValuesEqual(storeValueRef.value.min, modelValue.value!.min));
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
      editValue.value = filterParams.valueRange.min;
      return;
    }

    if (!areValuesEqual(value.min, editValue.value)) {
      logger.verbose('updating edit values by model value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      editValue.value = value.min;
    }

    const changed = (!!storeValueRef.value !== !!modelValue.value) || 
      (modelValue.value && !areValuesEqual(modelValue.value.min, storeValueRef.value!.min));
    if(changed) {
      logger.verbose('updating store value by model value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value, editValue: editValue.value });
      storeValueRef.value = modelValue.value;
    }
  }, { immediate: true });

  watch(() => filterParams, () => { 
    logger.debug('filter params watcher', { ctrlKey, modelValue: modelValue.value, filterParams });
    if(modelValue.value) {
      const narrowedValue = computeNarrowedRange(modelValue.value, filterParams.valueRange, filterParams.valueRange);
      if(!areValuesEqual(narrowedValue.min, modelValue.value.min)) {
        logger.verbose('model value adjusted by filter limits', { ctrlKey, currentValue: modelValue.value, filterParams, narrowedValue });
        modelValue.value = narrowedValue;
      }
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
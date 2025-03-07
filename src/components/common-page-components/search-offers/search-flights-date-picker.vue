<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { eraseTimeOfDay, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import dayjs from 'dayjs';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import './../../../node_modules/v-calendar/dist/style.css';
import { useDeviceSize } from '../../../composables/device-size';
import { DeviceSizeEnum } from '../../../helpers/constants';
import isArray from 'lodash-es/isArray';
import { useControlValuesStore } from './../../../stores/control-values-store';
import { DatePicker as VCalendarDatePicker } from 'v-calendar';

interface IProps {
  ctrlKey: ControlKey,
  captionResName: I18nResName,
  mode: 'single' | 'range',
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { ctrlKey, mode } = defineProps<IProps>();


const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightsDatePicker' });
const controlValuesStore = useControlValuesStore();

const { d, locale } = useI18n();
const { current: deviceSize } = useDeviceSize();

const Today = eraseTimeOfDay(dayjs().utc(true).toDate());

const modelValue = defineModel<Date[] | null | undefined>('selectedDates');
const rangeValue = ref<{ start: Date, end: Date }>();
const singleValue = ref<Date>();
const open = ref(false);

function toUnary<T>(value: T | T[]): T | undefined {
  if(value && isArray(value)) {
    return value.length ? value[0] : undefined;
  }
  return value;
}

function toArray<T>(value: T | T[] | null): T[] | null {
  if(!value) {
    return null;
  }
  if(isArray(value)) {
    return value;
  }
  return [value];
}

function datesArrayEquals(arr1: Date[], arr2: Date[]) {
  return arr1.length === arr2.length && arr1.every((v, idx) => v === arr2[idx]);
}

function storeModelValuesDiffer(
  storeValue: Date | Date[] | null, 
  modelValue: Date[] | null | undefined, mode: 'single' | 'range'
) {
  return mode === 'single' ? 
    (storeValue != ((modelValue?.length ?? 0) > 0 ? modelValue![0] : null)) :
    (!datesArrayEquals(storeValue as Date[], (modelValue?.length ?? 0) > 0 ? (modelValue as Date[]) : [])
  );
}

const datesDisplayText = computed(() => {
  if(import.meta.server) {
    return '';
  }

  const displayFormat = 'numeric';
  return mode === 'single' ? 
    (singleValue.value ? d(singleValue.value, displayFormat) : '') : 
    (rangeValue.value ? `${d(rangeValue.value.start, displayFormat)} - ${d(rangeValue.value.end, displayFormat)}` : '');
});

const numColumnsForDevice = computed(() => 
  (deviceSize.value === DeviceSizeEnum.XS) || 
  (deviceSize.value === DeviceSizeEnum.SM) || 
  (deviceSize.value === DeviceSizeEnum.MD) ? 1 : 2
);

const calendarAttrs = computed(() => {
  return {
    transparent: true,
    borderless: false,
    color: 'primary',
    minDate: Today,
    locale: locale.value,
    'is-dark': { selector: 'html', darkClass: 'dark' },
    timezone: 'utc',
    mode: 'date'
  };
});

defineShortcuts({
  'ESCAPE': () => open.value = false
});

onMounted(() => {
  const singleInitialOverwrite = modelValue.value?.length ? modelValue.value[0] : undefined;
  logger.debug('acquiring value ref for single date', { ctrlKey, initialOverwrite: singleInitialOverwrite });
  const { valueRef: singleStoreValueRef } = controlValuesStore.acquireValueRef<Date | null>(
    [...ctrlKey, 'DatePicker'], {
      initialOverwrite: singleInitialOverwrite
    });
    
  const rangeInitialOverwrite = ((modelValue.value?.length ?? 0) >= 2) ? modelValue.value : undefined;
  logger.debug('acquiring value ref for range dates', { ctrlKey, initialOverwrite: rangeInitialOverwrite });
  const { valueRef: rangeStoreValueRef } = controlValuesStore.acquireValueRef<Date[] | null>(
    [...ctrlKey, 'DateRangePicker'], {
      initialOverwrite: rangeInitialOverwrite
    });

  watch([singleStoreValueRef, rangeStoreValueRef], () => {
    const storeValue = (mode === 'single' ? singleStoreValueRef : rangeStoreValueRef).value;
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue, mode });
    const newValue = mode === 'single' ? storeValue : (storeValue ?? []);
    const changed = storeModelValuesDiffer(newValue, modelValue.value, mode);
    if(changed) {
      modelValue.value = newValue ? (isArray(newValue) ? newValue : [newValue]) : null;  
    }
  }, { immediate: true });

  watch([singleValue, rangeValue], () => {
    const newValue = mode === 'single' ? 
      (singleValue.value ? [singleValue.value] : null) : 
      (rangeValue.value ? [rangeValue.value!.start, rangeValue.value!.end] : null);
    const storeValue = (mode === 'single' ? singleStoreValueRef : rangeStoreValueRef).value;
    logger.debug('selected calendar value watcher', { ctrlKey, newValue, storeValue, mode });
    
    const changed = storeModelValuesDiffer(storeValue, newValue, mode);
    if(changed) {
      switch(mode) {
        case 'single':
          singleStoreValueRef.value = toUnary(singleValue.value) ?? null;
          break;
        default:
          rangeStoreValueRef.value = newValue;
      }
    }
  }, { immediate: false });

  watch(modelValue, () => {
    const storeValue = (mode === 'single' ? singleStoreValueRef : rangeStoreValueRef).value;
    const outOfSyncUpdate = modelValue.value && (mode === 'single') !== (modelValue.value.length === 1);
    if(outOfSyncUpdate) {
      logger.debug('model value update for another mode', { ctrlKey, modelValue: modelValue.value, storeValue, mode });
      return;
    }
    
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue, mode });
    const changed = storeModelValuesDiffer(storeValue, modelValue.value, mode);
    switch(mode) {
      case 'single':
        singleValue.value = modelValue.value ? 
          (isArray(modelValue.value) ? modelValue.value[0] : modelValue.value) : undefined;
        if(changed) {
          singleStoreValueRef.value = toUnary(modelValue.value ?? null) as Date | null;
        }
        break;
      default:
        rangeValue.value = modelValue.value ? { start: modelValue.value[0], end: modelValue.value[1] } : undefined;
        if(changed) {
          rangeStoreValueRef.value = modelValue.value ?? null;
        }
    }
  }, { immediate: false });

  watch(() => mode, () => {
    logger.verbose('mode changed, actualizing model value', { ctrlKey, mode });
    if (mode === 'single') {
      modelValue.value = toArray(singleStoreValueRef.value) ?? null;
    } else {
      modelValue.value = rangeStoreValueRef.value ? rangeStoreValueRef.value : null;
    }
  });
});

</script>

<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom' }"  :class="ui?.wrapper">
    <InputFieldFrame :text-res-name="getI18nResName2('searchFlights', mode === 'single' ? 'dateSingle' : 'dateRange')" class="w-full">
      <UButton icon="i-heroicons-calendar-days-20-solid" :class="`w-full dark:hover:bg-transparent ${ui?.input ?? ''} pl-[12px]`" variant="outline" color="gray">
        <span class="overflow-hidden line-clamp-1 text-wrap text-start">{{ datesDisplayText }}</span>
      </UButton>
    </InputFieldFrame>

    <template #panel="{ close }">
      <VCalendarDatePicker
        v-if="mode === 'single'"
        v-model="singleValue"
        :columns="1"
        is-required
        v-bind="calendarAttrs"
        @close="close" 
      />
      <VCalendarDatePicker
        v-else
        v-model.range="rangeValue"
        is-required
        :columns="numColumnsForDevice"
        v-bind="calendarAttrs" 
        @close="close" 
      />
    </template>
  </UPopover>
</template>

<style>
:root {
  --vc-gray-50: rgb(var(--color-gray-50));
  --vc-gray-100: rgb(var(--color-gray-100));
  --vc-gray-200: rgb(var(--color-gray-200));
  --vc-gray-300: rgb(var(--color-gray-300));
  --vc-gray-400: rgb(var(--color-gray-400));
  --vc-gray-500: rgb(var(--color-gray-500));
  --vc-gray-600: rgb(var(--color-gray-600));
  --vc-gray-700: rgb(var(--color-gray-700));
  --vc-gray-800: rgb(var(--color-gray-800));
  --vc-gray-900: rgb(var(--color-gray-900));
}

.vc-primary {
  --vc-accent-50: rgb(var(--color-primary-50));
  --vc-accent-100: rgb(var(--color-primary-100));
  --vc-accent-200: rgb(var(--color-primary-200));
  --vc-accent-300: rgb(var(--color-primary-300));
  --vc-accent-400: rgb(var(--color-primary-400));
  --vc-accent-500: rgb(var(--color-primary-500));
  --vc-accent-600: rgb(var(--color-primary-600));
  --vc-accent-700: rgb(var(--color-primary-700));
  --vc-accent-800: rgb(var(--color-primary-800));
  --vc-accent-900: rgb(var(--color-primary-900));
}

</style>
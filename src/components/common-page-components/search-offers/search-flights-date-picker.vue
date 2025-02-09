<script setup lang="ts">
import { AppConfig, eraseTimeOfDay, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import dayjs from 'dayjs';
import isEqual from 'lodash-es/isEqual';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import './../../../node_modules/v-calendar/dist/style.css';
import { useDeviceSize } from '../../../composables/device-size';
import { DeviceSizeEnum } from '../../../helpers/constants';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  mode: 'single' | 'range',
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { ctrlKey, mode } = defineProps<IProps>();
const modelRef = defineModel<Date[] | null | undefined>('selectedDates');

const { d, locale } = useI18n();
const { current: deviceSize } = useDeviceSize();

const dateFrom = eraseTimeOfDay(dayjs().utc(true).toDate());
const dateTo = eraseTimeOfDay(dayjs().utc(true).add(AppConfig.autoInputDatesRangeDays, 'day').toDate());
const today = dateFrom;
const rangeValue = ref({
  start: dateFrom,
  end: dateTo
});
const singleValue = ref(today);
const hasMounted = ref(false);
const open = ref(false);

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlSingleValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(`${ctrlKey}-single`, today.toISOString(), true);
const controlRangeValueSetting = controlSettingsStore.getControlValueSetting<string[]>(`${ctrlKey}-range`, [dateFrom.toISOString(), dateTo.toISOString()], true);

function saveInitialValuesToSettings () {
  const initiallySelectedDates = modelRef.value;
  if (initiallySelectedDates?.length) {
    if (initiallySelectedDates!.length === 1) {
      const initialDateFrom = initiallySelectedDates[0];
      controlSingleValueSetting.value = dayjs(initialDateFrom).isBefore(today) ? today.toISOString() : initialDateFrom.toISOString();
    } else {
      const initialDateFrom = initiallySelectedDates[0];
      const initialDateTo = initiallySelectedDates[1];
      controlRangeValueSetting.value = dayjs(initialDateFrom).isBefore(today) ? [dateFrom.toISOString(), dateTo.toISOString()] : [initialDateFrom.toISOString(), initialDateTo.toISOString()];
    }
  } else if (initiallySelectedDates === null) {
    controlSingleValueSetting.value = today.toISOString();
    controlRangeValueSetting.value = [dateFrom.toISOString(), dateTo.toISOString()];
  } else {
    if (dayjs(controlSingleValueSetting.value).isBefore(today)) {
      controlSingleValueSetting.value = today.toISOString();
    }
    if (dayjs(controlRangeValueSetting.value![0]).isBefore(today)) {
      controlRangeValueSetting.value = [dateFrom.toISOString(), dateTo.toISOString()];
    }
  }
}

function updateModelValue() {
  logger.debug(`(SearchFlightsDatePicker) starting model value update: ctrlKey=${ctrlKey}, current=${JSON.stringify(modelRef.value)}`);
  
  let isSameValue = false;
  let newValue: Date[] | null;
  if (mode === 'single') {
    const newDate = singleValue.value ? eraseTimeOfDay(singleValue.value) : null;
    isSameValue = ((modelRef.value?.length ?? 0) === 0 && !newDate) || (!!modelRef.value?.length && modelRef.value[0].getTime() === newDate?.getTime());
    newValue = newDate ? [newDate!] : null;
  } else {
    newValue = rangeValue.value ? ([eraseTimeOfDay(rangeValue.value.start), eraseTimeOfDay(rangeValue.value.end)]) : null;
    isSameValue = ((modelRef.value?.length ?? 0) === 0 && (newValue?.length ?? 0) === 0) || isEqual(modelRef.value, newValue);
  }

  if(isSameValue) {
    logger.debug(`(SearchFlightsDatePicker) skipping model value update, value is the same: ctrlKey=${ctrlKey}, current=${JSON.stringify(modelRef.value)}, new=${JSON.stringify(newValue)}`);
    return;
  }

  logger.verbose(`(SearchFlightsDatePicker) updating model value: ctrlKey=${ctrlKey}, current=${JSON.stringify(modelRef.value)}, new=${JSON.stringify(newValue)}`);
  modelRef.value = newValue;
}

function onCalendarValueChanged () {
  if (mode === 'single') {
    logger.verbose(`(SearchFlightsDatePicker) updating selected date: ctrlKey=${ctrlKey}, newValue=${singleValue.value}, modelValue=${modelRef.value}`);
    if(!singleValue.value) {
      singleValue.value = modelRef.value![0];
    }
    const value = singleValue.value;
    controlSingleValueSetting.value = eraseTimeOfDay(value).toISOString();
  } else {
    logger.verbose(`(SearchFlightsDatePicker) updating selected dates: ctrlKey=${ctrlKey}, newValue=${JSON.stringify([rangeValue.value.start, rangeValue.value.end])}, modelValue=${JSON.stringify(modelRef.value)}`);
    if(!rangeValue.value?.start || !rangeValue.value?.end) {
      rangeValue.value = { start: modelRef.value![0], end: modelRef.value![1] };
    }
    const value = [rangeValue.value.start, rangeValue.value.end];
    controlRangeValueSetting.value = [eraseTimeOfDay(value![0]).toISOString(), eraseTimeOfDay(value![1]).toISOString()];
  }
  updateModelValue();
  logger.verbose(`(SearchFlightsDatePicker) selected date(s) updated: ctrlKey=${ctrlKey}`);
}

function onDateSelected () {
  onCalendarValueChanged();
  open.value = false;
}

const datesDisplayText = computed(() => {
  const displayFormat = 'numeric';
  return hasMounted.value ? (mode === 'single' ? d(singleValue.value, displayFormat) : (`${d(rangeValue.value.start, displayFormat)} - ${d(rangeValue.value.end, displayFormat)}`)) : undefined;
});

onBeforeMount(() => {
  saveInitialValuesToSettings();

  if (controlSingleValueSetting.value) {
    singleValue.value = eraseTimeOfDay(new Date(controlSingleValueSetting.value!));
  }
  if (controlRangeValueSetting.value) {
    rangeValue.value = { start: eraseTimeOfDay(new Date(controlRangeValueSetting.value![0])), end: eraseTimeOfDay(new Date(controlRangeValueSetting.value![1])) };
  }
});

onMounted(() => {
  watch(() => mode, () => {
    updateModelValue();
  });

  watch(singleValue, onDateSelected);
  watch(rangeValue, onDateSelected);

  updateModelValue();

  hasMounted.value = true;
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
    minDate: today,
    locale: locale.value,
    'is-dark': { selector: 'html', darkClass: 'dark' },
    timezone: 'utc',
    mode: 'date'
  };
});

defineShortcuts({
  'ESCAPE': () => open.value = false
});

</script>

<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom' }"  :class="ui?.wrapper">
    <InputFieldFrame :text-res-name="getI18nResName2('searchFlights', 'destinationCaption')" class="w-full">
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
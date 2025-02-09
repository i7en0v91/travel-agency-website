<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import type { DatePickerDate, DatePickerModel } from 'v-calendar/dist/types/src/use/datePicker.js';
import dayjs from 'dayjs';
import InputFieldFrame from './input-field-frame.vue';
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import { getCommonServices } from '../../helpers/service-accessors';
import { datePickerValueToDate } from './../../helpers/components';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  persistent: boolean,
  defaultDate?: Date,
  minDate?: Date,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { persistent, ctrlKey, defaultDate, minDate } = defineProps<IProps>();


const { d, locale } = useI18n();

const today = eraseTimeOfDay(dayjs().utc(true).toDate());
let defaultValue = defaultDate ? eraseTimeOfDay(defaultDate) : today;
if (dayjs(defaultValue).isBefore(today)) {
  defaultValue = today;
}
const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(ctrlKey, defaultValue.toISOString(), persistent);

const logger = getCommonServices().getLogger();

const modelRef = defineModel<Date  | null | undefined>('selectedDate');
const open = ref(false);
const calendar = useTemplateRef('calendar');

const selectedValue = ref<Date>(today);

const hasMounted = ref(false);

function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

function fireSelectedDateChange (date: Date) {
  logger.debug(`(DatePicker) date changed: ctrlKey=${ctrlKey}, date=${date}`);
  $emit('update:selectedDate', eraseTimeOfDay(date));
}

function onSelectedDateUpdated (date: Date) {
  logger.verbose(`(DatePicker) calendar date updated: ctrlKey=${ctrlKey}, date=${date}`);
  controlValueSetting.value! = eraseTimeOfDay(date).toISOString();
  fireSelectedDateChange(date);
  open.value = false;
  logger.verbose(`(DatePicker) selected date(s) updated: ctrlKey=${ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDate', date: Date): void}>();

function onValueSelected (value: DatePickerModel) {
  logger.verbose(`(SearchFlightsDatePicker) value selected: ctrlKey=${ctrlKey}, value=${JSON.stringify(value)}`);
  onSelectedDateUpdated(datePickerValueToDate(value as DatePickerDate, calendar.value?.locale, logger));
}

function setupInitialValue() {
  if (dayjs(controlValueSetting.value).isBefore(today)) {
    controlValueSetting.value = today.toISOString();
  }

  let initialValue = today;
  if(modelRef.value) {
    initialValue = modelRef.value;
  } else if(modelRef.value === null) {
    initialValue = defaultValue ?? today;
  } else {
    initialValue = eraseTimeOfDay(new Date(controlValueSetting.value!));
  }  
  if (dayjs(initialValue).isBefore(today)) {
    initialValue = today;
  }

  controlValueSetting.value = initialValue.toISOString();
  selectedValue.value = eraseTimeOfDay(new Date(controlValueSetting.value!));
  modelRef.value = initialValue;
}

const datesDisplayText = computed(() => {
  return hasMounted.value ? d(selectedValue.value!, 'short') : undefined;
});

onBeforeMount(() => {
  setupInitialValue();
});
onMounted(() => {
  hasMounted.value = true;
  fireSelectedDateChange(selectedValue.value);
});

watch(modelRef, () => {
  selectedValue.value = modelRef.value ?? defaultValue;
});

defineShortcuts({
  'ESCAPE': () => open.value = false
});

const calendarAttrs = computed(() => {
  return {
    transparent: true,
    borderless: false,
    color: 'primary',
    minDate: minDate,
    locale: locale.value,
    'is-dark': { selector: 'html', darkClass: 'dark' },
    timezone: 'utc',
    mode: 'date'
  };
});

</script>

<template>
  <UPopover v-model:open="open" :popper="{ placement: 'bottom' }" :class="ui?.wrapper">
    <InputFieldFrame :text-res-name="captionResName" class="w-full">
      <UButton icon="i-heroicons-calendar-days-20-solid" :class="`w-full dark:hover:bg-transparent pl-[12px] ${ui?.input ?? ''}`" variant="outline" color="gray">
        <span class="overflow-hidden line-clamp-1 text-wrap text-start">{{ datesDisplayText }}</span>
      </UButton>
    </InputFieldFrame>

    <template #panel="{ close }">
      <VCalendarDatePicker
        ref="calendar"
        v-model="selectedValue"
        :columns="1"
        is-required
        v-bind="calendarAttrs"
        @update:model-value="onValueSelected"
        @close="close" 
      />
    </template>
  </UPopover>  
</template>

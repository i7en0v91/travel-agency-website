<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';
import dayjs from 'dayjs';
import InputFieldFrame from './input-field-frame.vue';
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  persistent: boolean,
  defaultDate?: Date,
  icon?: boolean,
  minDate?: Date,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const props = withDefaults(defineProps<IProps>(), {
  defaultDate: undefined,
  icon: true,
  minDate: undefined,
  ui: undefined
});

type DatePickerDate = number | string | Date | null | {
  start?: number | string | Date | null,
  end?: number | string | Date | null
};

const { d, locale } = useI18n();

const today = eraseTimeOfDay(dayjs().utc(true).toDate());
let defaultValue = props.defaultDate ? eraseTimeOfDay(props.defaultDate) : today;
if (dayjs(defaultValue).isBefore(today)) {
  defaultValue = today;
}
const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(props.ctrlKey, defaultValue.toISOString(), props.persistent);

const logger = getCommonServices().getLogger();

const modelRef = defineModel<Date  | null | undefined>('selectedDate');
const open = ref(false);

const selectedValue = ref<Date>(today);

const hasMounted = ref(false);

function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

function fireSelectedDateChange () {
  logger.debug(`(DatePicker) date changed: ctrlKey=${props.ctrlKey}, value=${selectedValue.value}`);
  $emit('update:selectedDate', eraseTimeOfDay(selectedValue.value));
}

function onCalendarValueUpdated () {
  logger.verbose(`(DatePicker) calendar date updated: ctrlKey=${props.ctrlKey}, value=${selectedValue.value}`);
  controlValueSetting.value! = eraseTimeOfDay(selectedValue.value).toISOString();
  fireSelectedDateChange();
  open.value = false;
  logger.verbose(`(DatePicker) selected date(s) updated: ctrlKey=${props.ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDate', date: Date): void}>();

function onDateSelected (value: DatePickerDate) {
  logger.verbose(`(DatePicker) date selected: ctrlKey=${props.ctrlKey}, value=${JSON.stringify(value)}`);
  onCalendarValueUpdated();
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
  fireSelectedDateChange();
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
    minDate: props.minDate,
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
        v-model="selectedValue"
        :columns="1"
        is-required
        v-bind="calendarAttrs"
        @update:model-value="onDateSelected"
        @close="close" 
      />
    </template>
  </UPopover>  
</template>

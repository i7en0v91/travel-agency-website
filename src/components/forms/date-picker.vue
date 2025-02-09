<script setup lang="ts">
import { type I18nResName, getI18nResName1 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../helpers/dom';
import type { DatePickerDate, DatePickerModel } from 'v-calendar/dist/types/src/use/datePicker.js';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import FieldFrame from './../forms/field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import { datePickerValueToDate } from './../../helpers/components';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  persistent: boolean,
  selectedDate?: Date,
  initiallySelectedDate?: Date | null | undefined,
  defaultDate?: Date,
  icon?: boolean,
  minDate?: Date
}

const { selectedDate, initiallySelectedDate, persistent, ctrlKey, defaultDate, icon = true } = defineProps<IProps>();

const { d, locale } = useI18n();

const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const calendar = useTemplateRef('calendar');

const logger = getCommonServices().getLogger();

const today = eraseTimeOfDay(dayjs().utc(true).toDate());
let defaultValue = defaultDate ? eraseTimeOfDay(defaultDate) : today;
if (dayjs(defaultValue).isBefore(today)) {
  defaultValue = today;
}

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(ctrlKey, defaultValue.toISOString(), persistent);
if (dayjs(controlValueSetting.value).isBefore(today)) {
  controlValueSetting.value = today.toISOString();
}

let initialValue = defaultValue;
if (initiallySelectedDate) {
  initialValue = initiallySelectedDate;
  if (dayjs(initialValue).isBefore(today)) {
    initialValue = today;
  }
  controlValueSetting.value = initialValue.toISOString();
} else if (initiallySelectedDate === null) {
  initialValue = defaultValue;
  controlValueSetting.value = initialValue.toISOString();
}

const selectedValue = ref<Date>(initialValue);
const hasMounted = ref(false);

function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

function fireSelectedDateChange (date: Date) {
  logger.debug(`(DatePicker) date changed: ctrlKey=${ctrlKey}, date=${date}`);
  $emit('update:selectedDate', eraseTimeOfDay(date));
}

function onSelectedDateUpdated (date: Date) {
  logger.verbose(`(DatePicker) calendar date updated: ctrlKey=${ctrlKey}, date=${date}`);
  controlValueSetting.value! = eraseTimeOfDay(date).toISOString();
  fireSelectedDateChange(date);
  logger.verbose(`(DatePicker) selected date(s) updated: ctrlKey=${ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDate', date: Date): void}>();

function onValueSelected (value: DatePickerModel) {
  logger.verbose(`(SearchFlightsDatePicker) value selected: ctrlKey=${ctrlKey}, value=${JSON.stringify(value)}`);
  hideDropdown();
  onSelectedDateUpdated(datePickerValueToDate(value as DatePickerDate, calendar.value?.locale, logger));
}

function onEscape () {
  hideDropdown();
}

const datesDisplayText = computed(() => {
  return hasMounted.value ? d(selectedValue.value!, 'short') : undefined;
});

onBeforeMount(() => {
  if (controlValueSetting.value) {
    selectedValue.value = eraseTimeOfDay(new Date(controlValueSetting.value!));
  }
});
onMounted(() => {
  hasMounted.value = true;
  fireSelectedDateChange(selectedValue.value);
});

watch(() => selectedDate, () => {
  selectedValue.value = selectedDate ?? defaultValue;
});

</script>

<template>
  <div class="date-picker" @keyup.escape="onEscape">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
      :distance="-6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom"
      :flip="false"
      :boundary="openBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <FieldFrame :text-res-name="captionResName" class="date-picker-field-frame">
        <div class="date-picker-field-div">
          <button
            :id="`date-picker-${ctrlKey}`"
            ref="open-btn"
            class="date-picker-field-btn brdr-1"
            type="button"
            @keyup.escape="hideDropdown"
          >
            {{ datesDisplayText }}
          </button>
          <div
            v-if="icon"
            :class="`date-picker-field-icon icon-calendar pl-xs-3 ml-xs-2`"
            :alt="icon ? $t(getI18nResName1('calendarImgAlt')) : ''"
          />
        </div>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <VDatePicker
            ref="calendar"
            v-model:model-value="selectedValue"
            timezone="utc"
            mode="date"
            class="calendar"
            color="golobe"
            :min-date="minDate ?? today"
            :locale="locale"
            @update:model-value="onValueSelected"
          />
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

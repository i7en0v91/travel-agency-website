<script setup lang="ts">
import { AppConfig, eraseTimeOfDay, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import FieldFrame from './../../forms/field-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import type { DatePickerDate, DatePickerModel, DatePickerRangeObject } from 'v-calendar/dist/types/src/use/datePicker.js';
import { datePickerValueToDate } from './../../../helpers/components';
import isDate from 'lodash-es/isDate';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  selectedDates: Date[],
  initiallySelectedDates?: Date[] | null | undefined,
  mode: 'single' | 'range'
}

const { ctrlKey, mode, initiallySelectedDates } = defineProps<IProps>();

const { d, locale } = useI18n();

const dateFrom = eraseTimeOfDay(dayjs().utc(true).toDate());
const dateTo = eraseTimeOfDay(dayjs().utc(true).add(AppConfig.autoInputDatesRangeDays, 'day').toDate());
const today = dateFrom;
const rangeValue = ref({
  start: dateFrom,
  end: dateTo
});
const singleValue = ref(today);
const hasMounted = ref(false);

const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const calendar = useTemplateRef('calendar');

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlSingleValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(`${ctrlKey}-single`, today.toISOString(), true);
const controlRangeValueSetting = controlSettingsStore.getControlValueSetting<string[]>(`${ctrlKey}-range`, [dateFrom.toISOString(), dateTo.toISOString()], true);
initialValuesFromSettings();

function initialValuesFromSettings () {
  if (initiallySelectedDates) {
    if (initiallySelectedDates.length === 1) {
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

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function hideDropdown () {
  dropdown.value?.hide();
}

function fireSelectedDateChanged (date: Date | { start: Date, end: Date }) {
  if (isDate(date)) {
    logger.debug(`(SearchFlightsDatePicker) firing selected date change: ctrlKey=${ctrlKey}, value=${date}`);
    $emit('update:selectedDates', [eraseTimeOfDay(date)]);
  } else {
    logger.debug(`(SearchFlightsDatePicker) firing selected dates change: ctrlKey=${ctrlKey}, value=${JSON.stringify(date)}`);
    $emit('update:selectedDates', [eraseTimeOfDay(date.start), eraseTimeOfDay(date.end)]);
  }
}

function emitModelUpdate() {
  logger.debug(`(SearchFlightsDatePicker) emitting model update: ctrlKey=${ctrlKey}`);
  if (mode === 'single') {
    fireSelectedDateChanged(eraseTimeOfDay(singleValue.value));
  } else {
    fireSelectedDateChanged({
      start: eraseTimeOfDay(rangeValue.value.start),
      end: eraseTimeOfDay(rangeValue.value.end)
    });
  }
}

function onSelectedDateUpdated (date: Date | { start: Date, end: Date }) {
  if (isDate(date)) {
    logger.verbose(`(SearchFlightsDatePicker) updating selected date: ctrlKey=${ctrlKey}, value=${date}`);
    controlSingleValueSetting.value! = eraseTimeOfDay(date).toISOString();
  } else {
    logger.verbose(`(SearchFlightsDatePicker) updating selected dates: ctrlKey=${ctrlKey}, value=${JSON.stringify([date.start, date.end])}`);
    controlRangeValueSetting.value! = [eraseTimeOfDay(date.start).toISOString(), eraseTimeOfDay(date.end).toISOString()];
  }
  fireSelectedDateChanged(date);
  logger.verbose(`(SearchFlightsDatePicker) selected date(s) updated: ctrlKey=${ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDates', dates: Date[]): void}>();

function onValueSelected (value: DatePickerModel) {
  logger.verbose(`(SearchFlightsDatePicker) date selected: ctrlKey=${ctrlKey}, value=${JSON.stringify(value)}`);
  hideDropdown();

  let selectedDate: Date | { start: Date, end: Date };
  const locale = calendar.value?.locale;
  if(mode === 'single') {
    selectedDate = datePickerValueToDate(value as DatePickerDate, locale, logger) as Date;
  } else {
    const rangeValue = value as DatePickerRangeObject;
    selectedDate = { 
      start: datePickerValueToDate(rangeValue.start, locale, logger),
      end: datePickerValueToDate(rangeValue.end, locale, logger)
    };
  }
  onSelectedDateUpdated(selectedDate);
}

function onEscape () {
  hideDropdown();
}

const datesDisplayText = computed(() => {
  const displayFormat = 'numeric';
  return hasMounted.value ? (mode === 'single' ? d(singleValue.value, displayFormat) : (`${d(rangeValue.value.start, displayFormat)} - ${d(rangeValue.value.end, displayFormat)}`)) : undefined;
});

onBeforeMount(() => {
  if (controlSingleValueSetting.value) {
    singleValue.value = eraseTimeOfDay(new Date(controlSingleValueSetting.value!));
  }
  if (controlRangeValueSetting.value) {
    rangeValue.value = { start: eraseTimeOfDay(new Date(controlRangeValueSetting.value![0])), end: eraseTimeOfDay(new Date(controlRangeValueSetting.value![1])) };
  }
});
onMounted(() => {
  hasMounted.value = true;
  emitModelUpdate();
});
watch(() => mode, () => {
  emitModelUpdate();
});

</script>

<template>
  <div class="search-flights-date-picker" @keyup.escape="onEscape">
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
        <button
          :id="`search-flights-dates-${ctrlKey}`"
          ref="open-btn"
          class="date-picker-field-btn brdr-1"
          type="button"
          @keyup.escape="hideDropdown"
        >
          {{ datesDisplayText }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <VDatePicker
            v-if="mode === 'single'"
            ref="calendar"
            v-model="singleValue"
            timezone="utc"
            mode="date"
            class="calendar"
            color="golobe"
            :min-date="today"
            :locale="locale"
            @update:model-value="onValueSelected"
          />
          <VDatePicker
            v-else
            ref="calendar"
            v-model.range="rangeValue"
            timezone="utc"
            mode="date"
            :min-date="today"
            class="calendar"
            color="golobe"
            :locale="locale"
            @update:model-value="onValueSelected"
          />
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

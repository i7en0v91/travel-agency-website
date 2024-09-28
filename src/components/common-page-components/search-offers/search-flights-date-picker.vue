<script setup lang="ts">
import { AppConfig, eraseTimeOfDay, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import FieldFrame from './../../forms/field-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  selectedDates: Date[],
  initiallySelectedDates?: Date[] | null | undefined,
  mode: 'single' | 'range'
}

const props = defineProps<IProps>();

type DatePickerDate = number | string | Date | null | {
  start?: number | string | Date | null,
  end?: number | string | Date | null
};

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

const elBtn = shallowRef<HTMLElement>();
const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlSingleValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(`${props.ctrlKey}-single`, today.toISOString(), true);
const controlRangeValueSetting = controlSettingsStore.getControlValueSetting<string[]>(`${props.ctrlKey}-range`, [dateFrom.toISOString(), dateTo.toISOString()], true);
initialValuesFromSettings();

function initialValuesFromSettings () {
  if (props.initiallySelectedDates) {
    if (props.initiallySelectedDates.length === 1) {
      const initialDateFrom = props.initiallySelectedDates[0];
      controlSingleValueSetting.value = dayjs(initialDateFrom).isBefore(today) ? today.toISOString() : initialDateFrom.toISOString();
    } else {
      const initialDateFrom = props.initiallySelectedDates[0];
      const initialDateTo = props.initiallySelectedDates[1];
      controlRangeValueSetting.value = dayjs(initialDateFrom).isBefore(today) ? [dateFrom.toISOString(), dateTo.toISOString()] : [initialDateFrom.toISOString(), initialDateTo.toISOString()];
    }
  } else if (props.initiallySelectedDates === null) {
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

function fireSelectedDatesChanged () {
  if (props.mode === 'single') {
    logger.debug(`(SearchFlightsDatePicker) firing selected date change: ctrlKey=${props.ctrlKey}, value=${singleValue.value}`);
    $emit('update:selectedDates', [eraseTimeOfDay(singleValue.value)]);
  } else {
    logger.debug(`(SearchFlightsDatePicker) firing selected dates change: ctrlKey=${props.ctrlKey}, value=${JSON.stringify(rangeValue.value)}`);
    $emit('update:selectedDates', [eraseTimeOfDay(rangeValue.value.start), eraseTimeOfDay(rangeValue.value.end)]);
  }
}

function onCalendarValueUpdated () {
  if (props.mode === 'single') {
    logger.verbose(`(SearchFlightsDatePicker) updating selected date: ctrlKey=${props.ctrlKey}, value=${singleValue.value}`);
    controlSingleValueSetting.value! = eraseTimeOfDay(singleValue.value).toISOString();
  } else {
    logger.verbose(`(SearchFlightsDatePicker) updating selected dates: ctrlKey=${props.ctrlKey}, value=${JSON.stringify([rangeValue.value.start, rangeValue.value.end])}`);
    controlRangeValueSetting.value! = [eraseTimeOfDay(rangeValue.value.start).toISOString(), eraseTimeOfDay(rangeValue.value.end).toISOString()];
  }
  fireSelectedDatesChanged();
  logger.verbose(`(SearchFlightsDatePicker) selected date(s) updated: ctrlKey=${props.ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDates', dates: Date[]): void}>();

function onDateSelected (value: DatePickerDate) {
  logger.verbose(`(SearchFlightsDatePicker) date selected: ctrlKey=${props.ctrlKey}, value=${JSON.stringify(value)}`);
  hideDropdown();
  onCalendarValueUpdated();
}

function onEscape () {
  hideDropdown();
}

const datesDisplayText = computed(() => {
  const displayFormat = 'numeric';
  return hasMounted.value ? (props.mode === 'single' ? d(singleValue.value, displayFormat) : (`${d(rangeValue.value.start, displayFormat)} - ${d(rangeValue.value.end, displayFormat)}`)) : undefined;
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
  fireSelectedDatesChanged();
});
watch(() => props.mode, () => {
  fireSelectedDatesChanged();
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
      :boundary="elBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <FieldFrame :text-res-name="captionResName" class="date-picker-field-frame">
        <button
          :id="`search-flights-dates-${props.ctrlKey}`"
          ref="elBtn"
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
            v-model="singleValue"
            timezone="utc"
            mode="date"
            class="calendar"
            color="golobe"
            :min-date="today"
            :locale="locale"
            @update:model-value="onDateSelected"
          />
          <VDatePicker
            v-else
            v-model.range="rangeValue"
            timezone="utc"
            mode="date"
            :min-date="today"
            class="calendar"
            color="golobe"
            :locale="locale"
            @update:model-value="onDateSelected"
          />
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

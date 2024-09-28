<script setup lang="ts">
import { type I18nResName, getI18nResName1 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import FieldFrame from './../forms/field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

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

const props = withDefaults(defineProps<IProps>(), {
  selectedDate: undefined,
  defaultDate: undefined,
  initiallySelectedDate: undefined,
  icon: true,
  minDate: undefined
});

type DatePickerDate = number | string | Date | null | {
  start?: number | string | Date | null,
  end?: number | string | Date | null
};

const { d, locale } = useI18n();

const elBtn = shallowRef<HTMLElement>();
const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

const logger = getCommonServices().getLogger();

const today = eraseTimeOfDay(dayjs().utc(true).toDate());
let defaultValue = props.defaultDate ? eraseTimeOfDay(props.defaultDate) : today;
if (dayjs(defaultValue).isBefore(today)) {
  defaultValue = today;
}

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<string | undefined>(props.ctrlKey, defaultValue.toISOString(), props.persistent);
if (dayjs(controlValueSetting.value).isBefore(today)) {
  controlValueSetting.value = today.toISOString();
}

let initialValue = defaultValue;
if (props.initiallySelectedDate) {
  initialValue = props.initiallySelectedDate;
  if (dayjs(initialValue).isBefore(today)) {
    initialValue = today;
  }
  controlValueSetting.value = initialValue.toISOString();
} else if (props.initiallySelectedDate === null) {
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

function fireSelectedDateChange () {
  logger.debug(`(DatePicker) date changed: ctrlKey=${props.ctrlKey}, value=${selectedValue.value}`);
  $emit('update:selectedDate', eraseTimeOfDay(selectedValue.value));
}

function onCalendarValueUpdated () {
  logger.verbose(`(DatePicker) calendar date updated: ctrlKey=${props.ctrlKey}, value=${selectedValue.value}`);
  controlValueSetting.value! = eraseTimeOfDay(selectedValue.value).toISOString();
  fireSelectedDateChange();
  logger.verbose(`(DatePicker) selected date(s) updated: ctrlKey=${props.ctrlKey}`);
}

const $emit = defineEmits<{(event: 'update:selectedDate', date: Date): void}>();

function onDateSelected (value: DatePickerDate) {
  logger.verbose(`(SearchFlightsDatePicker) date selected: ctrlKey=${props.ctrlKey}, value=${JSON.stringify(value)}`);
  hideDropdown();
  onCalendarValueUpdated();
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
  fireSelectedDateChange();
});

watch(() => props.selectedDate, () => {
  selectedValue.value = props.selectedDate ?? defaultValue;
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
      :boundary="elBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <FieldFrame :text-res-name="captionResName" class="date-picker-field-frame">
        <div class="date-picker-field-div">
          <button
            :id="`date-picker-${props.ctrlKey}`"
            ref="elBtn"
            class="date-picker-field-btn brdr-1"
            type="button"
            @keyup.escape="hideDropdown"
          >
            {{ datesDisplayText }}
          </button>
          <div
            v-if="icon"
            :class="`date-picker-field-icon icon-calendar pl-xs-3 ml-xs-2`"
            :alt="props.icon ? $t(getI18nResName1('calendarImgAlt')) : ''"
          />
        </div>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <VDatePicker
            v-model:model-value="selectedValue"
            timezone="utc"
            mode="date"
            class="calendar"
            color="golobe"
            :min-date="minDate ?? today"
            :locale="locale"
            @update:model-value="onDateSelected"
          />
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

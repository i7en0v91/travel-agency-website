<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { eraseTimeOfDay, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import FieldFrame from './../../forms/field-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import type { DatePickerModel } from 'v-calendar/dist/types/src/use/datePicker.js';
import isArray from 'lodash-es/isArray';

interface IProps {
  ctrlKey: ControlKey,
  captionResName: I18nResName,
  mode: 'single' | 'range'
}

const { ctrlKey, mode } = defineProps<IProps>();
const { d, locale } = useI18n();

const Today = eraseTimeOfDay(dayjs().utc(true).toDate());

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchFlightsDatePicker' });
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<Date[] | null | undefined>('selectedDates');
const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const rangeValue = ref<{ start: Date, end: Date }>();
const singleValue = ref<Date>();

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

function onValueSelected (value: DatePickerModel) {
  logger.verbose('date selected', { ctrlKey, value });
  hideDropdown();
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

function datesArrayEquals(arr1: Date[], arr2: Date[]) {
  return arr1.length === arr2.length && arr1.every((v, idx) => v === arr2[idx]);
}

function storeModelValuesDiffer(
  storeValue: Date | Date[] | null, 
  modelValue: Date[] | null | undefined, mode: 'single' | 'range'
) {
  return mode === 'single' ? 
    (storeValue != ((modelValue?.length ?? 0) > 0 ? modelValue![0] : null)) :
    (!datesArrayEquals((storeValue ?? []) as Date[], (modelValue?.length ?? 0) > 0 ? (modelValue as Date[]) : [])
  );
}

function onEscape () {
  hideDropdown();
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

onMounted(() => {
  const singleInitialOverwrite = modelValue.value?.length ? modelValue.value[0] : undefined;
  logger.debug('acquiring value ref for single date', { ctrlKey, initialOverwrite: singleInitialOverwrite });
  const { valueRef: singleStoreValueRef } = controlValuesStore.acquireValueRef<Date | null>([...ctrlKey, 'DatePicker']);
    
  const rangeInitialOverwrite = ((modelValue.value?.length ?? 0) >= 2) ? modelValue.value : undefined;
  logger.debug('acquiring value ref for range dates', { ctrlKey, initialOverwrite: rangeInitialOverwrite });
  const { valueRef: rangeStoreValueRef } = controlValuesStore.acquireValueRef<Date[] | null>([...ctrlKey, 'DateRangePicker']);

  watch([singleStoreValueRef, rangeStoreValueRef], () => {
    const storeValue = (mode === 'single' ? singleStoreValueRef : rangeStoreValueRef).value;
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue, mode });
    const newValue = mode === 'single' ? storeValue : (storeValue ?? []);
    const changed = storeModelValuesDiffer(newValue, modelValue.value, mode);
    if(changed) {
      logger.debug('updating model value by store change', { ctrlKey, newValue, mode });
      modelValue.value = newValue ? (isArray(newValue) ? newValue : [newValue]) : null;  
    }
  }, { immediate: true });

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
          logger.debug('updating store value by model change', { ctrlKey, modelValue: modelValue.value, mode });
          singleStoreValueRef.value = toUnary(modelValue.value ?? null) as Date | null;
        }
        break;
      default:
        rangeValue.value = modelValue.value ? { start: modelValue.value[0], end: modelValue.value[1] } : undefined;
        if(changed) {
          logger.debug('updating store value by model change', { ctrlKey, modelValue: modelValue.value, mode });
          rangeStoreValueRef.value = modelValue.value ?? null;
        }
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
      logger.debug('updating store value by calendar selection', { ctrlKey, newValue, mode });
      switch(mode) {
        case 'single':
          singleStoreValueRef.value = toUnary(singleValue.value) ?? null;
          break;
        default:
          rangeStoreValueRef.value = newValue;
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
  <div class="search-flights-date-picker" @keyup.escape="onEscape">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="[...ctrlKey, 'Wrapper']"
      :aria-id="`${toShortForm(ctrlKey)}-DropDownWrapper`"
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
          :id="`search-flights-dates-${toShortForm(ctrlKey)}`"
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
            :min-date="Today"
            :locale="locale"
            @update:model-value="onValueSelected"
          />
          <VDatePicker
            v-else
            ref="calendar"
            v-model.range="rangeValue"
            timezone="utc"
            mode="date"
            :min-date="Today"
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
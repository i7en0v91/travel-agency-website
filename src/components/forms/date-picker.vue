<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { type I18nResName, getI18nResName1 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../helpers/dom';
import type { DatePickerModel } from 'v-calendar/dist/types/src/use/datePicker.js';
import type { Dropdown } from 'floating-vue';
import FieldFrame from './../forms/field-frame.vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  captionResName: I18nResName,
  persistent?: boolean,
  icon?: boolean,
  minDate?: Date
}

const { 
  ctrlKey, 
  persistent = undefined,
  icon = true 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DatePicker' });
const controlValuesStore = useControlValuesStore();

const { d, locale } = useI18n();
const modelValue = defineModel<Date | null | undefined>('selectedDate');
const hasMounted = ref(false);

const openBtn = useTemplateRef<HTMLElement>('open-btn');
const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');

const datesDisplayText = computed(() => {
  return hasMounted.value ? (modelValue.value ? d(modelValue.value!, 'short') : '') : '';
});

function onValueSelected (value: DatePickerModel) {
  logger.verbose('value selected', { ctrlKey, value });
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

function onEscape () {
  hideDropdown();
}

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<Date | null>(ctrlKey, {
    persistent
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue: Date | null = storeValueRef.value ?? null;
    const changed = storeValueRef.value !== modelValue.value;
    if(changed) {
      modelValue.value = newValue;  
    }
  }, { immediate: true });

  watch(modelValue, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    if(modelValue.value !== storeValueRef.value) {
      storeValueRef.value = modelValue.value ?? null;
    }
  }, { immediate: false });

  hasMounted.value = true;
});

</script>

<template>
  <div class="date-picker" @keyup.escape="onEscape">
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
        <div class="date-picker-field-div">
          <button
            :id="`date-picker-${toShortForm(ctrlKey)}`"
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
            v-model:model-value="modelValue"
            timezone="utc"
            mode="date"
            class="calendar"
            color="golobe"
            :min-date="minDate"
            :locale="locale"
            @update:model-value="onValueSelected"
          />
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

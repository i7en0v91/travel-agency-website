<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';
import InputFieldFrame from './input-field-frame.vue';
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import { getCommonServices } from '../../helpers/service-accessors';
import { useControlValuesStore } from './../../stores/control-values-store';

interface IProps {
  ctrlKey: ControlKey,
  captionResName: I18nResName,
  persistent?: boolean,
  minDate?: Date,
  ui?: {
    wrapper?: string,
    input?: string
  }
}

const { 
  ctrlKey, 
  persistent = undefined,
  minDate 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DatePicker' });
const controlValuesStore = useControlValuesStore();
const { d, locale } = useI18n();

const modelValue = defineModel<Date  | null | undefined>('selectedDate');
const hasMounted = ref(false);
const open = ref(false);

const datesDisplayText = computed(() => {
  return hasMounted.value ? (modelValue.value ? d(modelValue.value!, 'short') : '') : '';
});

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
        v-model="modelValue"
        :columns="1"
        is-required
        v-bind="calendarAttrs"
        @close="close" 
      />
    </template>
  </UPopover>  
</template>

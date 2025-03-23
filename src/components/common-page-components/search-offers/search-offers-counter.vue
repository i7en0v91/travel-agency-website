<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useControlValuesStore } from './../../../stores/control-values-store';

interface IProps {
  ctrlKey: ControlKey,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const { 
  ctrlKey,
  minValue, 
  maxValue 
} = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchOffersCounter' });
const controlValuesStore = useControlValuesStore();

const counterModel = defineModel<number | undefined>('value');

const btnDecrement = useTemplateRef('btn-decrement');
const btnIncrement = useTemplateRef('btn-increment');

const displayText = computed(() => {
  if(import.meta.server) {
    return '';
  }

  return counterModel.value?.toString() ?? '';
});

function onIncrementClick () {
  logger.debug('increment clicked', { ctrlKey, value: counterModel.value });
  const updatedValue = counterModel.value! + 1;
  if (updatedValue > maxValue) {
    return;
  }
  if (updatedValue === maxValue) {
    logger.debug('disabling increment btn', { ctrlKey, max: maxValue });
    btnIncrement.value?.$el.blur();
  }
  counterModel.value = updatedValue;
}

function onDecrementClick () {
  logger.debug('decrement clicked', { ctrlKey, value: counterModel.value });
  const updatedValue = counterModel.value! - 1;
  if (updatedValue < minValue) {
    return;
  }
  if (updatedValue === minValue) {
    logger.debug('disabling decrement btn', { ctrlKey, min: minValue });
    btnDecrement.value?.$el.blur();
  }
  counterModel.value = updatedValue;
}

onMounted(() => {
  logger.debug('acquiring value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<number | null>(ctrlKey, {});

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: counterModel.value, storeValue: storeValueRef.value });
    const newValue: number | undefined = storeValueRef.value ?? undefined;
    const changed = storeValueRef.value !== counterModel.value;
    if(changed) {
      counterModel.value = newValue;  
    }
  }, { immediate: true });

  watch(counterModel, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: counterModel.value, storeValue: storeValueRef.value });
    if(counterModel.value !== storeValueRef.value) {
      storeValueRef.value = counterModel.value ?? null;
    }
  }, { immediate: false });
});

</script>

<template>
  <div class="text-sm sm:text-base w-full flex flex-row flex-nowrap items-center gap-[32px]">
    <div class="w-full min-w-[100px] text-gray-500 dark:text-gray-400 font-medium">
      {{ $t(labelResName) }}
    </div>
    <div class="flex flex-row flex-nowrap items-center">
      <UButton
        ref="btn-decrement"
        icon="i-ion-remove-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="counterModel! <= minValue"
        @click="onDecrementClick"
      />
      <div class="min-w-[20px] text-center">
        {{ displayText }}
      </div>
      <UButton
        ref="btn-increment"
        icon="i-ion-add-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="counterModel! >= maxValue"
        @click="onIncrementClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import SimpleButton from './../../forms/simple-button.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  defaultValue: number,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const { 
  ctrlKey, 
  defaultValue, 
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

  return (counterModel.value ?? defaultValue)?.toString() ?? '';
});

function onIncrementClick () {
  const updatedValue = counterModel.value! + 1;
  if (updatedValue > maxValue) {
    return;
  }
  if ((updatedValue === maxValue) || (updatedValue === 2)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === maxValue) {
    btnIncrement.value?.$el.blur();
  }
  counterModel.value = updatedValue;
}

function onDecrementClick () {
  const updatedValue = counterModel.value! - 1;
  if (updatedValue < minValue) {
    return;
  }
  if ((updatedValue === minValue) || (updatedValue === maxValue - 1)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === minValue) {
    btnDecrement.value?.$el.blur();
  }
  counterModel.value = updatedValue;
}

onMounted(() => {
  const initialOverwrite = counterModel.value;
  logger.debug('acquiring value ref', { ctrlKey, defaultValue, initialOverwrite });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<number>(ctrlKey, {
    initialOverwrite,
    defaultValue
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: counterModel.value, storeValue: storeValueRef.value });
    const newValue: number = storeValueRef.value;
    const changed = storeValueRef.value !== counterModel.value;
    if(changed) {
      counterModel.value = newValue;  
    }
  }, { immediate: true });

  watch(counterModel, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: counterModel.value, storeValue: storeValueRef.value });
    if(counterModel.value !== storeValueRef.value) {
      storeValueRef.value = counterModel.value ?? defaultValue;
    }
  }, { immediate: false });
});

</script>

<template>
  <div class="search-offers-counter">
    <ClientOnly>
      <div class="search-offers-counter-caption">
        {{ $t(labelResName) }}
      </div>
      <div class="search-offers-counter-controls">
        <SimpleButton
          ref="btn-decrement"
          class="search-offers-counter-btn mr-xs-2"
          :ctrl-key="[...ctrlKey, 'Btn', 'Decrement']"
          kind="icon"
          icon="decrement"
          :enabled="(value ?? defaultValue) > minValue"
          @click="onDecrementClick"
        />
        <div class="search-offers-counter-value">
          {{ displayText }}
        </div>
        <SimpleButton
          ref="btn-increment"
          class="search-offers-counter-btn ml-xs-2"
          :ctrl-key="[...ctrlKey, 'Btn', 'Increment']"
          kind="icon"
          icon="increment"
          :enabled="(value ?? defaultValue) < maxValue"
          @click="onIncrementClick"
        />
      </div>
    </ClientOnly>
  </div>
</template>

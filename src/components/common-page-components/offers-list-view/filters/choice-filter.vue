<script setup lang="ts">
import type { ControlKey } from './../../../../helpers/components';
import { type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import isEqual from 'lodash-es/isEqual';
import type { ISearchOffersChoiceFilterProps, ISearchOffersFilterVariant, SearchOffersFilterVariantId } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersChoiceFilterProps
}

const { ctrlKey, filterParams } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ChoiceFilter', filterId: filterParams.filterId });
const controlValuesStore = useControlValuesStore();
const { locale } = useI18n();

const modelValue = defineModel<SearchOffersFilterVariantId | undefined>('value', { required: false });

function getVariantDisplayText (variant: ISearchOffersFilterVariant, locale: Locale): string | undefined {
  if (!variant.displayText) {
    return '';
  }

  if (isString(variant.displayText)) {
    return variant.displayText;
  } else {
    return getLocalizeableValue(variant.displayText, locale);
  }
}

const options = computed(() => {
  return filterParams.variants?.map(v => {
    return {
      value: v.id,
      label: getVariantDisplayText(v, locale.value as Locale)
    };
  }) ?? [];
});

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<SearchOffersFilterVariantId | undefined>(ctrlKey, {
    persistent: false
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue = (storeValueRef.value as SearchOffersFilterVariantId) ?? undefined;
    const changed = (!!storeValueRef.value !== !!modelValue.value) || !isEqual(storeValueRef.value, modelValue.value);
    if(changed) {
      logger.verbose('updating model value by store value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
      modelValue.value = newValue;  
    }
  }, { immediate: true });

  watch(modelValue, () => {
    logger.debug('model value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    if(!modelValue.value || !isEqual(modelValue.value, storeValueRef.value)) {
      logger.verbose('updating store value by model value change', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
      storeValueRef.value = modelValue.value;
    }
  }, { immediate: false });

  watch(() => filterParams, () => { 
    logger.debug('filter params watcher', { ctrlKey, modelValue: modelValue.value, filterParams });
    if(modelValue.value) {
      const newValuePresent = filterParams.variants ? filterParams.variants!.some(v => v.id === modelValue.value) : false;
      if(!newValuePresent) {
        logger.verbose('model value was reset by filter limits', { ctrlKey, currentModelValue: modelValue.value });
        modelValue.value = undefined;
      }
    }
  });
});

</script>

<template>
  <div class="px-2">
    <URadioGroup
      v-model:model-value="modelValue"
      :options="options"
    />
  </div>
</template>

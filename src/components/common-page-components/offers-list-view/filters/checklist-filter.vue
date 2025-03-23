<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../../helpers/components';
import { getI18nResName3, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import isEqual from 'lodash-es/isEqual';
import type { ISearchOffersChecklistFilterProps, ISearchOffersFilterVariant, SearchOffersFilterVariantId } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersChecklistFilterProps,
  maxCollapsedListItemsCount?: number
}

const { ctrlKey, filterParams, maxCollapsedListItemsCount } = defineProps<IProps>();

const modelValue = defineModel<SearchOffersFilterVariantId[] | undefined>('value');

const logger = getCommonServices().getLogger().addContextProps({ component: 'ChecklistFilter', filterId: filterParams.filterId });
const { locale } = useI18n();
const controlValuesStore = useControlValuesStore();

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

function onVariantToggled (variantId: SearchOffersFilterVariantId) {
  logger.debug('variant toggled', { ctrlKey, variantId, modelValue: modelValue.value });
  const newValue = [...(modelValue.value ?? [])];
  if (newValue.includes(variantId)) {
    newValue.splice(newValue.indexOf(variantId), 1);
  } else {
    newValue.push(variantId);
  }

  modelValue.value = newValue;
}

const variantsToDisplay = computed(() => {
  return (maxCollapsedListItemsCount !== undefined) ? 
  (
    filterParams.variants ? 
      filterParams.variants.slice(0, Math.min(maxCollapsedListItemsCount, filterParams.variants.length)) : 
      []
  )
  : filterParams.variants;
});

const numMoreVariantsToDisplay = computed(() => {
  return (maxCollapsedListItemsCount !== undefined) ? (
    filterParams.variants ? Math.max(0, filterParams.variants.length - maxCollapsedListItemsCount) : 0
  ) : 0;
});

const listExpanded = ref(false);

function toggleList () {
  listExpanded.value = !listExpanded.value;
}

const uiStyling = {
  base: 'text-orange-500 dark:text-orange-400 mb-2 ml-2',
  variant: {
    link: 'hover:no-underline'
  }
};

onMounted(() => {
  logger.debug('acquiring store value ref', { ctrlKey });
  const { valueRef: storeValueRef } = controlValuesStore.acquireValueRef<SearchOffersFilterVariantId[] | undefined>(ctrlKey, {
    persistent: false
  });

  watch(storeValueRef, () => {
    logger.debug('store value watcher', { ctrlKey, modelValue: modelValue.value, storeValue: storeValueRef.value });
    const newValue = (storeValueRef.value as SearchOffersFilterVariantId[]) ?? undefined;
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
      const filteredModelValues = filterParams.variants ? modelValue.value.filter(vId => filterParams.variants!.some(v => v.id === vId)) : [];
      if(modelValue.value.length !== filteredModelValues.length) {
        logger.verbose('model values filtered out by filter limits', { ctrlKey, currentModelValues: modelValue.value, filteredModelValues });
        modelValue.value = filteredModelValues;
      }
    }
  });
});

</script>

<template>
  <div class="px-2">
    <ol class="space-y-2">
      <li v-for="(variant) in (listExpanded ? filterParams.variants : variantsToDisplay)" :key="`${toShortForm(ctrlKey)}-${variant.id}`">
        <UCheckbox
          :model-value="modelValue?.includes(variant.id) ?? false"
          :label="getVariantDisplayText(variant, locale as Locale)"
          :required="false"
          @update:model-value="() => onVariantToggled(variant.id)"
        />
      </li>
    </ol>
    <UButton v-if="numMoreVariantsToDisplay" color="orange" variant="link" :ui="uiStyling" @click="toggleList">
      {{ listExpanded ? 
          $t(getI18nResName3('searchOffers', 'filters', 'checklistCollapseItems')) : 
          $t(getI18nResName3('searchOffers', 'filters', 'checklistMoreItems'), { count: numMoreVariantsToDisplay }) }}
    </UButton>
  </div>
</template>

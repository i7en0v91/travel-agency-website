<script setup lang="ts">
import { toShortForm, type ControlKey, type ArbitraryControlElementMarker } from './../../../../helpers/components';
import { getI18nResName3, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import isEqual from 'lodash-es/isEqual';
import FlowChecklistItem from './flow-checklist-item.vue';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../../helpers/dom';
import { SearchOffersFilterTabGroupId } from './../../../../helpers/constants';
import type { ISearchOffersChecklistFilterProps, ISearchOffersFilterVariant, SearchOffersFilterVariantId } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersChecklistFilterProps,
  maxCollapsedListItemsCount?: number
}

const { ctrlKey, filterParams, maxCollapsedListItemsCount } = defineProps<IProps>();

const { locale } = useI18n();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ChecklistFilter', filterId: filterParams.filterId });
const controlValuesStore = useControlValuesStore();

const modelValue = defineModel<SearchOffersFilterVariantId[] | undefined>('modelValue');

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
  return listExpanded.value ? filterParams.variants :
    (filterParams.variants?.length ?
      (
        (filterParams.display === 'list' && maxCollapsedListItemsCount !== undefined)
        ? filterParams.variants.slice(0, Math.min(maxCollapsedListItemsCount, filterParams.variants.length))
        : filterParams.variants
      ) : []
    );
});

const numMoreVariantsToDisplay = computed(() => {
  return filterParams.variants?.length ?
    (
      (filterParams.display === 'list' && maxCollapsedListItemsCount !== undefined) ? 
        Math.max(0, filterParams.variants.length - maxCollapsedListItemsCount) : 0
    ) : 0;
});

const listExpanded = ref(false);

function toggleList () {
  listExpanded.value = !listExpanded.value;
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

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
  <div class="checklist-filter">
    <ol :class="filterParams.display === 'flow' ? 'flow-checklist' : 'list-checklist'">
      <li v-for="variant in variantsToDisplay" :key="`${toShortForm(ctrlKey)}-${variant.id}`" class="checklist-filter-container">
        <FlowChecklistItem
          v-if="filterParams.display === 'flow'"
          class="m-xs-2"
          :ctrl-key="[...ctrlKey, 'FilterVariant', variant.id as ArbitraryControlElementMarker]"
          :value="modelValue?.includes(variant.id) ?? false"
          :variant="variant"
          @update:value="() => onVariantToggled(variant.id)"
        />
        <CheckBox
          v-else
          :model-value="modelValue?.includes(variant.id) ?? false"
          :ctrl-key="[...ctrlKey, 'FilterVariant', variant.id as ArbitraryControlElementMarker]"
          class="list-checklist-item m-xs-2"
          :tabbable-group-id="SearchOffersFilterTabGroupId"
          :value="true"
          @update:model-value="() => onVariantToggled(variant.id)"
        >
          {{ getVariantDisplayText(variant, locale as Locale) }}
        </CheckBox>
      </li>
    </ol>
    <SimpleButton
      v-if="numMoreVariantsToDisplay"
      class="list-checklist-toggler mb-xs-2 ml-xs-2"
      :ctrl-key="[...ctrlKey, 'Toggler']"
      :label-res-name="listExpanded ? getI18nResName3('searchOffers', 'filters', 'checklistCollapseItems') : getI18nResName3('searchOffers', 'filters', 'checklistMoreItems')"
      :label-res-args="listExpanded ? undefined : numMoreVariantsToDisplay"
      :tabbable-group-id="SearchOffersFilterTabGroupId"
      kind="support"
      @click="toggleList"
    />
  </div>
</template>

<script setup lang="ts">
import { toShortForm, type ControlKey, type ArbitraryControlElementMarker } from './../../../../helpers/components';
import { getI18nResName3, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import FlowChecklistItem from './flow-checklist-item.vue';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../../helpers/dom';
import { SearchOffersFilterTabGroupId } from './../../../../helpers/constants';
import type { ISearchOffersChecklistFilterProps, ISearchOffersFilterVariant, SearchOffersFilterVariantId } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  filterParams: ISearchOffersChecklistFilterProps,
  value: SearchOffersFilterVariantId[],
  maxCollapsedListItemsCount?: number
}

const { ctrlKey, value, filterParams, maxCollapsedListItemsCount } = defineProps<IProps>();

const { locale } = useI18n();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ChecklistFilter' });

const $emit = defineEmits<{(event: 'update:value', value: SearchOffersFilterVariantId[]): void}>();

function fireValueChangeEvent (value: SearchOffersFilterVariantId[]) {
  logger.verbose('firing value change event', { ctrlKey, values: value });
  $emit('update:value', value);
}

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
  const newValue = [...value];
  if (newValue.includes(variantId)) {
    newValue.splice(newValue.indexOf(variantId), 1);
  } else {
    newValue.push(variantId);
  }

  fireValueChangeEvent(newValue);
}

const variantsToDisplay = computed(() => {
  return (filterParams.display === 'list' && maxCollapsedListItemsCount !== undefined)
    ? filterParams.variants.slice(0, Math.min(maxCollapsedListItemsCount, filterParams.variants.length))
    : filterParams.variants;
});

const numMoreVariantsToDisplay = computed(() => {
  return (filterParams.display === 'list' && maxCollapsedListItemsCount !== undefined) ? Math.max(0, filterParams.variants.length - maxCollapsedListItemsCount) : 0;
});

const listExpanded = ref(false);

function toggleList () {
  listExpanded.value = !listExpanded.value;
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

</script>

<template>
  <div class="checklist-filter">
    <ol :class="filterParams.display === 'flow' ? 'flow-checklist' : 'list-checklist'">
      <li v-for="(variant) in (listExpanded ? filterParams.variants : variantsToDisplay)" :key="`${toShortForm(ctrlKey)}-${variant.id}`" class="checklist-filter-container">
        <FlowChecklistItem
          v-if="filterParams.display === 'flow'"
          class="m-xs-2"
          :ctrl-key="[...ctrlKey, 'FilterVariant', variant.id as ArbitraryControlElementMarker]"
          :value="value.includes(variant.id)"
          :variant="variant"
          @update:value="() => onVariantToggled(variant.id)"
        />
        <CheckBox
          v-else
          :model-value="value.includes(variant.id)"
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

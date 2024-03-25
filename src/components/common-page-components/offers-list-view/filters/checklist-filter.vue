<script setup lang="ts">

import isString from 'lodash-es/isString';
import FlowChecklistItem from './flow-checklist-item.vue';
import { getLocalizeableValue } from './../../../../shared/common';
import { type Locale } from './../../../../shared/constants';
import { type ISearchOffersChecklistFilterProps, type ISearchOffersFilterVariant, type SearchOffersFilterVariantId } from './../../../../shared/interfaces';
import { getI18nResName3 } from './../../../../shared/i18n';
import { updateTabIndices } from './../../../../shared/dom';
import { TabIndicesUpdateDefaultTimeout, SearchOffersFilterTabGroupId } from './../../../../shared/constants';

interface IProps {
  ctrlKey: string,
  filterParams: ISearchOffersChecklistFilterProps,
  value: SearchOffersFilterVariantId[],
  maxCollapsedListItemsCount?: number
}

const props = withDefaults(defineProps<IProps>(), {
  maxCollapsedListItemsCount: undefined
});

const { locale } = useI18n();

const logger = CommonServicesLocator.getLogger();

const $emit = defineEmits<{(event: 'update:value', value: SearchOffersFilterVariantId[]): void}>();

function fireValueChangeEvent (value: SearchOffersFilterVariantId[]) {
  logger.verbose(`(ChecklistFilter) firing value change event, ctrlKey=${props.ctrlKey}, values=[${value.join('; ')}]`);
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
  const newValue = [...props.value];
  if (newValue.includes(variantId)) {
    newValue.splice(newValue.indexOf(variantId), 1);
  } else {
    newValue.push(variantId);
  }

  fireValueChangeEvent(newValue);
}

const variantsToDisplay = computed(() => {
  return (props.filterParams.display === 'list' && props.maxCollapsedListItemsCount !== undefined)
    ? props.filterParams.variants.slice(0, Math.min(props.maxCollapsedListItemsCount, props.filterParams.variants.length))
    : props.filterParams.variants;
});

const numMoreVariantsToDisplay = computed(() => {
  return (props.filterParams.display === 'list' && props.maxCollapsedListItemsCount !== undefined) ? Math.max(0, props.filterParams.variants.length - props.maxCollapsedListItemsCount) : 0;
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
      <li v-for="(variant) in (listExpanded ? props.filterParams.variants : variantsToDisplay)" :key="`${ctrlKey}-${variant.id}`" class="checklist-filter-container">
        <FlowChecklistItem
          v-if="filterParams.display === 'flow'"
          class="m-xs-2"
          :ctrl-key="`${ctrlKey}-FlowVariant-${variant.id}`"
          :value="value.includes(variant.id)"
          :variant="variant"
          @update:value="() => onVariantToggled(variant.id)"
        />
        <CheckBox
          v-else
          :model-value="value.includes(variant.id)"
          :ctrl-key="`${ctrlKey}-ListVariant-${variant.id}`"
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
      class="list-checklist-toggler"
      :ctrl-key="`${props.ctrlKey}-ListToggler`"
      :label-res-name="listExpanded ? getI18nResName3('searchOffers', 'filters', 'checklistCollapseItems') : getI18nResName3('searchOffers', 'filters', 'checklistMoreItems')"
      :label-res-args="listExpanded ? undefined : numMoreVariantsToDisplay"
      :tabbable-group-id="SearchOffersFilterTabGroupId"
      kind="support"
      @click="toggleList"
    />
  </div>
</template>

<script setup lang="ts">
import { getI18nResName3, type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import { type ISearchOffersChecklistFilterProps, type ISearchOffersFilterVariant, type SearchOffersFilterVariantId } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  filterParams: ISearchOffersChecklistFilterProps,
  maxCollapsedListItemsCount?: number
}

const props = withDefaults(defineProps<IProps>(), {
  maxCollapsedListItemsCount: undefined
});

const modelValue = defineModel<SearchOffersFilterVariantId[]>('value', { required: true });

const logger = getCommonServices().getLogger();
const { locale } = useI18n();


function fireValueChangeEvent (value: SearchOffersFilterVariantId[]) {
  logger.verbose(`(ChecklistFilter) firing value change event, ctrlKey=${props.ctrlKey}, values=[${value.join('; ')}]`);
  modelValue.value = value;
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
  logger.verbose(`(ChecklistFilter) variant toggled, ctrlKey=${props.ctrlKey}, id=${variantId}, currentValue=[${modelValue.value.join(', ')}]`);
  const newValue = [...modelValue.value];
  if (newValue.includes(variantId)) {
    newValue.splice(newValue.indexOf(variantId), 1);
  } else {
    newValue.push(variantId);
  }

  fireValueChangeEvent(newValue);
}

const variantsToDisplay = computed(() => {
  return (props.maxCollapsedListItemsCount !== undefined)
    ? props.filterParams.variants.slice(0, Math.min(props.maxCollapsedListItemsCount, props.filterParams.variants.length))
    : props.filterParams.variants;
});

const numMoreVariantsToDisplay = computed(() => {
  return (props.maxCollapsedListItemsCount !== undefined) ? Math.max(0, props.filterParams.variants.length - props.maxCollapsedListItemsCount) : 0;
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

</script>

<template>
  <div class="px-2">
    <ol class="space-y-2">
      <li v-for="(variant) in (listExpanded ? props.filterParams.variants : variantsToDisplay)" :key="`${ctrlKey}-${variant.id}`">
        <UCheckbox
          :model-value="modelValue.includes(variant.id)"
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

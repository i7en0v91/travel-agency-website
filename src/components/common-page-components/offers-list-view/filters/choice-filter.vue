<script setup lang="ts">
import { type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import type { ISearchOffersChoiceFilterProps, ISearchOffersFilterVariant, SearchOffersFilterVariantId } from './../../../../types';

interface IProps {
  ctrlKey: string,
  filterParams: ISearchOffersChoiceFilterProps
}

const { filterParams } = defineProps<IProps>();
const modelValue = defineModel<SearchOffersFilterVariantId>('value', { required: false });

const { locale } = useI18n();

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
  return filterParams.variants.map(v => {
    return {
      value: v.id,
      label: getVariantDisplayText(v, locale.value as Locale)
    };
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

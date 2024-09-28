<script setup lang="ts">
import { type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import { SearchOffersFilterTabGroupId } from './../../../../helpers/constants';
import { type ISearchOffersFilterVariant } from './../../../../types';
import { getCommonServices } from '../../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  variant: ISearchOffersFilterVariant,
  value: boolean
}

const props = defineProps<IProps>();

const { locale } = useI18n();

const logger = getCommonServices().getLogger();

const $emit = defineEmits<{(event: 'update:value', value: boolean): void}>();

function fireValueChangeEvent (value: boolean) {
  logger.verbose(`(FlowChecklistItem) firing value change event, ctrlKey=${props.ctrlKey}, value=${value}`);
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

function onToggled () {
  fireValueChangeEvent(!props.value);
}

</script>

<template>
  <div
    :class="`flow-checklist-item btn btn-support ${value ? 'active' : ''} tabbable tabbable-group-${SearchOffersFilterTabGroupId}`"
    role="checkbox"
    :aria-checked="value"
    @keyup.space="onToggled"
    @keyup.enter="onToggled"
    @click="onToggled"
  >
    {{ getVariantDisplayText(variant, locale as Locale) }}
  </div>
</template>

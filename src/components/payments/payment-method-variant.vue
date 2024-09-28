<script setup lang="ts">
import { type PaymentMethodType, type I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  selected: boolean,
  type: PaymentMethodType,
  headerResName: I18nResName,
  textResName: I18nResName,
  textResArgs?: any | null | undefined
};

const props = defineProps<IProps>();
const logger = getCommonServices().getLogger();

const $emit = defineEmits<{(event: 'update:selected', value: boolean): void}>();

function onClicked () {
  logger.debug(`(PaymentMethodVariant) on click, ctrlKey=${props.ctrlKey}, selected=${props.selected}`);
  if (props.selected) {
    return;
  }
  $emit('update:selected', true);
}

</script>

<template>
  <li :class="`payment-method-variant ${$props.selected ? 'selected' : ''} tabbable brdr-3 p-xs-3`" role="radio" @click="onClicked" @keyup.space="onClicked" @keyup.enter="onClicked">
    <div class="payment-method-variant-details">
      <div class="payment-method-variant-header">
        {{ $t(props.headerResName) }}
      </div>
      <div v-if="textResArgs !== undefined" class="payment-method-variant-text mt-xs-2">
        {{ $t(props.textResName, textResArgs ?? undefined) }}
      </div>
      <div v-else class="payment-method-variant-text mt-xs-2 data-loading-stub text-data-loading" />
    </div>
    <div class="payment-method-variant-mark" />
  </li>
</template>

<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { PaymentMethodType, I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  selected: boolean,
  type: PaymentMethodType,
  headerResName: I18nResName,
  textResName: I18nResName,
  textResArgs?: any | null | undefined
};

const { ctrlKey, selected, headerResName, textResName, textResArgs } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'PaymentMethodVariant' });

const $emit = defineEmits<{(event: 'update:selected', value: boolean): void}>();

function onClicked () {
  logger.debug('on click', { ctrlKey, selected });
  if (selected) {
    return;
  }
  $emit('update:selected', true);
}

</script>

<template>
  <li :class="`payment-method-variant ${selected ? 'selected' : ''} tabbable brdr-3 p-xs-3`" role="radio" @click="onClicked" @keyup.space="onClicked" @keyup.enter="onClicked">
    <div class="payment-method-variant-details">
      <div class="payment-method-variant-header">
        {{ $t(headerResName) }}
      </div>
      <div v-if="textResArgs !== undefined" class="payment-method-variant-text mt-xs-2">
        {{ $t(textResName, textResArgs ?? undefined) }}
      </div>
      <div v-else class="payment-method-variant-text mt-xs-2 data-loading-stub text-data-loading" />
    </div>
    <div class="payment-method-variant-mark" />
  </li>
</template>

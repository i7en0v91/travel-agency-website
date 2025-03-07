<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { formatValidThruDate } from '@golobe-demo/shared';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  selected: boolean,
  digits: string,
  dueDate: Date
};

const { ctrlKey, selected } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'PaymentCardVariant' });

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
  <li :class="`payment-card-variant ${selected ? 'selected' : ''} tabbable brdr-3 p-xs-3`" role="radio" @click="onClicked" @keyup.space="onClicked" @keyup.enter="onClicked">
    <div class="payment-card-operator-logo" />
    <div class="payment-card-details">
      <div class="payment-card-details-digits">
        **** {{ digits }}
      </div>
      <div class="payment-card-details-duedate">
        {{ formatValidThruDate(dueDate) }}
      </div>
    </div>
    <div class="payment-card-variant-mark" />
  </li>
</template>

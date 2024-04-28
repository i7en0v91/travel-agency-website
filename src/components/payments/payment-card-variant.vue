<script setup lang="ts">

import { formatValidThruDate } from './../../shared/common';

interface IProps {
  ctrlKey: string,
  selected: boolean,
  digits: string,
  dueDate: Date
};

const props = defineProps<IProps>();
const logger = CommonServicesLocator.getLogger();

const $emit = defineEmits<{(event: 'update:selected', value: boolean): void}>();

function onClicked () {
  logger.debug(`(PaymentMethodCard) on click, ctrlKey=${props.ctrlKey}, selected=${props.selected}`);
  if (props.selected) {
    return;
  }
  $emit('update:selected', true);
}

</script>

<template>
  <li :class="`payment-card-variant ${$props.selected ? 'selected' : ''} tabbable brdr-3 p-xs-3`" role="radio" @click="onClicked" @keyup.space="onClicked" @keyup.enter="onClicked">
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

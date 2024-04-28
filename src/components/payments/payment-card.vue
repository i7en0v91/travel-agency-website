<script setup lang="ts">
import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { getI18nResName1, getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import { formatValidThruDate } from './../../shared/common';

interface IProps {
  ctrlKey: string,
  digits: string,
  dueDate: Date
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

function onRemoveBtnClick () {
  logger.debug(`(PaymentCard) remove btn clicked, ctrlKey=${props.ctrlKey}`);
}

</script>

<template>
  <div class="payment-card p-xs-3">
    <div class="payment-card-header">
      <div class="payment-card-digits">
        <span>**** **** ****</span> <br> <span>{{ digits }}</span>
      </div>
      <VTooltip
        ref="tooltip"
        :distance="6"
        :triggers="['click']"
        placement="bottom"
        class="remove-btn-tooltip-wrapper"
        :flip="false"
        theme="default-tooltip"
        :auto-hide="true"
        no-auto-focus
        @apply-show="scheduleTooltipAutoHide"
      >
      <SimpleButton kind="default" class="payment-card-remove-btn" :ctrl-key="`${ctrlKey}-btnRemove`" icon="delete" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnRemovePaymentCard')" @click="onRemoveBtnClick" />
        <template #popper>
          <div>
            {{ $t(getI18nResName1('notAvailableInDemo')) }}
          </div>
        </template>
      </VTooltip>
    </div>
    <div class="payment-card-footer">
      <div class="payment-card-duedate">
        <span>{{ $t(getI18nResName3('payments', 'cards', 'validThru')) }}</span> <br> <span>{{ formatValidThruDate(dueDate) }}</span>
      </div>
      <div class="payment-card-operator-logo" />
    </div>
  </div>
</template>

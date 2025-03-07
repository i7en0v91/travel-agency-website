<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName1, getI18nResName2, getI18nResName3, formatValidThruDate } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import type { Tooltip } from 'floating-vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  digits: string,
  dueDate: Date
};
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'PaymentCard' });
const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

function onRemoveBtnClick () {
  logger.debug('remove btn clicked', ctrlKey);
}

const tooltipId = useId();

</script>

<template>
  <div class="payment-card p-xs-3">
    <div class="payment-card-header">
      <div class="payment-card-digits">
        <span>**** **** ****</span> <br> <span>{{ digits }}</span>
      </div>
      <VTooltip
        ref="tooltip"
        :aria-id="tooltipId"
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
      <SimpleButton kind="default" class="payment-card-remove-btn" :ctrl-key="[...ctrlKey, 'Btn', 'Delete']" icon="delete" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnRemovePaymentCard')" @click="onRemoveBtnClick" />
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

<script setup lang="ts">
import { getI18nResName1, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import type { Tooltip } from 'floating-vue';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

const tooltipId = useId();

</script>

<template>
  <div class="payment-card-add-new">
    <VTooltip
      ref="tooltip"
      :aria-id="tooltipId"
      :distance="6"
      :triggers="['click']"
      placement="bottom"
      :flip="false"
      theme="default-tooltip"
      :auto-hide="true"
      no-auto-focus
      @apply-show="scheduleTooltipAutoHide"
    >
      <SimpleButton
        :ctrl-key="`${ctrlKey}-AddCardBtn`"
        class="payment-card-add-btn"
        kind="support"
        icon="add-card"
        :aria-label-res-name="getI18nResName2('ariaLabels', 'btnAddPaymentCard')"
        :title-res-name="getI18nResName2('ariaLabels', 'btnAddPaymentCard')"
      />
      <template #popper>
        <div>
          {{ $t(getI18nResName1('notAvailableInDemo')) }}
        </div>
      </template>
    </VTooltip>
    <div class="payment-card-add-label">
      {{ $t(getI18nResName3('payments', 'cards', 'add')) }}
    </div>
  </div>
</template>

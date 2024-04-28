<script setup lang="ts">
import type { Tooltip } from 'floating-vue';
import { TooltipHideTimeout } from './../../shared/constants';
import { getI18nResName1, getI18nResName2, getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

</script>

<template>
  <div class="payment-card-add-new">
    <VTooltip
      ref="tooltip"
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

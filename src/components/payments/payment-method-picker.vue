<script setup lang="ts">
import { type PaymentMethodType, getI18nResName3, getI18nResName1 } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import type { Tooltip } from 'floating-vue';
import PriceMethodVariant from './payment-method-variant.vue';
import dayjs from 'dayjs';

interface IProps {
  ctrlKey: string,
  amount?: number
};

const props = defineProps<IProps>();

const { d, n } = useI18n();

const paymentMethods = computed(() => [
  {
    type: 'full',
    headerResName: getI18nResName3('payments', 'methods', 'fullHeader'),
    textResName: getI18nResName3('payments', 'methods', 'fullText'),
    textResArgs: null
  },
  {
    type: 'part',
    headerResName: getI18nResName3('payments', 'methods', 'partHeader'),
    textResName: getI18nResName3('payments', 'methods', 'partText'),
    textResArgs: props.amount
      ? {
          now: n(Math.floor(props.amount * 0.5), 'currency'),
          rest: n(Math.floor(props.amount * 0.5), 'currency'),
          date: d(dayjs().add(1, 'month').toDate(), 'day')
        }
      : undefined
  }
]);

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();

const selectedPaymentMethod = ref<PaymentMethodType>('full');

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

const tooltipId = useId();

</script>

<template>
  <div class="payment-method-picker brdr-3 p-xs-3">
    <ul class="payment-method-picker-group" role="radiogroup">
      <PriceMethodVariant
        v-for="(item) in paymentMethods"
        :key="`${ctrlKey}-Method-${item.type}`"
        :ctrl-key="`${ctrlKey}-Method-${item.type}`"
        :type="(item.type as PaymentMethodType)"
        :selected="selectedPaymentMethod === item.type"
        :header-res-name="item.headerResName"
        :text-res-name="item.textResName"
        :text-res-args="item.textResArgs"
        @update:selected="() => selectedPaymentMethod = (item.type as PaymentMethodType)"
      />
    </ul>
    <VTooltip
      ref="tooltip"
      :aria-id="tooltipId"
      :distance="6"
      :triggers="['click']"
      placement="bottom-start"
      :flip="false"
      theme="default-tooltip"
      :auto-hide="true"
      no-auto-focus
      @apply-show="scheduleTooltipAutoHide"
    >
      <SimpleButton
        class="payment-method-moreinfo-btn mt-xs-3"
        :ctrl-key="`${props.ctrlKey}-MoreInfoBtn`"
        :label-res-name="getI18nResName3('payments', 'methods', 'moreInfo')"
        kind="support"
      />
      <template #popper>
        <div>
          {{ $t(getI18nResName1('notAvailableInDemo')) }}
        </div>
      </template>
    </VTooltip>
  </div>
</template>

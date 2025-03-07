<script setup lang="ts">
import { toShortForm, type ArbitraryControlElementMarker, type ControlKey } from './../../helpers/components';
import { type PaymentMethodType, getI18nResName3, getI18nResName1 } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';
import PriceMethodVariant from './payment-method-variant.vue';
import dayjs from 'dayjs';

interface IProps {
  ctrlKey: ControlKey,
  amount?: number
};

const { ctrlKey, amount } = defineProps<IProps>();

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
    textResArgs: amount
      ? {
          now: n(Math.floor(amount * 0.5), 'currency'),
          rest: n(Math.floor(amount * 0.5), 'currency'),
          date: d(dayjs().add(1, 'month').toDate(), 'day')
        }
      : undefined
  }
]);

const selectedPaymentMethod = ref<PaymentMethodType>('full');

const tooltipShown = ref(false);
function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltipShown.value = false; }, TooltipHideTimeout);
}


const options = computed(() => {
  return paymentMethods.value.map(v => {
    return {
      value: v.type,
      props: v
    };
  });
});

const uiStyling = {
  wrapper: 'cursor-pointer flex-row-reverse items-center pr-3 rounded-xl [&:has(input:checked)]:bg-primary-100 [&:has(input:checked)]:dark:bg-primary-800',
  inner: 'w-full ms-3',
  base: 'cursor-pointer'
};

</script>

<template>
  <div class="w-full h-auto p-4 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-gray-700">
    <URadioGroup
      v-model:model-value="selectedPaymentMethod"
      :options="options"
      :ui="{ wrapper: '*:w-full' }"
      :ui-radio="uiStyling"
    >
      <template #label="{ option: item, selected }">
        <PriceMethodVariant
          :key="`${toShortForm(ctrlKey)}-Method-${item.props.type}`"
          :ctrl-key="[...ctrlKey, 'PaymentMethod', item.type as ArbitraryControlElementMarker]"
          :type="(item.props.type as PaymentMethodType)"
          :selected="selected"
          :header-res-name="item.props.headerResName"
          :text-res-name="item.props.textResName"
          :text-res-args="item.props.textResArgs"
        />
      </template>
    </URadioGroup>
    <UPopover v-model:open="tooltipShown" :popper="{ placement: 'bottom-start' }" class="mt-4" :ui="{ wrapper: 'w-fit' }">
      <UButton size="2xs" variant="link" color="gray" class="ml-1" @click="scheduleTooltipAutoHide">
        <span class="text-gray-500 dark:text-gray-400 underline">{{ $t(getI18nResName3('payments', 'methods', 'moreInfo')) }}</span>
      </UButton>
      <template #panel="{ close }">
        <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
      </template>
    </UPopover>  
  </div>
</template>

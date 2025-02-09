<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import PaymentMethodPicker from './payment-method-picker.vue';
import LoginForPay from './login-for-pay.vue';
import PaymentCardPicker from './payment-card-picker.vue';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  amount?: number,
  paymentProcessing?: boolean
};
const { ctrlKey, paymentProcessing = false } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const { status } = useAuth();
const $emit = defineEmits<{(event: 'pay'): void}>();

function onPayBtnClick () {
  logger.debug(`(PaymentController) payment btn clicked, ctrlKey=${ctrlKey}`);
  $emit('pay');
}

</script>

<template>
  <section class="w-full h-auto">
    <div class="w-full h-auto">
      <PaymentMethodPicker :ctrl-key="`${ctrlKey}-PaymentMethod`" :amount="amount" />
    </div>
    <div v-if="status !== 'authenticated'" class="mt-4 lg:mt-6">
      <LoginForPay :ctrl-key="`${ctrlKey}-LoginForPay`" />
    </div>
    <div v-if="status === 'authenticated'" class="mt-4 lg:mt-6">
      <PaymentCardPicker :ctrl-key="`${ctrlKey}-CardPicker`" />
    </div>
    <UButton
      v-if="status === 'authenticated' && !paymentProcessing"
      size="md"
      color="primary"
      variant="solid"
      :ui="{ base: 'w-full justify-center mt-8 lg:mt-10' }"
      @click="onPayBtnClick"
    >
      {{  $t(getI18nResName2('payments', 'payBtn')) }}
    </UButton>
    <ComponentWaitingIndicator v-else-if="paymentProcessing" :ctrl-key="`${ctrlKey}-WaitingIndicator`" class="mt-8 lg:mt-10" />
  </section>
</template>

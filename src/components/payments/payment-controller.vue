<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import PaymentMethodPicker from './payment-method-picker.vue';
import LoginForPay from './login-for-pay.vue';
import PaymentCardPicker from './payment-card-picker.vue';
import ComponentWaitingIndicator from './../../components/component-waiting-indicator.vue';
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
  <section class="payment-controller">
    <div class="payment-method-div">
      <PaymentMethodPicker :ctrl-key="`${ctrlKey}-PaymentMethod`" :amount="amount" />
    </div>
    <div v-if="status !== 'authenticated'" class="login-for-pay-div">
      <LoginForPay :ctrl-key="`${ctrlKey}-LoginForPay`" />
    </div>
    <div v-if="status === 'authenticated'" class="payment-card-picker-div">
      <PaymentCardPicker :ctrl-key="`${ctrlKey}-CardPicker`" />
    </div>
    <SimpleButton
      v-if="status === 'authenticated' && !paymentProcessing"
      :ctrl-key="`${ctrlKey}-PayBtn`"
      class="pay-btn"
      kind="accent"
      :label-res-name="getI18nResName2('payments', 'payBtn')"
      @click="onPayBtnClick"
    />
    <ComponentWaitingIndicator v-else-if="paymentProcessing" :ctrl-key="`${ctrlKey}-WaitingIndicator`" class="payment-processing-waiting-indicator" />
  </section>
</template>

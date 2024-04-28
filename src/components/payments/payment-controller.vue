<script setup lang="ts">
import PaymentMethodPicker from './payment-method-picker.vue';
import LoginForPay from './login-for-pay.vue';
import PaymentCardPicker from './payment-card-picker.vue';
import { getI18nResName2 } from './../../shared/i18n';
import ComponentWaitingIndicator from './../../components/component-waiting-indicator.vue';

interface IProps {
  ctrlKey: string,
  amount?: number,
  paymentProcessing?: boolean
};
const props = withDefaults(defineProps<IProps>(), {
  amount: undefined,
  paymentProcessing: false
});

const logger = CommonServicesLocator.getLogger();

const { status } = useAuth();

const $emit = defineEmits<{(event: 'pay'): void}>();

function onPayBtnClick () {
  logger.debug(`(PaymentController) payment btn clicked, ctrlKey=${props.ctrlKey}`);
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

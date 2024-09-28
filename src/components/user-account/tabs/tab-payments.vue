<script setup lang="ts">
import { getI18nResName3 } from '@golobe-demo/shared';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import PaymentCard from './../../payments/payment-card.vue';
import AddNewCard from './../../payments/add-new-card.vue';
import dayjs from 'dayjs';

interface IProps {
  ctrlKey: string,
  ready: boolean
}
defineProps<IProps>();

const isError = ref(false);

const $emit = defineEmits(['update:ready']);

onMounted(() => {
  $emit('update:ready', true);
});

const paymentCards = [
  {
    id: 1,
    digits: '4321',
    dueDate: dayjs().add(3, 'year').toDate()
  }
];

</script>

<template>
  <div class="account-tab-container" role="form">
    <h2 class="account-page-tab-name mb-xs-2 mb-s-3 font-h3">
      {{ $t(getI18nResName3('accountPage', 'tabPayments', 'title')) }}
    </h2>
    <div class="account-tab-payments px-xs-3 px-s-4 pt-xs-3 pt-s-4 pb-xs-2 pb-s-3 brdr-3" role="form">
      <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
        <div class="tab-payments-container">
          <PerfectScrollbar
            :options="{
              suppressScrollY: true,
              wheelPropagation: true
            }"
            :watch-options="false"
            class="pb-xs-3 pb-l-0"
            tag="div"
          >
            <div class="payment-cards-grid">
              <PaymentCard v-for="(card, idx) in paymentCards" :key="`PaymentCard-${idx}`" :ctrl-key="`${$props.ctrlKey}-PaymentCard-${idx}`" :digits="card.digits" :due-date="card.dueDate"/>
              <AddNewCard :ctrl-key="`${$props.ctrlKey}-AddNewCard`" class="add-new-card"/>
            </div>
          </PerfectScrollbar>
        </div>  
      </ErrorHelm>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  <div class="w-full h-full">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'">
      <div class="overflow-x-auto pb-4 tab-payments-container">
        <div class="w-full h-auto grid gap-6 grid-flow-row auto-rows-auto grid-cols-1 sm:grid-cols-paymentcards items-center sm:items-start payment-cards-grid">
          <PaymentCard v-for="(card, idx) in paymentCards" :key="`PaymentCard-${idx}`" :ctrl-key="`${$props.ctrlKey}-PaymentCard-${idx}`" :digits="card.digits" :due-date="card.dueDate"/>
          <AddNewCard :ctrl-key="`${$props.ctrlKey}-AddNewCard`" class="add-new-card"/>
        </div>
      </div>  
    </ErrorHelm>
  </div>
</template>

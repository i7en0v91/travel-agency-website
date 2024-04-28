<script setup lang="ts">
import dayjs from 'dayjs';
import PaymentCardVariant from './payment-card-variant.vue';
import AddNewCard from './add-new-card.vue';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const paymentCards = [
  {
    id: 1,
    digits: '4321',
    dueDate: dayjs().add(3, 'year').toDate()
  }
];

const selectedCardId = ref<number>(paymentCards[0].id);

</script>

<template>
  <div class="payment-card-picker brdr-3 p-xs-3">
    <ul class="payment-card-group" role="radiogroup">
      <PaymentCardVariant
        v-for="(card) in paymentCards"
        :key="`${ctrlKey}-Card-${card.id}`"
        :ctrl-key="`${ctrlKey}-Card-${card.id}`"
        :selected="selectedCardId === card.id"
        :digits="card.digits"
        :due-date="card.dueDate"
        @update:selected="() => selectedCardId = card.id"
      />
    </ul>
    <AddNewCard :ctrl-key="`${ctrlKey}-AddNewCard`" class="payment-card-add-container mt-xs-3"/>
  </div>
</template>

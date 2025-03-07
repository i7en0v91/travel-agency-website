<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import dayjs from 'dayjs';
import PaymentCardVariant from './payment-card-variant.vue';
import AddNewCard from './add-new-card.vue';

interface IProps {
  ctrlKey: ControlKey
};
defineProps<IProps>();

const paymentCards = [
  {
    id: 1,
    digits: '4321',
    dueDate: dayjs().add(3, 'year').toDate()
  }
];

const options = computed(() => {
  return paymentCards.map(v => {
    return {
      value: v.id.toString(),
      props: v
    };
  });
});

const selectedCardId = ref<string>(paymentCards[0].id.toString());

const uiStyling = {
  wrapper: 'cursor-pointer flex-row-reverse items-center pr-3 rounded-xl [&:has(input:checked)]:bg-primary-100 [&:has(input:checked)]:dark:bg-primary-800',
  inner: 'w-full ms-3',
  base: 'cursor-pointer'
};

</script>

<template>
  <div class="w-full h-auto p-4 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-gray-700">
    <URadioGroup
      v-model:model-value="selectedCardId"
      :options="options"
      :ui="{ wrapper: '*:w-full *:max-w-[90vw]' }"
      :ui-radio="uiStyling"
    >
      <template #label="{ option: item, selected }">
        <PaymentCardVariant
          :key="`${toShortForm(ctrlKey)}-Card-${item.props.id}`"
          :ctrl-key="[...ctrlKey, 'Card', item.props.id]"
          :selected="selected"
          :digits="item.props.digits"
          :due-date="item.props.dueDate"
          class="max-w-[90vw]"
        />
      </template>
    </URadioGroup>
    <AddNewCard :ctrl-key="[...ctrlKey, 'Card', 'Add']" class="mt-4 h-48 max-w-[90vw]"/>
  </div>
</template>

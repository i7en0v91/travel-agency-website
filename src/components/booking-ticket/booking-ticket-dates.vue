<script setup lang="ts">
import { type IBookingTicketDatesProps } from './../../types';
import BookingTicketDateItem from './booking-ticket-date-item.vue';
import FlightTransition from '~/public/img/ticket-flight-transition.svg';
import StayTransition from '~/public/img/ticket-stay-transition.svg';

withDefaults(defineProps<IBookingTicketDatesProps>(), {
  from: undefined,
  to: undefined,
  offerKind: undefined
});

</script>

<template>
  <div class="w-full h-full flex flex-col flex-nowrap justify-center px-4 sm:px-6 py-4 sm:rounded-tl-3xl sm:rounded-bl-3xl bg-primary-100 dark:bg-gray-700 booking-ticket-dates-container">
    <div class="block w-min sm:w-auto h-auto mx-auto sm:mx-0 booking-ticket-dates">
      <BookingTicketDateItem class="booking-ticket-date-from" :ctrl-key="`${ctrlKey}-From`" :label="from?.label" :sub="from?.sub" />
      <div class="block w-fit h-auto my-4 mx-auto sm:mx-0 [&_*]:!fill-primary-900 [&_*]:dark:!fill-gray-100 [&_*]:dark:!stroke-gray-100">
        <FlightTransition v-if="offerKind === 'flights'" class="!w-[40px] !h-auto" />
        <StayTransition v-if="offerKind === 'stays'" class="!w-[40px] !h-auto"/>
      </div>
      <BookingTicketDateItem class="booking-ticket-date-to" :ctrl-key="`${ctrlKey}-To`" :label="to?.label" :sub="to?.sub" />
    </div>
  </div>
</template>

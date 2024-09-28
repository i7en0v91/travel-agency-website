<script setup lang="ts">
import { type IBookingTicketDatesProps } from './../../types';
import BookingTicketDateItem from './booking-ticket-date-item.vue';

withDefaults(defineProps<IBookingTicketDatesProps>(), {
  from: undefined,
  to: undefined,
  offerKind: undefined
});

</script>

<template>
  <div class="booking-ticket-dates-container">
    <div class="booking-ticket-dates pl-xs-3 pl-s-4 my-xs-3 my-m-0">
      <BookingTicketDateItem class="booking-ticket-date-from" :ctrl-key="`${ctrlKey}-From`" :label="from?.label" :sub="from?.sub" />
      <div :class="`booking-ticket-dates-image my-xs-3 ${ offerKind ? (offerKind === 'flights' ? 'booking-flight-ticket-image' : 'booking-stay-ticket-image') : '' }`" :style="!offerKind ? { visibility: 'hidden' } : undefined" />
      <BookingTicketDateItem class="booking-ticket-date-to" :ctrl-key="`${ctrlKey}-To`" :label="to?.label" :sub="to?.sub" />
    </div>
  </div>
</template>

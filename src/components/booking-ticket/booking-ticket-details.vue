<script setup lang="ts">
import type { IBookingTicketDetailsProps } from './../../types';
import { toShortForm } from './../../helpers/components';
import BookingTicketDetailsItem from './booking-ticket-details-item.vue';

defineProps<IBookingTicketDetailsProps>();

</script>

<template>
  <div class="w-full h-auto">
    <ul class="w-auto h-auto grid auto-rows-auto grid-cols-ticketdetails items-center gap-4">
      <BookingTicketDetailsItem
        v-for="(item, idx) in items"
        :key="`${toShortForm(ctrlKey)}-${idx}`"
        :ctrl-key="[...ctrlKey, idx]"
        :caption="item.caption"
        :text="item.text"
        :icon="item.icon"
      />
    </ul>
  </div>
</template>

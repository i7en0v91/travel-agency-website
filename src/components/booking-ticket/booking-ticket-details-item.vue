<script setup lang="ts">
import { type IBookingTicketDetailsItemProps } from './../../types';

withDefaults(defineProps<IBookingTicketDetailsItemProps>(), {
  text: undefined
});

</script>

<template>
  <li class="booking-ticket-details-item mt-xs-4">
    <div class="ticket-details-item-icon-container brdr-1">
      <div :class="`ticket-details-item-icon ticket-icon-${icon}`" />
    </div>
    <div class="ticket-details-item-texting ml-xs-2">
      <div class="ticket-details-item-caption">
        {{ $t(caption) }}
      </div>
      <div v-if="text" class="ticket-details-item-text">
        {{ text }}
      </div>
      <div v-else class="ticket-details-item-text data-loading-stub text-data-loading" />
    </div>
  </li>
</template>

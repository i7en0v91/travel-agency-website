<script setup lang="ts">
import TicketBarcode from '~/public/img/ticket-barcode.svg';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

</script>

<template>
  <div class="block w-full h-auto booking-ticket-codes-container">
    <div class="px-6 w-full h-auto booking-ticket-codes">
      <div class="ml-4 inline w-auto h-auto booking-ticket-codes-texting">
        <div class="block text-nowrap text-3xl font-semibold text-primary-900 dark:text-white booking-ticket-codes-ek">
          EK
        </div>
        <div class="mt-1 block text-xs text-gray-500 dark:text-gray-300 text-nowrap booking-ticket-codes-sub">
          ABC12345
        </div>
      </div>
      <div class="mt-4 block h-auto float-right booking-ticket-codes-image">
        <TicketBarcode class="!w-[calc(min(80%,330px))] !aspect-barcode !h-auto float-right" />
      </div>
    </div>
  </div>
</template>

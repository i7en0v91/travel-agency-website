<script setup lang="ts">
import TicketBarcode from '~/public/img/ticket-barcode.svg';
import type { ControlKey } from './../../helpers/components';

interface IProps {
  ctrlKey: ControlKey
};
defineProps<IProps>();

</script>

<template>
  <div class="block w-full h-auto">
    <div class="px-6 w-full h-auto">
      <div class="ml-4 inline w-auto h-auto">
        <div class="block text-nowrap text-3xl font-semibold text-primary-900 dark:text-white">
          EK
        </div>
        <div class="mt-1 block text-xs text-gray-500 dark:text-gray-300 text-nowrap">
          ABC12345
        </div>
      </div>
      <div class="mt-4 block h-auto float-right">
        <TicketBarcode class="!w-[calc(min(80%,330px))] !aspect-barcode !h-auto float-right" />
      </div>
    </div>
  </div>
</template>

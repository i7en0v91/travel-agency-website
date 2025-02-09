<script setup lang="ts">
import type { IBookingTicketDetailsItemProps } from './../../types';

defineProps<IBookingTicketDetailsItemProps>();

</script>

<template>
  <li class="mt-6 w-auto h-auto flex flex-row flex-nowrap gap-1 items-start">
    <div class="p-2 inline-flex w-auto h-auto rounded-md bg-gray-100 dark:bg-primary-700">
      <UIcon :name="icon" class="w-5 h-5 bg-primary-300 dark:bg-white"/>
    </div>
    <div class="ml-2 align-middle w-auto h-max">
      <div class="text-primary-900 dark:text-white text-sm font-semibold whitespace-normal break-words">
        {{ $t(caption) }}
      </div>
      <div v-if="text" class="text-gray-500 dark:text-gray-300 text-xs font-normal whitespace-normal break-words">
        {{ text }}
      </div>
      <USkeleton v-else class="w-8 h-4 mt-1" />
    </div>
  </li>
</template>

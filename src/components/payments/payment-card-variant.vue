<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { formatValidThruDate } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  selected: boolean,
  digits: string,
  dueDate: Date
};

defineProps<IProps>();

</script>

<template>
  <div class="cursor-pointer w-full h-auto flex flex-row flex-wrap items-center justify-start gap-2 p-4 pl-0 bg-transparent dark:bg-transparent rounded-xl">
    <UIcon name="i-cib-cc-visa" class="flex-initial w-8 h-8 text-gray-950 dark:text-white mr-5"/>
    <div class="flex-initial">
      <span class="text-3xl font-semibold whitespace-normal">**** **** ****</span> 
      &nbsp;
      <span class="text-2xl font-semibold whitespace-nowrap">{{ digits }}</span>
    </div>
    <div class="flex-initial font-normal text-sm sm:text-base text-gray-600 dark:text-gray-300">{{ formatValidThruDate(dueDate) }}</div>
  </div>
</template>

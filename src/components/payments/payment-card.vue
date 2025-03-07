<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName1, getI18nResName3, formatValidThruDate } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';

interface IProps {
  ctrlKey: ControlKey,
  digits: string,
  dueDate: Date
};
defineProps<IProps>();

const tooltipShown = ref(false);
function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltipShown.value = false; }, TooltipHideTimeout);
}

</script>

<template>
  <div class="w-full h-auto overflow-hidden min-h-56 flex flex-col flex-nowrap gap-4 p-4 shadow-md shadow-gray-200 dark:shadow-gray-700 rounded-2xl bg-primary-200 dark:bg-primary-700">
    <div class="w-full h-auto self-start">
      <div class="w-min inline-block">
        <span class="text-3xl font-semibold whitespace-nowrap">**** **** ****</span> 
        <br> 
        <span class="text-2xl font-semibold whitespace-nowrap">{{ digits }}</span>
      </div>
      <UPopover v-model:open="tooltipShown" :popper="{ placement: 'bottom' }" class="inline-block float-right">
        <UIcon name="i-heroicons-trash" class="w-6 h-6 text-gray-950 dark:text-white float-right" @click="scheduleTooltipAutoHide"/>
        <template #panel="{ close }">
          <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
        </template>
      </UPopover>  
    </div>
    <div class="w-full h-auto mt-auto">
      <div class="w-min inline self-end">
        <span class="whitespace-nowrap text-xs">{{ $t(getI18nResName3('payments', 'cards', 'validThru')) }}</span> 
        <br> 
        <span class="text-xl font-semibold">{{ formatValidThruDate(dueDate) }}</span>
      </div>
      <UIcon name="i-cib-cc-visa" class="w-8 h-8 text-gray-950 dark:text-white float-right"/>
    </div>
  </div>
</template>

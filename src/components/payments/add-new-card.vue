<script setup lang="ts">
import { getI18nResName1 } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../helpers/constants';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const tooltipShown = ref(false);
function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltipShown.value = false; }, TooltipHideTimeout);
}

</script>

<template>
  <div class="w-full h-full overflow-hidden min-h-56 flex flex-col flex-nowrap items-center justify-center gap-4 p-4 border-4 border-primary-300 dark:border-primary-500 border-dashed rounded-2xl bg-transparent dark:bg-transparent">  
    <UPopover v-model:open="tooltipShown" :popper="{ placement: 'bottom' }" class="w-min">
      <UIcon name="i-material-symbols-light-add-circle-outline-rounded" class="w-16 h-16 text-primary-300 dark:text-primary-500" @click="scheduleTooltipAutoHide"/>
      <template #panel="{ close }">
        <span class="p-2 block" @click="close">{{ $t(getI18nResName1('notAvailableInDemo')) }}</span>
      </template>
    </UPopover>  
  </div>
</template>

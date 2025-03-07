<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey
  labelResName?: I18nResName
}

defineProps<IProps>();

const open = defineModel<boolean>('open');
const uiStyling = { 
  overlay: {
    background: 'bg-gray-200/90 dark:bg-gray-800/90'
  },
  background: 'bg-transparent dark:bg-transparent'
};

</script>

<template>
  <UModal v-model="open" fullscreen prevent-close :ui="uiStyling">
    <div class="w-full h-full flex flex-col gap-4 flex-nowrap items-center justify-center overflow-hidden">
      <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'Waiter']" ui="w-32 h-32"/>
      <div v-if="labelResName" class="whitespace-normal text-center">
        {{ $t(labelResName) }}
      </div>
    </div>
  </UModal>
</template>

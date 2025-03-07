<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

interface IProps {
  ctrlKey: ControlKey,
  ui?: string
}
const { ui = '' } = defineProps<IProps>();

</script>

<template>
  <div class="flex flex-row flex-nowrap justify-center w-full h-auto">
    <UIcon name="i-mdi-loading" :class="`w-16 h-16 animate-spin text-gray-400 dark:text-gray-500 ${ui ?? ''}`"/>
  </div>
</template>

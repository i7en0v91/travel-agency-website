<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <div class="w-full h-auto grid grid-flow-row auto-rows-auto gap-x-4 gap-y-6 sm:gap-y-8 grid-cols-propertygrid">
    <slot />
  </div>
</template>

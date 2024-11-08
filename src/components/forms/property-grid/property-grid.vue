<script setup lang="ts">

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <div class="w-full h-auto grid grid-flow-row auto-rows-auto gap-x-4 gap-y-6 sm:gap-y-8 grid-cols-propertygrid">
    <slot />
  </div>
</template>

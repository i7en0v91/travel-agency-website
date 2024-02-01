<script setup lang="ts">

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <table class="property-grid">
    <slot />
  </table>
</template>

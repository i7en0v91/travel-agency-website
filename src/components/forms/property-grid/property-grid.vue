<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <table class="property-grid">
    <slot />
  </table>
</template>

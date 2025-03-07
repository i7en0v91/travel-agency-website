<script setup lang="ts">
import type { ControlKey } from './../helpers/components';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <div class="component-waiting-indicator">
    <img class="waiting-indicator-image" src="/img/waiter.gif">
  </div>
</template>

<script setup lang="ts">

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <div class="component-waiting-indicator">
    <img class="waiting-indicator-image" src="/img/waiter.gif">
  </div>
</template>

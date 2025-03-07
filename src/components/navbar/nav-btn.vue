<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <div class="nav-item">
    <div class="nav-btn" />
  </div>
</template>

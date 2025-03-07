<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  icon: string,
  url: string,
  ariaLabelResName: I18nResName
}
defineProps<IProps>();

</script>

<template>
  <li class="footer-social-link">
    <NuxtLink :class="`tabbable tabbable-group-footer-main-section footer-social-icon footer-social-icon-${icon} brdr-1`" :aria-label="$t(ariaLabelResName)" :to="url" target="_blank" />
  </li>
</template>

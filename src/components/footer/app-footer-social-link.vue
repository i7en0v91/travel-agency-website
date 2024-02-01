<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
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

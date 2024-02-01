<script setup lang="ts">

import { type NavBarMode } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';

const localePath = useLocalePath();

interface IProps {
  ctrlKey: string,
  mode: NavBarMode
}
const props = defineProps<IProps>();

const logoCssClass = computed(() => {
  return ` nav-logo ${props.mode === 'landing' ? 'nav-logo-light' : ''} brdr-1`;
});

</script>

<template>
  <div class="nav-item nav-logo-list-item mt-xs-2 mt-l-0">
    <NuxtLink :class="logoCssClass" :to="localePath('/')" :aria-label="$t(getI18nResName2('ariaLabels', 'imgLinkMainPage'))" />
  </div>
</template>

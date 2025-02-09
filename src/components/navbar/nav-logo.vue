<script setup lang="ts">
import { AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import type { NavBarMode } from './../../types';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

interface IProps {
  ctrlKey: string,
  mode: NavBarMode
}
const { mode } = defineProps<IProps>();

const logoCssClass = computed(() => {
  return ` nav-logo ${mode === 'landing' ? 'nav-logo-light' : ''} brdr-1`;
});

</script>

<template>
  <div class="nav-item nav-logo-list-item mt-xs-2">
    <NuxtLink :class="logoCssClass" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :aria-label="$t(getI18nResName2('ariaLabels', 'imgLinkMainPage'))" />
  </div>
</template>

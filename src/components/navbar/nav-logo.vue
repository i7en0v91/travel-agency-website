<script setup lang="ts">

import { type NavBarMode } from './../../shared/interfaces';
import { getI18nResName2 } from './../../shared/i18n';
import { type Locale } from './../../shared/constants';
import { AppPage } from './../../shared/page-query-params';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

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
  <div class="nav-item nav-logo-list-item mt-xs-2">
    <NuxtLink :class="logoCssClass" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :aria-label="$t(getI18nResName2('ariaLabels', 'imgLinkMainPage'))" />
  </div>
</template>

<script setup lang="ts">
import { AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { useThemeSettings } from '../../composables/theme-settings';
import NavLogoLight from '~/public/img/logo-light.svg';
import NavLogoDark from '~/public/img/logo-dark.svg';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { currentTheme: theme } = useThemeSettings();

interface IProps {
  ctrlKey: string
}
const props = defineProps<IProps>();

</script>

<template>
  <ULink class="lg:absolute lg:ml-[50vw] lg:-translate-x-1/2 lg:left-[-24px] xl:left-[-64px] translate-y-1 lg:-translate-y-1/3 focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
    <component :is="theme === 'light' ? NavLogoDark : NavLogoLight" class="!w-[110px] !h-auto" filled />    
  </ULink>
</template>

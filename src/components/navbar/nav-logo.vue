<script setup lang="ts">
import { AppPage, type Locale } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import NavLogoLight from '~/public/img/logo-light.svg';
import NavLogoDark from '~/public/img/logo-dark.svg';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <ULink class="lg:absolute lg:translate-x-[50vw] lg:left-[-79px] xl:left-[-119px] translate-y-1 lg:-translate-y-1/3 focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
    <NavLogoDark class="!w-[110px] !h-auto dark:hidden" filled />
    <NavLogoLight class="!w-[110px] !h-auto hidden dark:block" filled />
  </ULink>
</template>

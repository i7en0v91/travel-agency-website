<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppPage, type Locale } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import NavLogoLight from '~/public/img/logo-light.svg';
import NavLogoDark from '~/public/img/logo-dark.svg';
import { LocatorClasses } from '../../helpers/constants';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

interface IProps {
  ctrlKey: ControlKey,
  hardLink: boolean
}
defineProps<IProps>();

</script>

<template>
  <ULink :class="`focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400 ${LocatorClasses.NavLogo}`" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="hardLink">
    <NavLogoDark class="!w-[110px] group-[.account-page-group]:!w-28 sm:!w-28 !h-auto dark:hidden" filled />
    <NavLogoLight class="!w-[110px] group-[.account-page-group]:!w-28 sm:!w-28 !h-auto hidden dark:block" filled />
  </ULink>
</template>

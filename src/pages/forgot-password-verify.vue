<script setup lang="ts">
import { AppConfig, getPagePath, AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordVerifyPage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <div class="forgot-password-verify-page account-page no-hidden-parent-tabulation-check">
    <div class="forgot-password-verify-page-div">
      <NavLogo ctrl-key="forgotPasswordVerifyPageAppLogo" class="forgot-password-verify-page-logo" mode="inApp" />
      <div class="forgot-password-verify-page-content">
        {{ $t(getI18nResName2('forgotPasswordVerifyPage', 'text'), { tokenExpirationHours: AppConfig.verificationTokenExpirationHours }) }}
        <NuxtLink class="btn btn-forgot-password-verify-home mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
          {{ $t(getI18nResName2('accountPageCommon', 'backToHome')) }}
        </NuxtLink>
      </div>
    </div>
    <AccountFormPhotos ctrl-key="ForgotPasswordVerifyPhotos" class="forgot-password-verify-account-forms-photos" />
  </div>
</template>

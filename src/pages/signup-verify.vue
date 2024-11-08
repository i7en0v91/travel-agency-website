<script setup lang="ts">
import { type Locale, getPagePath, AppPage, AppConfig, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import AccountFormPhotos from './../components/account/form-photos.vue';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('signUpVerifyPage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <div class="signup-verify-page account-page no-hidden-parent-tabulation-check">
    <!--
    <AccountFormPhotos ctrl-key="SignUpVerifyPhotos" class="signup-verify-account-forms-photos" />
    <div class="signup-verify-page-div">
      <NavLogo ctrl-key="signupVerifyPageAppLogo" class="signup-verify-page-logo" mode="inApp" />
      <div class="signup-verify-page-content">
        {{ $t(getI18nResName2('signUpVerifyPage', 'text'), { tokenExpirationHours: AppConfig.verificationTokenExpirationHours }) }}
        <NuxtLink class="btn btn-signup-verify-home mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
          {{ $t(getI18nResName2('accountPageCommon', 'backToHome')) }}
        </NuxtLink>
      </div>
    </div>
    -->
    PAGE CONTENT
  </div>
</template>

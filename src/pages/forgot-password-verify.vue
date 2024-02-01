<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import AccountFormPhotos from './../components/account/form-photos.vue';
import AppConfig from './../appconfig';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: getI18nResName2('forgotPasswordVerifyPage', 'title')
});

const localePath = useLocalePath();

</script>

<template>
  <div class="forgot-password-verify-page account-page no-hidden-parent-tabulation-check">
    <div class="forgot-password-verify-page-div">
      <NavLogo ctrl-key="forgotPasswordVerifyPageAppLogo" class="forgot-password-verify-page-logo" mode="inApp" />
      <div class="forgot-password-verify-page-content">
        {{ $t(getI18nResName2('forgotPasswordVerifyPage', 'text'), { tokenExpirationHours: AppConfig.verificationTokenExpirationHours }) }}
        <NuxtLink class="btn btn-forgot-password-verify-home mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath('/')">
          {{ $t(getI18nResName2('accountPageCommon', 'backToHome')) }}
        </NuxtLink>
      </div>
    </div>
    <AccountFormPhotos ctrl-key="ForgotPasswordVerifyPhotos" class="forgot-password-verify-account-forms-photos" />
  </div>
</template>

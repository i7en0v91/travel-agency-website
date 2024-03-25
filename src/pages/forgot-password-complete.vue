<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { RecoverPasswordCompleteResultCode } from './../server/dto';
import { PagePath } from './../shared/constants';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: { resName: getI18nResName2('forgotPasswordCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const localePath = useLocalePath();

const logger = CommonServicesLocator.getLogger();
const completionResult = ref(RecoverPasswordCompleteResultCode.LINK_INVALID);
const route = useRoute();
const resultParam = route.query.result?.toString();
if (resultParam) {
  const resultCode = Object.keys(RecoverPasswordCompleteResultCode).find(e => e.toLowerCase() === resultParam.toLowerCase()) as RecoverPasswordCompleteResultCode;
  if (resultCode) {
    completionResult.value = resultCode;
  } else {
    logger.warn(`(forgot-password-complete) unexpected result: ${resultParam}`);
  }
} else {
  logger.warn('(forgot-password-complete) result is empty');
}

</script>

<template>
  <div class="complete-password-page account-page no-hidden-parent-tabulation-check">
    <AccountFormPhotos ctrl-key="CompletePasswordPhotos" class="complete-password-account-forms-photos" />
    <div class="complete-password-page-div">
      <NavLogo ctrl-key="completePasswordPageAppLogo" class="complete-password-page-logo" mode="inApp" />
      <div class="complete-password-page-content">
        <div v-if="completionResult === RecoverPasswordCompleteResultCode.SUCCESS">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'success')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === RecoverPasswordCompleteResultCode.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === RecoverPasswordCompleteResultCode.LINK_EXPIRED">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.ForgotPassword}`)">
            {{ $t(getI18nResName2('forgotPasswordCompletePage', 'resetPassword')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath('/')">
            {{ $t(getI18nResName2('accountPageCommon', 'toHome')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

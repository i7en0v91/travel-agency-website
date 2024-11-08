<script setup lang="ts">
import { AppPage, getPagePath, RecoverPasswordCompleteResultEnum, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const logger = getCommonServices().getLogger();
const completionResult = ref(RecoverPasswordCompleteResultEnum.LINK_INVALID);
const route = useRoute();
const resultParam = route.query.result?.toString();
if (resultParam) {
  const resultCode = Object.keys(RecoverPasswordCompleteResultEnum).find(e => e.toLowerCase() === resultParam.toLowerCase()) as RecoverPasswordCompleteResultEnum;
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
    <!--
    <AccountFormPhotos ctrl-key="CompletePasswordPhotos" class="complete-password-account-forms-photos" />
    <div class="complete-password-page-div">
      <NavLogo ctrl-key="completePasswordPageAppLogo" class="complete-password-page-logo" mode="inApp" />
      <div class="complete-password-page-content">
        <div v-if="completionResult === RecoverPasswordCompleteResultEnum.SUCCESS">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'success')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === RecoverPasswordCompleteResultEnum.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === RecoverPasswordCompleteResultEnum.LINK_EXPIRED">
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.ForgotPassword, locale as Locale)">
            {{ $t(getI18nResName2('forgotPasswordCompletePage', 'resetPassword')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('forgotPasswordCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-complete-password mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'toHome')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
    -->
    PAGE CONTENT
  </div>
</template>

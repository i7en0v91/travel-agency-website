<script setup lang="ts">
import { type EntityId, AppConfig, SecretValueMask, HeaderAppVersion, type Locale, SignUpCompleteResultEnum, AppPage, getPagePath, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { type ISignUpCompleteResultDto, ApiEndpointSignUpComplete } from './../server/api-definitions';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('signUpCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const completionResult = ref<SignUpCompleteResultEnum | undefined>(undefined);

const logger = getCommonServices().getLogger();

const route = useRoute();
let tokenId: EntityId | undefined;
let tokenValue = '';
try {
  tokenId = route.query.token_id?.toString() ?? '';
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info(`(SignUpComplete) failed to parse token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
}

if (!tokenId || !tokenValue) {
  logger.info(`(SignUpComplete) link doesnt contain token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
  completionResult.value = SignUpCompleteResultEnum.LINK_INVALID;
} else {
  const { data, error } = await useFetch(`/${ApiEndpointSignUpComplete}`,
    {
      method: 'post',
      server: true,
      lazy: false,
      headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]],
      body: {
        id: tokenId,
        value: tokenValue
      },
      cache: 'no-cache',
      query: { drafts: enabled },
      transform: (response: any) => {
        const dto = response as ISignUpCompleteResultDto;
        if (!dto) {
          logger.warn(`(SignUpComplete) signup completion request returned empty data: id=${tokenId}`);
          return;
        }
        logger.verbose(`(SignUpComplete) received signup completion result: id=${tokenId}, code=${dto.code}`);
        return dto.code;
      }
    });
  watch(error, () => {
    if (error.value) {
      logger.warn(`(SignUpComplete) signup completion request failed: id=${tokenId}`, error.value);
    }
  });
  if (data.value) {
    completionResult.value = data.value;
  }
  watch(data, () => {
    if (data.value) {
      completionResult.value = data.value;
    }
  });
}

</script>

<template>
  <div class="signup-complete-page account-page no-hidden-parent-tabulation-check">
    <!--
    <AccountFormPhotos ctrl-key="SignUpCompletedPhotos" class="signup-complete-account-forms-photos" />
    <div class="signup-complete-page-div">
      <NavLogo ctrl-key="signUpCompletePageAppLogo" class="signup-complete-page-logo" mode="inApp" />
      <div class="signup-complete-page-content">
        <div v-if="completionResult === SignUpCompleteResultEnum.SUCCESS">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'success')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === SignUpCompleteResultEnum.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === SignUpCompleteResultEnum.LINK_EXPIRED">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Signup, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'signUp')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', 'toHome')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
    -->
    PAGE CONTENT
  </div>
</template>

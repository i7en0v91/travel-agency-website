<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { WebApiRoutes, SecretValueMask, PagePath } from './../shared/constants';
import { SignUpCompleteResultCode, type ISignUpCompleteResultDto } from './../server/dto';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: { resName: getI18nResName2('signUpCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const localePath = useLocalePath();
const completionResult = ref<SignUpCompleteResultCode | undefined>(undefined);

const logger = CommonServicesLocator.getLogger();

const route = useRoute();
let tokenId: number | undefined;
let tokenValue = '';
try {
  tokenId = parseInt(route.query.token_id?.toString() ?? '');
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info(`(SignUpComplete) failed to parse token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
}

if (!tokenId || !tokenValue) {
  logger.info(`(SignUpComplete) link doesnt contain token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
  completionResult.value = SignUpCompleteResultCode.LINK_INVALID;
} else {
  const { data, error } = await useFetch(WebApiRoutes.SignUpComplete,
    {
      method: 'post',
      server: true,
      lazy: false,
      body: {
        id: tokenId,
        value: tokenValue
      },
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
    <AccountFormPhotos ctrl-key="SignUpCompletedPhotos" class="signup-complete-account-forms-photos" />
    <div class="signup-complete-page-div">
      <NavLogo ctrl-key="signUpCompletePageAppLogo" class="signup-complete-page-logo" mode="inApp" />
      <div class="signup-complete-page-content">
        <div v-if="completionResult === SignUpCompleteResultCode.SUCCESS">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'success')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === SignUpCompleteResultCode.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === SignUpCompleteResultCode.LINK_EXPIRED">
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath(`/${PagePath.Signup}`)">
            {{ $t(getI18nResName2('accountPageCommon', 'signUp')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('signUpCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-signup-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="localePath('/')">
            {{ $t(getI18nResName2('accountPageCommon', 'toHome')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

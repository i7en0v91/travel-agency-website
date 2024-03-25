<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { WebApiRoutes, SecretValueMask, PagePath } from './../shared/constants';
import { EmailVerifyCompleteResultCode, type IEmailVerifyCompleteResultDto } from './../server/dto';

definePageMeta({
  title: { resName: getI18nResName2('emailVerifyCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const { status } = useAuth();
const localePath = useLocalePath();
const completionResult = ref<EmailVerifyCompleteResultCode | undefined>(undefined);

const logger = CommonServicesLocator.getLogger();

const route = useRoute();
let tokenId: number | undefined;
let tokenValue = '';
try {
  tokenId = parseInt(route.query.token_id?.toString() ?? '');
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info(`(EmailVerifyComplete) failed to parse token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
}

if (!tokenId || !tokenValue) {
  logger.info(`(EmailVerifyComplete) link doesnt contain token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
  completionResult.value = EmailVerifyCompleteResultCode.LINK_INVALID;
} else {
  const { data, error } = await useFetch(WebApiRoutes.EmailVerifyComplete,
    {
      method: 'post',
      server: true,
      lazy: false,
      body: {
        id: tokenId,
        value: tokenValue
      },
      transform: (response: any) => {
        const dto = response as IEmailVerifyCompleteResultDto;
        if (!dto) {
          logger.warn(`(EmailVerifyComplete) email verify completion request returned empty data: id=${tokenId}`);
          return;
        }
        logger.verbose(`(EmailVerifyComplete) received email verify completion result: id=${tokenId}, code=${dto.code}`);
        return dto.code;
      }
    });
  watch(error, () => {
    if (error.value) {
      logger.warn(`(EmailVerifyComplete) email verify completion request failed: id=${tokenId}`, error.value);
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
  <div class="email-verify-complete-page account-page no-hidden-parent-tabulation-check">
    <AccountFormPhotos ctrl-key="EmailVerifyCompletedPhotos" class="email-verify-complete-forms-photos" />
    <div class="email-verify-complete-page-div">
      <NavLogo ctrl-key="emailVerifyCompletePageAppLogo" class="email-verify-complete-page-logo" mode="inApp" />
      <div class="email-verify-complete-page-content">
        <div v-if="completionResult === EmailVerifyCompleteResultCode.SUCCESS">
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'success')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? localePath('/') : localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toHome' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === EmailVerifyCompleteResultCode.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? localePath('/') : localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toHome' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === EmailVerifyCompleteResultCode.LINK_EXPIRED">
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? localePath(`/${PagePath.Account}`) : localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toAccount' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? localePath(`/${PagePath.Account}`) : localePath(`/${PagePath.Login}`)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toAccount' : 'login')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

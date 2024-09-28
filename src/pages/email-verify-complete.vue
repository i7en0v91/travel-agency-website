<script setup lang="ts">
import { AppConfig, type EntityId, AppPage, type Locale, SecretValueMask, HeaderAppVersion, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointEmailVerifyComplete, EmailVerifyCompleteResultCode, type IEmailVerifyCompleteResultDto } from '../server/api-definitions';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';

definePageMeta({
  title: { resName: getI18nResName2('emailVerifyCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const { status } = useAuth();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const { enabled } = usePreviewState();
const completionResult = ref<EmailVerifyCompleteResultCode | undefined>(undefined);

const logger = getCommonServices().getLogger();

const route = useRoute();
let tokenId: EntityId | undefined;
let tokenValue = '';
try {
  tokenId = route.query.token_id?.toString() ?? '';
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info(`(EmailVerifyComplete) failed to parse token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
}

if (!tokenId || !tokenValue) {
  logger.info(`(EmailVerifyComplete) link doesnt contain token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
  completionResult.value = EmailVerifyCompleteResultCode.LINK_INVALID;
} else {
  const { data, error } = await useFetch(`/${ApiEndpointEmailVerifyComplete}`,
    {
      method: 'post',
      server: true,
      query: { drafts: enabled },
      cache: enabled ? 'no-cache' : 'default',
      headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]],
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
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toHome' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === EmailVerifyCompleteResultCode.ALREADY_CONSUMED">
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'alreadyConsumed')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toHome' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else-if="completionResult === EmailVerifyCompleteResultCode.LINK_EXPIRED">
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'linkExpired')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Account, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toAccount' : 'login')) }}
          </NuxtLink>
        </div>
        <div v-else>
          {{ $t(getI18nResName3('emailVerifyCompletePage', 'text', 'linkInvalid')) }}
          <NuxtLink class="btn btn-email-verify-complete mt-xs-3 mt-m-5 px-xs-4 py-xs-3 px-m-5 py-m-4" :to="status === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Account, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">
            {{ $t(getI18nResName2('accountPageCommon', status === 'authenticated' ? 'toAccount' : 'login')) }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

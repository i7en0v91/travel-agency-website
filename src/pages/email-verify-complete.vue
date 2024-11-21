<script setup lang="ts">
import { AppConfig, type EntityId, AppPage, type Locale, SecretValueMask, HeaderAppVersion, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointEmailVerifyComplete, EmailVerifyCompleteResultCode, type IEmailVerifyCompleteResultDto } from '../server/api-definitions';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';
import AccountPageContainer from './../components/account/page-container.vue';

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

const displayParams = (() => {
  switch(completionResult.value) {
    case EmailVerifyCompleteResultCode.SUCCESS:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'success'),
        link: {
          url: status.value === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', status.value === 'authenticated' ? 'toHome' : 'login')
        }
      };
    case EmailVerifyCompleteResultCode.ALREADY_CONSUMED:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'alreadyConsumed'),
        link: {
          url: status.value === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', status.value === 'authenticated' ? 'toHome' : 'login')
        }
      };
    case EmailVerifyCompleteResultCode.LINK_EXPIRED:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'linkExpired'),
        link: {
          url: status.value === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', status.value === 'authenticated' ? 'toAccount' : 'login')
        }
      };
    default:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'linkInvalid'),
        link: {
          url: status.value === 'authenticated' ? navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', status.value === 'authenticated' ? 'toAccount' : 'login')
        }
      };
  }
})();

</script>

<template>
  <AccountPageContainer ctrl-key="EmailVerifyCompleted" :ui="{ wrapper: 'md:flex-row-reverse' }">
    <div class="w-full h-auto">
      <div class="flex flex-col flex-nowrap gap-6 md:gap-8 items-start text-gray-600 dark:text-gray-400">
        {{ $t(displayParams.msgResName) }}
        <UButton size="lg" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="displayParams.link.url" :external="false">
          {{ $t(displayParams.link.labelResName) }}
        </UButton>
      </div>     
    </div>
  </AccountPageContainer>
</template>

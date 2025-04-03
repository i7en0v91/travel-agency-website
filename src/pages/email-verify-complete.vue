<script setup lang="ts">
import { AppConfig, type EntityId, AppPage, type Locale, HeaderAppVersion, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointEmailVerifyComplete, EmailVerifyCompleteResultCode, type IEmailVerifyCompleteResultDto } from '../server/api-definitions';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';
import AccountPageContainer from './../components/account/page-container.vue';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  title: { resName: getI18nResName2('emailVerifyCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'EmailVerifyComplete'];

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const userAccountStore = useUserAccountStore();
const { enabled } = usePreviewState();
const completionResult = ref<EmailVerifyCompleteResultCode | undefined>(undefined);

const logger = getCommonServices().getLogger().addContextProps({ component: 'EmailVerifyComplete' });

const route = useRoute();
let tokenId: EntityId | undefined;
let tokenValue = '';
try {
  tokenId = route.query.token_id?.toString() ?? '';
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info('failed to parse token data', { id: tokenId, token: tokenValue });
  console.warn(err);
}

if (!tokenId || !tokenValue) {
  logger.info('link doesnt contain token data', { id: tokenId, token: tokenValue });
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
          logger.warn('email verify completion request returned empty data', undefined, { id: tokenId });
          return;
        }
        logger.verbose('received email verify completion result', { id: tokenId, code: dto.code });
        return dto.code;
      }
    });
  watch(error, () => {
    if (error.value) {
      logger.warn('email verify completion request failed', error.value, { id: tokenId });
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
          url: userAccountStore.isAuthenticated ? navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', userAccountStore.isAuthenticated ? 'toHome' : 'login')
        }
      };
    case EmailVerifyCompleteResultCode.ALREADY_CONSUMED:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'alreadyConsumed'),
        link: {
          url: userAccountStore.isAuthenticated ? navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', userAccountStore.isAuthenticated ? 'toHome' : 'login')
        }
      };
    case EmailVerifyCompleteResultCode.LINK_EXPIRED:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'linkExpired'),
        link: {
          url: userAccountStore.isAuthenticated ? navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', userAccountStore.isAuthenticated ? 'toAccount' : 'login')
        }
      };
    default:
      return {
        msgResName: getI18nResName3('emailVerifyCompletePage', 'text', 'linkInvalid'),
        link: {
          url: userAccountStore.isAuthenticated ? navLinkBuilder.buildPageLink(AppPage.Account, locale.value as Locale) : navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', userAccountStore.isAuthenticateds ? 'toAccount' : 'login')
        }
      };
  }
})();

</script>

<template>
  <AccountPageContainer :ctrl-key="[...CtrlKey, 'PageContent']" :ui="{ wrapper: 'md:flex-row-reverse' }">
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

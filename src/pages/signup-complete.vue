<script setup lang="ts">
import { type EntityId, AppConfig, SecretValueMask, HeaderAppVersion, type Locale, SignUpCompleteResultEnum, AppPage, getPagePath, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { type ISignUpCompleteResultDto, ApiEndpointSignUpComplete } from './../server/api-definitions';
import AccountPageContainer from './../components/account/page-container.vue';
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

const displayParams = (() => {
  switch(completionResult.value) {
    case SignUpCompleteResultEnum.SUCCESS:
      return {
        msgResName: getI18nResName3('signUpCompletePage', 'text', 'success'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'login')
        }
      };
    case SignUpCompleteResultEnum.ALREADY_CONSUMED:
      return {
        msgResName: getI18nResName3('signUpCompletePage', 'text', 'alreadyConsumed'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'login')
        }
      };
    case SignUpCompleteResultEnum.LINK_EXPIRED:
      return {
        msgResName: getI18nResName3('signUpCompletePage', 'text', 'linkExpired'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Signup, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'signUp')
        }
      };
    default:
      return {
        msgResName: getI18nResName3('signUpCompletePage', 'text', 'linkInvalid'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'toHome')
        }
      };
  }
})();

</script>

<template>
  <AccountPageContainer ctrl-key="SignUpCompleted" :ui="{ wrapper: 'md:flex-row-reverse',height: '!h-[1154px]' }">
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

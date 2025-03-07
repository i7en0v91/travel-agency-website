<script setup lang="ts">
import { AppPage, getPagePath, RecoverPasswordCompleteResultEnum, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import AccountPageContainer from './../components/account/page-container.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { getCommonServices } from '../helpers/service-accessors';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordCompletePage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'ForgotPasswordComplete'];

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ForgotPasswordComplete' });
const completionResult = ref(RecoverPasswordCompleteResultEnum.LINK_INVALID);
const route = useRoute();
const resultParam = route.query.result?.toString();
if (resultParam) {
  const resultCode = Object.keys(RecoverPasswordCompleteResultEnum).find(e => e.toLowerCase() === resultParam.toLowerCase()) as RecoverPasswordCompleteResultEnum;
  if (resultCode) {
    completionResult.value = resultCode;
  } else {
    logger.warn('unexpected result', undefined, { result: resultParam });
  }
} else {
  logger.warn('result is empty');
}

const displayParams = (() => {
  switch(completionResult.value) {
    case RecoverPasswordCompleteResultEnum.SUCCESS:
      return {
        msgResName: getI18nResName3('forgotPasswordCompletePage', 'text', 'success'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'login')
        }
      };
    case RecoverPasswordCompleteResultEnum.ALREADY_CONSUMED:
      return {
        msgResName: getI18nResName3('forgotPasswordCompletePage', 'text', 'alreadyConsumed'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'login')
        }
      };
    case RecoverPasswordCompleteResultEnum.LINK_EXPIRED:
    return {
        msgResName: getI18nResName3('forgotPasswordCompletePage', 'text', 'linkExpired'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.ForgotPassword, locale.value as Locale),
          labelResName: getI18nResName2('forgotPasswordCompletePage', 'resetPassword')
        }
      };
    default:
      return {
        msgResName: getI18nResName3('forgotPasswordCompletePage', 'text', 'linkInvalid'),
        link: {
          url: navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale),
          labelResName: getI18nResName2('accountPageCommon', 'toHome')
        }
      };
  }
})();

</script>

<template>
  <AccountPageContainer :ctrl-key="[...CtrlKey, 'PageContent']">
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

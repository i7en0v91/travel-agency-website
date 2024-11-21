<script setup lang="ts">
import { AppConfig, getPagePath, AppPage, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import AccountPageContainer from './../components/account/page-container.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordVerifyPage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <AccountPageContainer ctrl-key="ForgotPasswordVerify">
    <div class="w-full h-auto">
      <div class="flex flex-col flex-nowrap gap-6 md:gap-8 items-start text-gray-600 dark:text-gray-400">
        {{ $t(getI18nResName2('forgotPasswordVerifyPage', 'text'), { tokenExpirationHours: AppConfig.verificationTokenExpirationHours }) }}
        <UButton size="lg" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="false">
          {{ $t(getI18nResName2('accountPageCommon', 'backToHome')) }}
        </UButton>
      </div>     
    </div>
  </AccountPageContainer>
</template>

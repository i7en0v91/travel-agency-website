<script setup lang="ts">
import { AppPage, getPagePath, type Locale, RecoverPasswordResultEnum, AuthProvider, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import * as config from './../node_modules/@nuxt/ui/dist/runtime/ui.config/index.js';
import { ApiEndpointPasswordRecovery, type IRecoverPasswordDto, type IRecoverPasswordResultDto } from '../server/api-definitions';
import { post } from './../helpers/rest-utils';
import { formatAuthCallbackUrl } from './../helpers/dom';
import AccountPageContainer from './../components/account/page-container.vue';
import { getCommonServices } from './../helpers/service-accessors';
import { object, string } from 'yup';
import OAuthProviderList from './../components/account/oauth-providers-list.vue';
import CaptchaProtection from './../components/forms/captcha-protection.vue';
import { type ComponentInstance } from 'vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordPage', 'title'), resArgs: undefined }
});
useOgImage();

const { signIn } = useAuth();
const localePath = useLocalePath();
const { enabled } = usePreviewState();
const themeSettings = useThemeSettings();

const logger = getCommonServices().getLogger();

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const captcha = shallowRef<ComponentInstance<typeof CaptchaProtection>>();

const schema = computed(() => 
  object({
    email: string().email(t(getI18nResName2('validations', 'email'))).required(t(getI18nResName2('validations', 'required'))),
  })
);
const state = reactive<any>({
  email: undefined
});
const serverValidationErrorResName = ref<I18nResName>();

async function callServerPasswordRecovery (email: string, captchaToken?: string) : Promise<void> {
  const postBody: IRecoverPasswordDto = {
    email: state.email,
    captchaToken,
    locale: locale.value,
    theme: themeSettings.currentTheme.value
  };

  const resultDto = await post(`/${ApiEndpointPasswordRecovery}`, undefined, postBody, undefined, true, undefined, 'default') as IRecoverPasswordResultDto;
  if (resultDto) {
    switch (resultDto.code) {
      case RecoverPasswordResultEnum.SUCCESS:
        await navigateTo(navLinkBuilder.buildPageLink(AppPage.ForgotPasswordVerify, locale.value as Locale));
        break;
      case RecoverPasswordResultEnum.USER_NOT_FOUND:
        serverValidationErrorResName.value = getI18nResName2('forgotPasswordPage', 'userNotFound');
        break;
      case RecoverPasswordResultEnum.EMAIL_NOT_VERIFIED:
        serverValidationErrorResName.value = getI18nResName2('forgotPasswordPage', 'emailNotVerified');
        break;
    }
  }
}

function onCaptchaVerified (captchaToken: string) {
  callServerPasswordRecovery(state.email.value, captchaToken);
}

function onSubmit () {
  logger.verbose('(ForgotPassword) submit handler triggered');
  serverValidationErrorResName.value = undefined;
  captcha.value!.startVerification();
}

async function onOAuthProviderClick (provider: AuthProvider): Promise<void> { 
  const callbackUrl = formatAuthCallbackUrl(localePath(`/${getPagePath(AppPage.Index)}`), enabled);
  const oauthOptions = { callbackUrl, redirect: true };
  switch (provider) {
    case AuthProvider.Google:
      await signIn('google', oauthOptions);
      break;
    case AuthProvider.GitHub:
      await signIn('github', oauthOptions);
      break;
    default:
      await signIn('testlocal', oauthOptions);
      break;
  }
}

onMounted(() => {
  watch(() => state.email, () => {
    serverValidationErrorResName.value = undefined;
  });
});

const uiStyling = {
  padding: {
    md: 'px-0'
  }
};

</script>

<template>
  <AccountPageContainer ctrl-key="ForgotPassword">
    <div class="w-full h-auto">
      <UButton size="md" :ui="uiStyling" icon="i-heroicons-chevron-left-20-solid" class="w-fit flex flex-row flex-nowrap items-center border-none ring-0 dark:hover:bg-transparent" variant="outline" color="gray" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)" :external="false">
        {{ $t(getI18nResName2('accountPageCommon', 'backToLogin')) }}
      </UButton>
      <h1 class="text-gray-600 dark:text-gray-300 text-5xl max-w-[90vw] break-words font-normal mt-4">
        {{ $t(getI18nResName2('forgotPasswordPage', 'title')) }}
      </h1>
      <div class="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-normal mt-4">
        {{ $t(getI18nResName2('forgotPasswordPage', 'subTitle')) }}
      </div>

      <UForm :schema="schema" :state="state" :validate-on="['input', 'change', 'submit']" class="mt-12 space-y-4" @submit="onSubmit" >
        <UFormGroup name="email" :label="t(getI18nResName2('accountPageCommon', 'emailLabel'))">
          <UInput v-model.trim="state.email" :placeholder="t(getI18nResName2('accountPageCommon', 'emailPlaceholder'))" :max-length="256"/>
        </UFormGroup>
        <div v-if="serverValidationErrorResName" :class="config.formGroup.error">
          {{ $t(serverValidationErrorResName) }}
        </div>

        <UButton type="submit" class="w-full h-auto !mt-7 md:!mt-10 justify-center" size="xl">
          {{ $t(getI18nResName3('forgotPasswordPage', 'forms', 'submit')) }}
        </UButton>
      </UForm>

      <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('accountPageCommon', 'loginWith')" @click="onOAuthProviderClick" />
      <CaptchaProtection ref="captcha" ctrl-key="ForgotPasswordCaptchaProtection" @verified="onCaptchaVerified" />
    </div>
  </AccountPageContainer>
</template>

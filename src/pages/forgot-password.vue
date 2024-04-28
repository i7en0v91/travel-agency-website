<script setup lang="ts">

import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email, required } from '@vuelidate/validators';
import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import { AuthProvider } from './../shared/interfaces';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import { PagePath, ApiEndpointPasswordRecovery } from './../shared/constants';
import SimpleButton from './../components/forms/simple-button.vue';
import AccountFormPhotos from './../components/account/form-photos.vue';
import OAuthProviderList from './../components/account/oauth-providers-list.vue';
import CaptchaProtection from './../components/forms/captcha-protection.vue';
import { type IRecoverPasswordDto, type IRecoverPasswordResultDto, RecoverPasswordResultCode } from './../server/dto';
import { post } from './../shared/rest-utils';

const { t, locale } = useI18n();
const localePath = useLocalePath();
const captcha = shallowRef<InstanceType<typeof CaptchaProtection>>();

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: { resName: getI18nResName2('forgotPasswordPage', 'title'), resArgs: undefined }
});
useOgImage();

const { signIn } = useAuth();
const themeSettings = useThemeSettings();

const useremail = ref('');
const useremailServerError = ref('');

const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  useremail: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' }),
    email: withI18nMessage(email),
    validator: withI18nMessage(() => { return (useremailServerError.value?.length ?? 0) === 0; }, { messagePath: () => useremailServerError.value })
  }
}));
const v$ = useVuelidate(rules, { useremail, $lazy: true });

async function callServerPasswordRecovery (email: string, captchaToken?: string) : Promise<void> {
  const postBody: IRecoverPasswordDto = {
    email,
    captchaToken,
    locale: locale.value,
    theme: themeSettings.currentTheme.value
  };

  const resultDto = await post(ApiEndpointPasswordRecovery, undefined, postBody, undefined, true, 'default') as IRecoverPasswordResultDto;
  if (resultDto) {
    switch (resultDto.code) {
      case RecoverPasswordResultCode.SUCCESS:
        await navigateTo(localePath(`/${PagePath.ForgotPasswordVerify}`));
        break;
      case RecoverPasswordResultCode.USER_NOT_FOUND:
        useremailServerError.value = getI18nResName2('forgotPasswordPage', 'userNotFound');
        await v$.value.useremail.$validate();
        break;
      case RecoverPasswordResultCode.EMAIL_NOT_VERIFIED:
        useremailServerError.value = getI18nResName2('forgotPasswordPage', 'emailNotVerified');
        await v$.value.useremail.$validate();
        break;
    }
  }
}

function onCaptchaVerified (captchaToken: string) {
  callServerPasswordRecovery(useremail.value, captchaToken);
}

function submitClick () {
  useremailServerError.value = '';
  useremail.value = useremail.value.trim();
  v$.value.$touch();
  if (!v$.value.$error) {
    captcha.value!.startVerification();
  }
}

function onOAuthProviderClick (provider: AuthProvider) {
  const oauthOptions = { callbackUrl: localePath('/'), external: true, redirect: true };
  switch (provider) {
    case AuthProvider.Google:
      signIn('google', oauthOptions);
      break;
    case AuthProvider.GitHub:
      signIn('github', oauthOptions);
      break;
    default:
      signIn('testlocal', oauthOptions);
      break;
  }
}

</script>

<template>
  <div class="forgot-password-page account-page no-hidden-parent-tabulation-check">
    <div class="forgot-password-page-content">
      <NavLogo ctrl-key="forgotPasswordPageAppLogo" mode="inApp" />
      <NuxtLink class="back-to-login-link brdr-1" :to="localePath(`/${PagePath.Login}`)">
        {{ t(getI18nResName2('accountPageCommon', 'backToLogin')) }}
      </NuxtLink>
      <h1 class="forgot-password-title mt-xs-3 font-h2">
        {{ t(getI18nResName2('forgotPasswordPage', 'title')) }}
      </h1>
      <div class="forgot-password-subtitle mt-xs-3">
        {{ t(getI18nResName2('forgotPasswordPage', 'subTitle')) }}
      </div>
      <form>
        <TextBox
          v-model="useremail"
          ctrl-key="forgotPasswordPgEmail"
          class="form-field forgot-password-form-field forgot-password-email-field"
          type="email"
          :caption-res-name="getI18nResName2('accountPageCommon', 'emailLabel')"
          :placeholder-res-name="getI18nResName2('accountPageCommon', 'emailPlaceholder')"
        />
        <div v-if="v$.useremail.$errors.length" class="input-errors">
          <div class="form-error-msg">
            {{ v$.useremail.$errors[0].$message }}
          </div>
        </div>
        <CaptchaProtection ref="captcha" ctrl-key="ForgotPasswordCaptchaProtection" @verified="onCaptchaVerified" />
      </form>
      <SimpleButton ctrl-key="forgotPaswordSubmitBtn" class="forgot-password-submit-btn mt-xs-2" :label-res-name="getI18nResName3('forgotPasswordPage', 'forms', 'submit')" @click="submitClick" />
      <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('forgotPasswordPage', 'loginWith')" @click="onOAuthProviderClick" />
    </div>
    <AccountFormPhotos ctrl-key="ForgotPasswordPhotos" class="forgot-password-account-forms-photos" />
  </div>
</template>

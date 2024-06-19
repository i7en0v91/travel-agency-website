<script setup lang="ts">

import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email, required } from '@vuelidate/validators';
import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import { AuthProvider } from './../shared/interfaces';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import SimpleButton from './../components/forms/simple-button.vue';
import { AppException, getUsrMsgResName } from './../shared/exceptions';
import AccountFormPhotos from './../components/account/form-photos.vue';
import OAuthProviderList from './../components/account/oauth-providers-list.vue';
import { HtmlPage, getHtmlPagePath } from './../shared/page-query-params';

const { t } = useI18n();
const localePath = useLocalePath();

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: { resName: getI18nResName2('loginPage', 'title'), resArgs: undefined }
});
useOgImage();

const { signIn } = useAuth();

const username = ref('');
const password = ref('');
const loginErrorMsgResName = ref('');

const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  username: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' }),
    email: withI18nMessage(email)
  },
  password: {
    required: withI18nMessage(required)
  }
}));
const v$ = useVuelidate(rules, { username, password, $lazy: true });

const mySignInHandler = async (username: string, password: string) => {
  const route = useRoute();
  const callbackUrl = route.query.callbackUrl?.toString() ?? '/';
  try {
    const signInResult = (await signIn('credentials', { username, password, callbackUrl, redirect: false }));
    if (signInResult) {
      if (signInResult.error) {
        loginErrorMsgResName.value = getI18nResName2('loginPage', 'invalidCredentials');
      } else {
        return await navigateTo(signInResult.url, { external: true });
      }
    } else {
      loginErrorMsgResName.value = getI18nResName2('loginPage', 'invalidCredentials');
    }
  } catch (err: any) {
    if (AppException.isAppException(err)) {
      const appException = err as AppException;
      loginErrorMsgResName.value = getUsrMsgResName(appException.code);
    } else {
      loginErrorMsgResName.value = getI18nResName2('appErrors', 'unknown');
    }
  }
};

function loginClick () {
  loginErrorMsgResName.value = '';
  username.value = username.value.trim();
  v$.value.$touch();
  if (!v$.value.$error) {
    mySignInHandler(username.value, password.value);
  }
}

function onOAuthProviderClick (provider: AuthProvider) {
  const route = useRoute();
  const oauthOptions = { callbackUrl: route.query.callbackUrl?.toString() ?? '/', external: true, redirect: true };
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
  <div class="login-page account-page no-hidden-parent-tabulation-check">
    <div class="login-page-content no-hidden-parent-tabulation-check">
      <NavLogo ctrl-key="loginPageAppLogo" mode="inApp" />
      <h1 class="login-title font-h2">
        {{ t(getI18nResName2('loginPage', 'title')) }}
      </h1>
      <div class="login-subtitle mt-xs-3">
        {{ t(getI18nResName2('loginPage', 'subTitle')) }}
      </div>
      <form class="no-hidden-parent-tabulation-check">
        <TextBox
          v-model="username"
          ctrl-key="loginPgEmail"
          class="form-field login-form-field login-email-field no-hidden-parent-tabulation-check"
          type="email"
          :caption-res-name="getI18nResName2('accountPageCommon', 'emailLabel')"
          :placeholder-res-name="getI18nResName2('accountPageCommon', 'emailPlaceholder')"
        />
        <div v-if="v$.username.$errors.length" class="input-errors">
          <div class="form-error-msg">
            {{ v$.username.$errors[0].$message }}
          </div>
        </div>
        <TextBox
          v-model="password"
          ctrl-key="loginPgPassword"
          class="form-field login-form-field login-password-field mt-xs-4 no-hidden-parent-tabulation-check"
          type="password"
          :caption-res-name="getI18nResName2('accountPageCommon', 'passwordLabel')"
          :placeholder-res-name="getI18nResName2('accountPageCommon', 'passwordPlaceholder')"
        />
        <div v-if="v$.password.$errors.length" class="input-errors">
          <div class="form-error-msg">
            {{ v$.password.$errors[0].$message }}
          </div>
        </div>
      </form>
      <NuxtLink class="forgot-password-link mt-xs-4 brdr-1" :to="localePath(`/${getHtmlPagePath(HtmlPage.ForgotPassword)}`)">
        {{ $t(getI18nResName3('loginPage', 'forms', 'forgotPassword')) }}
      </NuxtLink>
      <div v-if="loginErrorMsgResName?.length" class="form-error-msg mt-xs-3 mt-xs-5">
        {{ $t(loginErrorMsgResName) }}
      </div>
      <SimpleButton ctrl-key="loginBtn" class="login-btn mt-xs-2" :label-res-name="getI18nResName2('accountPageCommon', 'login')" @click="loginClick" />
      <div class="having-account mt-xs-4">
        {{ $t(getI18nResName2('loginPage', 'havingAccount')) }}
        <span class="login-signup">
          <NuxtLink class="brdr-1" :to="localePath(`/${getHtmlPagePath(HtmlPage.Signup)}`)">{{ $t(getI18nResName2('accountPageCommon', 'signUp')) }}</NuxtLink>
        </span>
      </div>
      <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('accountPageCommon', 'loginWith')" @click="onOAuthProviderClick" />
    </div>
    <AccountFormPhotos ctrl-key="LoginPhotos" class="login-account-forms-photos" />
  </div>
</template>

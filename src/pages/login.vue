<script setup lang="ts">
import { type Locale, CookieLoginOrigin, AppPage, getPagePath, AppException, getUsrMsgResName, AuthProvider, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { formatAuthCallbackUrl } from './../helpers/dom';
import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email, required } from '@vuelidate/validators';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import SimpleButton from './../components/forms/simple-button.vue';
import AccountFormPhotos from './../components/account/form-photos.vue';
import OAuthProviderList from './../components/account/oauth-providers-list.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from '../helpers/service-accessors';

const { t, locale } = useI18n();
const localePath = useLocalePath();
const navLinkBuilder = useNavLinkBuilder();

const originPageCookie = useCookie(CookieLoginOrigin, { 
  path: '/', 
  secure: false, 
  httpOnly: false, 
  sameSite: 'lax',
  // Session-expired
  maxAge: undefined, 
  expires: undefined 
});

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('loginPage', 'title'), resArgs: undefined }
});
useOgImage();

const { signIn } = useAuth();
const { enabled } = usePreviewState();
const logger = getCommonServices().getLogger();

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

function prepareCallbackUrl(originPathFromUrl: string | undefined): string {
  let callbackUrl: string;
  if(originPathFromUrl?.trim()) {
    callbackUrl = formatAuthCallbackUrl(originPathFromUrl, enabled);
    originPageCookie.value = callbackUrl;
    logger.debug(`(Login) origin page obtained from route: ${callbackUrl}`);
  } else if(originPageCookie.value?.trim()) {
    callbackUrl = formatAuthCallbackUrl(originPageCookie.value!, enabled);
    logger.debug(`(Login) origin page obtained from cookie: ${callbackUrl}`);
  } else {
    callbackUrl = formatAuthCallbackUrl(localePath(`/${getPagePath(AppPage.Index)}`), enabled);
    logger.debug(`(Login) using default origin page: ${callbackUrl}`);
  }
  return callbackUrl;
}

const mySignInHandler = async (username: string, password: string) => {
  const route = useRoute();
  try {
    const callbackUrl = prepareCallbackUrl(route.query.originPath?.toString());

    const signInResult = (await signIn('credentials', { username, password, redirect: false, external: false }));
    if (signInResult) {
      if (signInResult.error) {
        loginErrorMsgResName.value = getI18nResName2('loginPage', 'invalidCredentials');
        return;
      }

      logger.verbose(`(Login) credentials sign-in succeeded, navigating to callbackUrl=${callbackUrl}`);
      await navigateTo(callbackUrl, { external: false });
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

async function onOAuthProviderClick (provider: AuthProvider): Promise<void> {
  const route = useRoute();
  const callbackUrl = prepareCallbackUrl(route.query.originPath?.toString());
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
      <NuxtLink class="forgot-password-link mt-xs-4 brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.ForgotPassword, locale as Locale)">
        {{ $t(getI18nResName3('loginPage', 'forms', 'forgotPassword')) }}
      </NuxtLink>
      <div v-if="loginErrorMsgResName?.length" class="form-error-msg mt-xs-3 mt-xs-5">
        {{ $t(loginErrorMsgResName) }}
      </div>
      <SimpleButton ctrl-key="loginBtn" class="login-btn mt-xs-2" :label-res-name="getI18nResName2('accountPageCommon', 'login')" @click="loginClick" />
      <div class="having-account mt-xs-4">
        {{ $t(getI18nResName2('loginPage', 'havingAccount')) }}
        <span class="login-signup">
          <NuxtLink class="brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.Signup, locale as Locale)">{{ $t(getI18nResName2('accountPageCommon', 'signUp')) }}</NuxtLink>
        </span>
      </div>
      <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('accountPageCommon', 'loginWith')" @click="onOAuthProviderClick" />
    </div>
    <AccountFormPhotos ctrl-key="LoginPhotos" class="login-account-forms-photos" />
  </div>
</template>

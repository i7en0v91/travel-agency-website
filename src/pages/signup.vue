<script setup lang="ts">
import { isPasswordSecure, AppPage, getPagePath, type Locale, UserNotificationLevel, SignUpResultEnum, AuthProvider, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { ApiEndpointSignUp, type ISignUpDto, type ISignUpResultDto } from '../server/api-definitions';
import { post } from './../helpers/rest-utils';
import { formatAuthCallbackUrl } from './../helpers/dom';
import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { email, required, minLength, sameAs } from '@vuelidate/validators';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import CheckBox from './../components/forms/check-box.vue';
import SimpleButton from './../components/forms/simple-button.vue';
import AccountFormPhotos from './../components/account/form-photos.vue';
import OAuthProviderList from './../components/account/oauth-providers-list.vue';
import CaptchaProtection from './../components/forms/captcha-protection.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { usePreviewState } from './../composables/preview-state';

const { t, locale } = useI18n();
const localePath = useLocalePath();
const navLinkBuilder = useNavLinkBuilder();
const { signIn } = useAuth();
const { enabled } = usePreviewState();

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('signUpPage', 'title'), resArgs: undefined }
});
useOgImage();

const themeSettings = useThemeSettings();
const userNotificationStore = useUserNotificationStore();

const firstname = ref('');
const lastname = ref('');
const usermail = ref('');
const password = ref('');
const confirmPassword = ref('');
const signUpErrorMsgResName = ref('');
const agreeToPolicies = ref(false);

const emailIsNotTakenByOtherUsers = ref(true);
const captcha = useTemplateRef('captcha');

const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  firstname: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' })
  },
  lastname: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' })
  },
  usermail: {
    required: withI18nMessage(required, { messagePath: () => 'validations.required' }),
    email: withI18nMessage(email),
    validator: withI18nMessage(() => { return emailIsNotTakenByOtherUsers.value; }, { messagePath: () => 'validations.emailAlreadyRegistered' })
  },
  password: {
    required: withI18nMessage(required),
    minLength: withI18nMessage(minLength(8)),
    validator: withI18nMessage(isPasswordSecure, { messagePath: () => 'validations.password' })
  },
  confirmPassword: {
    required: withI18nMessage(required),
    sameAsPassword: withI18nMessage(sameAs(password))
  }
}));
const v$ = useVuelidate(rules, { firstname, lastname, usermail, password, confirmPassword, $lazy: true });

function signUpClick (): void {
  emailIsNotTakenByOtherUsers.value = true;
  signUpErrorMsgResName.value = '';
  if (!agreeToPolicies.value) {
    signUpErrorMsgResName.value = getI18nResName2('validations', 'mustAgreeToPolicies');
  }
  firstname.value = firstname.value.trim();
  lastname.value = lastname.value.trim();
  usermail.value = usermail.value.trim();
  v$.value.$touch();

  if (v$.value.$error || signUpErrorMsgResName.value) {
    return;
  }

  captcha.value!.startVerification();
}

function onCaptchaVerified (captchaToken: string) {
  callServerSignUp(captchaToken);
}

async function callServerSignUp (captchaToken?: string) : Promise<void> {
  const postBody: ISignUpDto = {
    firstName: firstname.value,
    lastName: lastname.value,
    password: password.value,
    email: usermail.value,
    locale: locale.value,
    theme: themeSettings.currentTheme.value,
    captchaToken
  };

  const resultDto = await post(`/${ApiEndpointSignUp}`, undefined, postBody, undefined, true, undefined, 'default') as ISignUpResultDto;
  if (resultDto) {
    switch (resultDto.code) {
      case SignUpResultEnum.SUCCESS:
        await navigateTo(navLinkBuilder.buildPageLink(AppPage.SignupVerify, locale.value as Locale));
        break;
      case SignUpResultEnum.AUTOVERIFIED:
        userNotificationStore.show({
          level: UserNotificationLevel.WARN,
          resName: getI18nResName2('signUpPage', 'emailWasAutoverified')
        });
        await navigateTo(navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale));
        break;
      case SignUpResultEnum.ALREADY_EXISTS:
        emailIsNotTakenByOtherUsers.value = false;
        await v$.value.usermail.$validate();
        break;
    }
  }
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

</script>

<template>
  <div class="signup-page account-page no-hidden-parent-tabulation-check">
    <AccountFormPhotos ctrl-key="SignUpPhotos" class="signup-account-forms-photos" />
    <div class="signup-page-content">
      <NavLogo ctrl-key="signupPageAppLogo" mode="inApp" />
      <h1 class="signup-title font-h2">
        {{ t(getI18nResName2('signUpPage', 'title')) }}
      </h1>
      <div class="signup-subtitle mt-xs-3">
        {{ t(getI18nResName2('signUpPage', 'subTitle')) }}
      </div>
      <form>
        <div class="signup-firstname-field mt-xs-1 mt-m-3">
          <TextBox
            v-model="firstname"
            ctrl-key="signUpPgFirstName"
            class="form-field signup-form-field"
            type="text"
            :max-length="128"
            :caption-res-name="getI18nResName3('signUpPage', 'forms', 'firstNameLabel')"
            :placeholder-res-name="getI18nResName3('signUpPage', 'forms', 'firstNamePlaceholder')"
          />
          <div v-if="v$.firstname.$errors.length" class="input-errors">
            <div class="form-error-msg">
              {{ v$.firstname.$errors[0].$message }}
            </div>
          </div>
        </div>
        <div class="signup-lastname-field mt-xs-1 mt-m-3">
          <TextBox
            v-model="lastname"
            ctrl-key="signUpPgLastName"
            class="form-field signup-form-field"
            type="text"
            :max-length="128"
            :caption-res-name="getI18nResName3('signUpPage', 'forms', 'lastNameLabel')"
            :placeholder-res-name="getI18nResName3('signUpPage', 'forms', 'lastNamePlaceholder')"
          />
          <div v-if="v$.lastname.$errors.length" class="input-errors">
            <div class="form-error-msg">
              {{ v$.lastname.$errors[0].$message }}
            </div>
          </div>
        </div>
        <div class="signup-email-field mt-xs-1 mt-m-3">
          <TextBox
            v-model="usermail"
            ctrl-key="signUpPgEmail"
            class="form-field signup-form-field"
            type="email"
            :max-length="256"
            :caption-res-name="getI18nResName2('accountPageCommon', 'emailLabel')"
            :placeholder-res-name="getI18nResName2('accountPageCommon', 'emailPlaceholder')"
          />
          <div v-if="v$.usermail.$errors.length" class="input-errors">
            <div class="form-error-msg">
              {{ v$.usermail.$errors[0].$message }}
            </div>
          </div>
        </div>
        <div class="signup-password-field mt-xs-1 mt-m-3">
          <TextBox
            v-model="password"
            ctrl-key="signUpPgPassword"
            class="form-field signup-form-field"
            type="password"
            :caption-res-name="getI18nResName2('accountPageCommon', 'passwordLabel')"
            :placeholder-res-name="getI18nResName2('accountPageCommon', 'passwordPlaceholder')"
          />
          <div v-if="v$.password.$errors.length" class="input-errors">
            <div class="form-error-msg">
              {{ v$.password.$errors[0].$message }}
            </div>
          </div>
        </div>
        <div class="signup-confirm-password-field mt-xs-1 mt-m-3">
          <TextBox
            v-model="confirmPassword"
            ctrl-key="signUpPgConfirmPassword"
            class="form-field signup-form-field"
            type="password"
            :caption-res-name="getI18nResName2('accountPageCommon', 'confirmPasswordLabel')"
            :placeholder-res-name="getI18nResName2('accountPageCommon', 'confirmPasswordPlaceholder')"
          />
          <div v-if="v$.confirmPassword.$errors.length" class="input-errors">
            <div class="form-error-msg">
              {{ v$.confirmPassword.$errors[0].$message }}
            </div>
          </div>
        </div>
        <CaptchaProtection ref="captcha" ctrl-key="SignUpCaptchaProtection" @verified="onCaptchaVerified" />
      </form>
      <CheckBox v-model:model-value="agreeToPolicies" ctrl-key="cbAgreeToPolicies" class="privacy-checkbox mt-xs-4" :value="true">
        <i18n-t :keypath="getI18nResName2('signUpPage', 'agreeWithPolicy')" tag="div" class="ml-xs-2" scope="global">
          <template #privacyLink>
            <NuxtLink class="privacy-link brdr-1" target="_blank" :to="navLinkBuilder.buildPageLink(AppPage.Privacy, locale as Locale)">
              {{ $t(getI18nResName2('signUpPage', 'privacyLinkText')) }}
            </NuxtLink>
          </template>
        </i18n-t>
      </CheckBox>
      <div v-if="signUpErrorMsgResName?.length" class="form-error-msg mt-xs-3 mt-xs-5">
        {{ $t(signUpErrorMsgResName) }}
      </div>
      <SimpleButton ctrl-key="signUpBtn" class="signup-btn mt-xs-2" :label-res-name="getI18nResName3('signUpPage', 'forms', 'createAccount')" @click="signUpClick" />
      <div class="already-have-account mt-xs-4">
        {{ $t(getI18nResName2('signUpPage', 'alreadyHaveAccount')) }}
        <span class="signup-login-link">
          <NuxtLink class="brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)">{{ $t(getI18nResName2('accountPageCommon', 'login')) }}</NuxtLink>
        </span>
      </div>
      <OAuthProviderList ctrl-key="SignUpProviders" :divisor-label-res-name="getI18nResName2('signUpPage', 'signUpWith')" @click="onOAuthProviderClick" />
    </div>
  </div>
</template>

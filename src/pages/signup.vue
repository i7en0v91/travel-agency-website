<script setup lang="ts">
import { AppConfig, AppPage, getPagePath, type Locale, UserNotificationLevel, SignUpResultEnum, AuthProvider, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import * as config from './../node_modules/@nuxt/ui/dist/runtime/ui.config/index.js';
import { ApiEndpointSignUp, type ISignUpDto, type ISignUpResultDto } from '../server/api-definitions';
import { post } from './../helpers/rest-utils';
import { bool, string, object } from 'yup';
import { formatAuthCallbackUrl } from './../helpers/dom';
import { createPasswordSchema } from './../helpers/forms';
import AccountPageContainer from './../components/account/page-container.vue';
import { getCommonServices } from './../helpers/service-accessors';
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
  title: { resName: getI18nResName2('signUpPage', 'title'), resArgs: undefined }
});
useOgImage();

const { t, locale } = useI18n();
const localePath = useLocalePath();
const navLinkBuilder = useNavLinkBuilder();
const { signIn } = useAuth();
const { enabled } = usePreviewState();

const logger = getCommonServices().getLogger();

const themeSettings = useThemeSettings();
const userNotificationStore = useUserNotificationStore();

const captcha = shallowRef<ComponentInstance<typeof CaptchaProtection>>();

const schema = computed(() => {
  const passwordFields = createPasswordSchema({
    required: t(getI18nResName2('validations', 'required')),
    minLength: t(getI18nResName2('validations', 'minLength'), { min: AppConfig.userPasswordPolicy.minLength }),
    policy: t(getI18nResName2('validations', 'password'), { min: AppConfig.userPasswordPolicy.minLength }),
    sameAs: t(getI18nResName2('validations', 'sameAsPassword'))
  });

  const personalFields = object({
    firstname: string().required(t(getI18nResName2('validations', 'required'))),
    lastname: string().required(t(getI18nResName2('validations', 'required'))),
    usermail: string().required(t(getI18nResName2('validations', 'required')))
                        .email(t(getI18nResName2('validations', 'email'))),
    agreeToPolicies: bool().equals([true], t(getI18nResName2('validations', 'mustAgreeToPolicies')))
  });
  
  return passwordFields.concat(personalFields);
});
const state = reactive<any>({
  firstname: undefined,
  lastname: undefined,
  usermail: undefined,
  password: undefined,
  confirmPassword: undefined,
  agreeToPolicies: false
});
const emailIsNotTakenByOtherUsers = ref(true);

function onSubmit (): void {
  logger.verbose('(SignUp) submit handler triggered');
  emailIsNotTakenByOtherUsers.value = true;
  captcha.value!.startVerification();
}

function onCaptchaVerified (captchaToken: string) {
  callServerSignUp(captchaToken);
}

async function callServerSignUp (captchaToken?: string) : Promise<void> {
  const postBody: ISignUpDto = {
    firstName: state.firstname,
    lastName: state.lastname,
    password: state.password,
    email: state.usermail,
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

onMounted(() => {
  watch(() => state.usermail, () => {
    emailIsNotTakenByOtherUsers.value = true;
  });
});

</script>

<template>
  <AccountPageContainer ctrl-key="Signup" :ui="{ wrapper: 'md:flex-row-reverse', height: '!h-[1154px]' }">
    <div class="w-full h-auto">
      <h1 class="text-gray-600 dark:text-gray-300 text-5xl font-normal mt-4 max-w-[90vw] break-words">
        {{ $t(getI18nResName2('signUpPage', 'title')) }}
      </h1>
      <div class="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-normal mt-4">
        {{ $t(getI18nResName2('signUpPage', 'subTitle')) }}
      </div>

      <UForm :schema="schema" :state="state" :validate-on="['input', 'change', 'submit']" class="mt-12 grid auto-rows-auto grid-cols-1 md:grid-cols-2 gap-6" @submit="onSubmit" >
        <UFormGroup name="firstname" :label="t(getI18nResName3('signUpPage', 'forms', 'firstNameLabel'))" class="row-start-1 row-end-2 col-start-1 col-end-2">
          <UInput v-model.trim="state.firstname" :placeholder="t(getI18nResName3('signUpPage', 'forms', 'firstNamePlaceholder'))" :max-length="128"/>
        </UFormGroup>

        <UFormGroup name="lastname" :label="t(getI18nResName3('signUpPage', 'forms', 'lastNameLabel'))" class="row-start-2 row-end-3 col-start-1 col-end-2 md:row-start-1 md:row-end-2 md:col-start-2 md:col-end-3">
          <UInput v-model.trim="state.lastname" :placeholder="t(getI18nResName3('signUpPage', 'forms', 'lastNamePlaceholder'))" :max-length="128"/>
        </UFormGroup>

        <div class="w-full h-auto row-start-3 row-end-4 col-start-1 col-end-2 md:row-start-2 md:row-end-3 md:col-end-3">
          <UFormGroup name="usermail" :label="t(getI18nResName2('accountPageCommon', 'emailLabel'))">
            <UInput v-model.trim="state.usermail" type="email" :placeholder="t(getI18nResName2('accountPageCommon', 'emailPlaceholder'))" :max-length="256"/>
          </UFormGroup>
          <div v-if="!emailIsNotTakenByOtherUsers" :class="config.formGroup.error">
            {{ $t(getI18nResName2('validations', 'emailAlreadyRegistered')) }}
          </div>
        </div>

        <UFormGroup name="password" :label="t(getI18nResName2('accountPageCommon', 'passwordLabel'))" class="row-start-4 row-end-5 col-start-1 col-end-2 md:row-start-3 md:row-end-4 md:col-end-3">
          <UInput v-model="state.password" type="password" :placeholder="t(getI18nResName2('accountPageCommon', 'passwordPlaceholder'))" :max-length="256"/>
        </UFormGroup>

        <UFormGroup name="confirmPassword" :label="t(getI18nResName2('accountPageCommon', 'confirmPasswordLabel'))" class="row-start-5 row-end-6 col-start-1 col-end-2 md:row-start-4 md:row-end-5 md:col-end-3">
          <UInput v-model="state.confirmPassword" type="password" :placeholder="t(getI18nResName2('accountPageCommon', 'confirmPasswordPlaceholder'))" :max-length="256"/>
        </UFormGroup>

        <UFormGroup name="agreeToPolicies" class="row-start-6 row-end-7 col-start-1 col-end-2 md:row-start-5 md:row-end-6 md:col-end-3">
          <UCheckbox v-model="state.agreeToPolicies" :ui="{ wrapper: 'items-center' }">
            <template #label>
              <i18n-t :keypath="getI18nResName2('signUpPage', 'agreeWithPolicy')" tag="div" class="text-sm sm:text-base ml-2" scope="global">
                <template #privacyLink>
                  <ULink class="text-sm sm:text-base text-orange-500 dark:text-orange-400" color="orange" size="sm" target="_blank" :to="navLinkBuilder.buildPageLink(AppPage.Privacy, locale as Locale)" :external="false">
                    {{ $t(getI18nResName2('signUpPage', 'privacyLinkText')) }}
                  </ULink>
                </template>
              </i18n-t>
            </template>
          </UCheckbox>
        </UFormGroup>

        <UButton type="submit" class="w-full h-auto justify-center row-start-7 row-end-8 col-start-1 col-end-2 md:row-start-6 md:row-end-7 md:col-end-3 mt-2 md:mt-4" size="xl">
          {{ $t(getI18nResName3('signUpPage', 'forms', 'createAccount')) }}
        </UButton>
      </UForm>

      <div class="w-full text-sm sm:text-base text-center mt-6">
        {{ $t(getI18nResName2('signUpPage', 'alreadyHaveAccount')) }}
        <ULink class="text-orange-500 dark:text-orange-400" color="orange" :to="navLinkBuilder.buildPageLink(AppPage.Login, locale as Locale)" :external="false">{{ $t(getI18nResName2('accountPageCommon', 'login')) }}</ULink>
      </div>

      <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('accountPageCommon', 'loginWith')" @click="onOAuthProviderClick" />
      <CaptchaProtection ref="captcha" ctrl-key="SignUpCaptchaProtection" @verified="onCaptchaVerified" />
    </div>
  </AccountPageContainer>
</template>

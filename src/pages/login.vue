<script setup lang="ts">
import { type Locale, CookieLoginOrigin, AppPage, getPagePath, AppException, getUsrMsgResName, AuthProvider, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import type { FormErrorEvent, FormSubmitEvent  } from './../node_modules/@nuxt/ui/dist/runtime/types/index.js';
import { formatAuthCallbackUrl } from './../helpers/dom';
import { object, string } from 'yup';
import NavLogo from './../components/navbar/nav-logo.vue';
import AppPageBody from '../components/app-page-body.vue';
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

const loginErrorMsgResName = ref();
const schema = computed(() => 
  object({
    email: string().email(t(getI18nResName2('validations', 'email'))).required(t(getI18nResName2('validations', 'required'))),
    password: string().required(t(getI18nResName2('validations', 'required')))
  })
);

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

const state = reactive({
  email: undefined,
  password: undefined
});

async function onSubmit (_: FormSubmitEvent<any>) {
  logger.verbose('(Login) submit handler triggered');
  loginErrorMsgResName.value = '';
  await mySignInHandler(state.email!, state.password!);
}

async function onError (event: FormErrorEvent) {
  logger.verbose('(Login) failed validation handler triggered', event.errors);
  const element = document.getElementById(event.errors[0].id);
  element?.focus();
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

</script>

<template>
  <AppPageBody>
    <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <div class="md:flex md:flex-row md:flex-nowrap md:gap-[60px] xl:gap-[104px]">
        <NavLogo ctrl-key="standaloneAppLogo" class="md:absolute md:mt-[77px] lg:mt-0 lg:!left-[-55px] xl:!left-[-55px]"/>
        <div class="w-auto h-auto flex-1 basis-auto md:pt-[77px] md:pb-[104px] md:mb-[123px]">
          <h1 class="text-gray-600 dark:text-gray-300 text-5xl font-normal mt-[36px] md:mt-[102px] lg:mt-[64px]">
            {{ t(getI18nResName2('loginPage', 'title')) }}
          </h1>
          <div class="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-normal mt-4">
            {{ t(getI18nResName2('loginPage', 'subTitle')) }}
          </div>
          <UForm :schema="schema" :state="state" class="mt-12 space-y-4" @submit="onSubmit" @error="onError">
            <UFormGroup name="email" :label="t(getI18nResName2('accountPageCommon', 'emailLabel'))">
              <UInput v-model.trim="state.email" :placeholder="t(getI18nResName2('accountPageCommon', 'emailPlaceholder'))" />
            </UFormGroup>

            <UFormGroup name="password" :label="t(getI18nResName2('accountPageCommon', 'passwordLabel'))" class="pb-6">
              <UInput v-model="state.password" type="password" :placeholder="t(getI18nResName2('accountPageCommon', 'passwordPlaceholder'))" />
            </UFormGroup>

            <ULink class="text-sm sm:text-base text-orange-500 dark:text-orange-400" :to="navLinkBuilder.buildPageLink(AppPage.ForgotPassword, locale as Locale)" color="orange">
              {{ $t(getI18nResName3('loginPage', 'forms', 'forgotPassword')) }}
            </ULink>
            <div v-if="loginErrorMsgResName?.length" class="text-red-500 text-sm sm:text-base mt-3">
              {{ $t(loginErrorMsgResName) }}
            </div>

            <UButton type="submit" class="w-full h-auto !mt-7 md:!mt-10 justify-center" size="xl">
              {{ t(getI18nResName2('accountPageCommon', 'login')) }}
            </UButton>
          </UForm>
          <div class="text-center text-sm sm:text-base mt-6">
            {{ $t(getI18nResName2('loginPage', 'havingAccount')) }}
            <ULink class="inline-block text-orange-500 dark:text-orange-400" :to="navLinkBuilder.buildPageLink(AppPage.Signup, locale as Locale)">{{ $t(getI18nResName2('accountPageCommon', 'signUp')) }}</ULink>
          </div>
          <OAuthProviderList ctrl-key="LoginProviders" :divisor-label-res-name="getI18nResName2('accountPageCommon', 'loginWith')" @click="onOAuthProviderClick" />
        </div>
        <AccountFormPhotos ctrl-key="LoginPhotos" :ui="{ wrapper: 'md:mt-[77px] !h-[812px]', image: { wrapper: '!h-[812px]', img: '!h-[812px]' } }"/>
      </div>  
    </div>
  </AppPageBody>
</template>

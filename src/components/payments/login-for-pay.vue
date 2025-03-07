<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type Locale, AppPage, AuthProvider, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { formatAuthCallbackUrl } from './../../helpers/dom';
import OAuthProviderList from './../../components/account/oauth-providers-list.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { usePreviewState } from './../../composables/preview-state';

interface IProps {
  ctrlKey: ControlKey
};
defineProps<IProps>();

const { locale } = useI18n();
const { signIn } = useAuth();
const navLinkBuilder = useNavLinkBuilder();
const route = useRoute();
const { enabled } = usePreviewState();

async function onEmailLoginClick (): Promise<void> {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale, { originPath: formatAuthCallbackUrl(route.fullPath, enabled) }));
}

async function onOAuthProviderClick (provider: AuthProvider): Promise<void> {
  const oauthOptions = { callbackUrl: formatAuthCallbackUrl(route.fullPath, enabled), redirect: true };
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
  <div class="login-for-pay brdr-3 p-xs-3">
    <h2 class="login-for-pay-caption">
      {{ $t(getI18nResName3('payments', 'loginToPay', 'title')) }}
    </h2>
    <OAuthProviderList :ctrl-key="[...ctrlKey, 'OauthProviders']" @click="onOAuthProviderClick" />
    <SimpleButton
      :ctrl-key="[...ctrlKey, 'Login', 'Email']"
      kind="support"
      icon="mail"
      class="email-login-btn py-xs-3 brdr-1 mt-xs-3"
      :label-res-name="getI18nResName3('payments', 'loginToPay', 'withEmail')"
      :aria-label-res-name="getI18nResName2('ariaLabels', 'btnLoginViaEmail')"
      @click="onEmailLoginClick"
    />
  </div>
</template>

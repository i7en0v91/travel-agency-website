<script setup lang="ts">
import { withQuery } from 'ufo';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import OAuthProviderList from './../../components/account/oauth-providers-list.vue';
import { AuthProvider } from './../../shared/interfaces';
import { HtmlPage, getHtmlPagePath } from './../../shared/page-query-params';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const { signIn } = useAuth();
const localePath = useLocalePath();
const route = useRoute();

async function onEmailLoginClick (): Promise<void> {
  await navigateTo(withQuery(localePath(`/${getHtmlPagePath(HtmlPage.Login)}`), { callbackUrl: route.fullPath }));
}

function onOAuthProviderClick (provider: AuthProvider) {
  const oauthOptions = { callbackUrl: route.fullPath, external: true, redirect: true };
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
  <div class="login-for-pay brdr-3 p-xs-3">
    <h2 class="login-for-pay-caption">
      {{ $t(getI18nResName3('payments', 'loginToPay', 'title')) }}
    </h2>
    <OAuthProviderList :ctrl-key="`${ctrlKey}-OAuthLogin`" @click="onOAuthProviderClick" />
    <SimpleButton
      :ctrl-key="`${ctrlKey}-EmailLogin`"
      kind="support"
      icon="mail"
      class="email-login-btn py-xs-3 brdr-1 mt-xs-3"
      :label-res-name="getI18nResName3('payments', 'loginToPay', 'withEmail')"
      :aria-label-res-name="getI18nResName2('ariaLabels', 'btnLoginViaEmail')"
      @click="onEmailLoginClick"
    />
  </div>
</template>

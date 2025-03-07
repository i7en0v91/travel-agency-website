<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AuthProvider, getI18nResName3 } from '@golobe-demo/shared';
import { formatAuthCallbackUrl } from './../../helpers/dom';
import OAuthProviderList from './../../components/account/oauth-providers-list.vue';
import { usePreviewState } from './../../composables/preview-state';

interface IProps {
  ctrlKey: ControlKey
};
defineProps<IProps>();

const { signIn } = useAuth();
const route = useRoute();
const { enabled } = usePreviewState();

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
  <div class="w-full h-auto p-4 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-gray-700">
    <h2 class="w-full h-auto text-gray-600 dark:text-gray-300 font-semibold text-xl">
      {{ $t(getI18nResName3('payments', 'loginToPay', 'title')) }}
    </h2>
    <OAuthProviderList :ctrl-key="[...ctrlKey, 'OauthProviders']" email-option @click="onOAuthProviderClick"/>
  </div>
</template>

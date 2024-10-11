<script setup lang="ts">

import { isDevOrTestEnv, isQuickStartEnv, type I18nResName, getI18nResName2, AuthProvider } from '@golobe-demo/shared';
import OAuthBtn from './oauth-btn.vue';

interface IProps {
  ctrlKey: string,
  divisorLabelResName?: I18nResName | undefined
}
withDefaults(defineProps<IProps>(), {
  divisorLabelResName: undefined
});

const showTestLocalProvider = isDevOrTestEnv() || isQuickStartEnv();
const thirdPartyOAuthEnabled = !isQuickStartEnv();

const $emit = defineEmits(['click']);
function onAuthBtnBlick (provider: AuthProvider) {
  $emit('click', provider);
}

</script>

<template>
  <div class="mt-[28px] md:mt-[40px]">
    <UDivider v-if="divisorLabelResName" :label="$t(divisorLabelResName)" class="w-full h-auto" />
    <ol class="flex flex-row flex-wrap gap-4 justify-center mx-auto mt-[28px] md:mt-[40px]">
      <li>
        <OAuthBtn :ctrl-key="`${ctrlKey}-oauthGoogle`" :provider="AuthProvider.Google" :enabled="thirdPartyOAuthEnabled" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGoogleLogin')" @click="() => onAuthBtnBlick(AuthProvider.Google)" />
      </li>
      <li>
        <OAuthBtn :ctrl-key="`${ctrlKey}-oauthGitHub`" :provider="AuthProvider.GitHub" :enabled="thirdPartyOAuthEnabled" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGithubLogin')" @click="() => onAuthBtnBlick(AuthProvider.GitHub)" />
      </li>
      <li v-if="showTestLocalProvider">
        <OAuthBtn :ctrl-key="`${ctrlKey}-oauthTestLocal`" :enabled="true" :provider="AuthProvider.TestLocal" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnTestLocalLogin')" @click="() => onAuthBtnBlick(AuthProvider.TestLocal)" />
      </li>
    </ol>
  </div>
</template>

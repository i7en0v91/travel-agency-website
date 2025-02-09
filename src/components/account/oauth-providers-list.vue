<script setup lang="ts">

import { isElectronBuild, isDevOrTestEnv, isQuickStartEnv, type I18nResName, getI18nResName2, AuthProvider } from '@golobe-demo/shared';
import OAuthBtn from './oauth-btn.vue';

interface IProps {
  ctrlKey: string,
  divisorLabelResName?: I18nResName
}
defineProps<IProps>();

const showTestLocalProvider = isDevOrTestEnv() || isQuickStartEnv() || isElectronBuild();
const thirdPartyOAuthEnabled = !isQuickStartEnv() && !isElectronBuild();

const $emit = defineEmits(['click']);
function onAuthBtnBlick (provider: AuthProvider) {
  $emit('click', provider);
}

</script>

<template>
  <div class="oauth-providers-list-div">
    <div v-if="divisorLabelResName" class="providers-list-divisor">
      <div class="providers-list-divisor-label pl-xs-3 pr-xs-3">
        {{ $t(divisorLabelResName) }}
      </div>
    </div>
    <ol class="oauth-providers-list">
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

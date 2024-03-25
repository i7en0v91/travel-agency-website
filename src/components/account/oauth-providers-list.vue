<script setup lang="ts">

import { type I18nResName, getI18nResName2 } from './../../shared/i18n';
import { AuthProvider } from './../../shared/interfaces';
import { isDevOrTestEnv, isQuickStartEnv } from './../../shared/constants';
import OAuthBtn from './oauth-btn.vue';

interface IProps {
  ctrlKey: string,
  divisorLabelResName: I18nResName
}
const props = defineProps<IProps>();

const showTestLocalProvider = isDevOrTestEnv() || isQuickStartEnv();
const thirdPartyOAuthEnabled = !isQuickStartEnv();

const $emit = defineEmits(['click']);
function onAuthBtnBlick (provider: AuthProvider) {
  $emit('click', provider);
}

</script>

<template>
  <div class="oauth-providers-list-div">
    <div class="providers-list-divisor">
      <div class="providers-list-divisor-label pl-xs-3 pr-xs-3">
        {{ $t(props.divisorLabelResName) }}
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

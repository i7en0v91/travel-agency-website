<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { isElectronBuild, type Locale, AppPage, getI18nResName3, isDevOrTestEnv, isQuickStartEnv, type I18nResName, getI18nResName2, AuthProvider } from '@golobe-demo/shared';
import OAuthBtn from './oauth-btn.vue';
import { formatAuthCallbackUrl } from './../../helpers/dom';

interface IProps {
  ctrlKey: ControlKey,
  divisorLabelResName?: I18nResName,
  emailOption?: boolean
}
const { emailOption = false } = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const route = useRoute();
const { enabled } = usePreviewState();

const showTestLocalProvider = isDevOrTestEnv() || isQuickStartEnv() || isElectronBuild();
const thirdPartyOAuthEnabled = !isQuickStartEnv() && !isElectronBuild();

const $emit = defineEmits(['click']);
function onAuthBtnBlick (provider: AuthProvider) {
  $emit('click', provider);
}

async function onEmailLoginClick (): Promise<void> {
  await navigateTo(navLinkBuilder.buildPageLink(AppPage.Login, locale.value as Locale, { originPath: formatAuthCallbackUrl(route.fullPath, enabled) }));
}

const authBtnUi = 'min-w-[300px] sm:min-w-[80px]';

</script>

<template>
  <div>
    <UDivider v-if="divisorLabelResName" :label="$t(divisorLabelResName)" class="w-full h-auto" />
    <ol :class="`flex flex-row flex-wrap gap-0 justify-center ${showTestLocalProvider ? '*:basis-1/3' : '*:basis-1/2'} *:px-2 gap-y-4 mx-auto mt-7 md:mt-10`">
      <li>
        <OAuthBtn :ctrl-key="[...ctrlKey, 'Oauth', 'Google']" :provider="AuthProvider.Google" :enabled="thirdPartyOAuthEnabled" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGoogleLogin')" :ui="authBtnUi" @click="() => onAuthBtnBlick(AuthProvider.Google)" />
      </li>
      <li>
        <OAuthBtn :ctrl-key="[...ctrlKey, 'Oauth', 'GitHub']" :provider="AuthProvider.GitHub" :enabled="thirdPartyOAuthEnabled" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGithubLogin')" :ui="authBtnUi" @click="() => onAuthBtnBlick(AuthProvider.GitHub)" />
      </li>
      <li v-if="showTestLocalProvider">
        <OAuthBtn :ctrl-key="[...ctrlKey, 'Oauth', 'TestLocal']" :enabled="true" :provider="AuthProvider.TestLocal" :aria-label-res-name="getI18nResName2('ariaLabels', 'btnTestLocalLogin')" :ui="authBtnUi" @click="() => onAuthBtnBlick(AuthProvider.TestLocal)" />
      </li>
      <li v-if="emailOption" class="flex-initial sm:flex-1">
        <UButton icon="i-material-symbols-mail-rounded" size="lg" :ui="{ base: `justify-center text-center w-full mx-auto ${authBtnUi}` }" variant="outline" color="primary" :aria-label="$t(getI18nResName2('ariaLabels', 'btnLoginViaEmail'))" @click="onEmailLoginClick">
          {{ $t(getI18nResName3('payments', 'loginToPay', 'withEmail')) }}
        </UButton>
      </li>
    </ol>
  </div>
</template>

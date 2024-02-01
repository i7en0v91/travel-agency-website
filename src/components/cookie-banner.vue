<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SimpleButton from './forms/simple-button.vue';
import { CookieNames, TabIndicesUpdateDefaultTimeout } from './../shared/constants';
import { updateTabIndices } from './../shared/dom';

interface IProps {
  ctrlKey: string
}

defineProps<IProps>();

const ConsentCookieValue = 'consent-given';

const consentCookie = useCookie(CookieNames.CookieAndPolicyConsent, { path: '/', maxAge: 2147483640 /** "never" expire */ });
const localePath = useLocalePath();
const logger = CommonServicesLocator.getLogger();

function onAcceptBtnClick () {
  logger.info('(CookieBanner) accept button clicked');
  if (!consentCookie.value) {
    consentCookie.value = ConsentCookieValue;
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
}

</script>

<template>
  <section v-if="consentCookie !== ConsentCookieValue" class="cookie-banner px-xs-3 px-s-4 py-xs-4 tabbable tabbable-group-cookie-banner tabbable-last" role="contentinfo">
    <div class="cookie-banner-text">
      <h3 class="cookie-banner-title">
        {{ $t(getI18nResName2('cookieBanner', 'title')) }}
      </h3>
      <i18n-t :keypath="getI18nResName2('cookieBanner', 'text')" tag="div" scope="global" class="cookie-banner-text mt-xs-2 mt-s-3">
        <template #privacyLink>
          <NuxtLink class="cookie-banner-privacy-link brdr-1 tabbable-group-cookie-banner" target="_blank" :to="localePath('/privacy')">
            {{ $t(getI18nResName2('signUpPage', 'privacyLinkText')) }}
          </NuxtLink>
        </template>
      </i18n-t>
    </div>
    <SimpleButton kind="accent" class="cookie-banner-accept-btn tabbable-group-cookie-banner" :ctrl-key="`${ctrlKey}-acceptBtn`" :label-res-name="getI18nResName2('cookieBanner', 'btnAccept')" @click="onAcceptBtnClick" />
  </section>
</template>

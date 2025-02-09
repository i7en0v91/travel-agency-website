<script setup lang="ts">
import { AppPage, type Locale, CookiePolicyConsent, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from './../../helpers/service-accessors';
import { LocatorClasses } from './../../helpers/constants';

interface IProps {
  ctrlKey: string
}

defineProps<IProps>();

const ConsentCookieValue = 'consent-given';

const consentCookie = useCookie(CookiePolicyConsent, { path: '/', maxAge: 2147483640 /** "never" expire */ });
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();
const logger = getCommonServices().getLogger();

function onAcceptBtnClick () {
  logger.info('(CookieBanner) accept button clicked');
  if (!consentCookie.value) {
    consentCookie.value = ConsentCookieValue;
  }
}

</script>

<template>
  <section v-if="consentCookie !== ConsentCookieValue" class="w-full h-auto max-w-lvw px-4 sm:px-6 py-6 bottom-0 fixed z-cookies flex flex-col items-center gap-4 text-sm bg-primary-200 dark:bg-gray-700 sm:flex-row sm:gap-6 sm:items-end sm:text-base" role="contentinfo">
    <div class="text-primary-600 dark:text-gray-400 font-normal flex-grow-[4] flex-shrink basis-auto w-full text-center sm:text-left">
      <h3 class="text-4xl font-semibold break-all">
        {{ $t(getI18nResName2('cookieBanner', 'title')) }}
      </h3>
      <i18n-t :keypath="getI18nResName2('cookieBanner', 'text')" tag="div" scope="global" class="mt-2 sm:mt-4">
        <template #privacyLink>
          <ULink 
            class="font-bold underline" 
            target="_blank" 
            :to="navLinkBuilder.buildPageLink(AppPage.Privacy, locale as Locale)">
            {{ $t(getI18nResName2('signUpPage', 'privacyLinkText')) }}
          </ULink>
        </template>
      </i18n-t>
    </div>
    <UButton size="xl" :class="`flex-grow flex-shrink-[4] basis-auto w-full min-w-[130px] justify-center ${LocatorClasses.CookieBannerBtn}`" variant="solid" color="primary" @click="onAcceptBtnClick">
      {{ $t(getI18nResName2('cookieBanner', 'btnAccept')) }}
    </UButton>
  </section>
</template>

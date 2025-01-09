<script setup lang="ts">

import { QueryInternalRequestParam, AppPage, getPagePath, getI18nResName2, isElectronBuild } from '@golobe-demo/shared';
import type { IMainWorldExports } from '../electron/interfaces';

const route = useRoute();
const { t, locale } = useI18n();
useLocaleHead({
  addDirAttribute: true,
  addSeoAttributes: true
});

const title = computed(() => (route.meta.title as any)?.resName ? t((route.meta.title as any).resName.toString(), (route.meta.title as any).resArgs) : '');

useHead({
  htmlAttrs: {
    lang: locale
  },
  script: [
    { src: '/js/page-load.min.js', type: 'module' },
    { src: 'https://www.google.com/recaptcha/api.js' }
  ],
  titleTemplate: computed(() => `%s %separator ${t(getI18nResName2('site', 'name'))}`),
  title
});

useServerSeoMeta({
  title,
  description: t(getI18nResName2('site', 'description')),
  ogLocale: locale,
  ogSiteName: t(getI18nResName2('site', 'name')),
  ogDescription: t(getI18nResName2('site', 'description'))
});

await usePageSetup();

const siteSearchOpen = ref(false);
if(isElectronBuild()) {
  const electronApi = (window as any).electronApi as IMainWorldExports;
  electronApi?.onRequestShowSiteSearch((_) => {
    if(!siteSearchOpen.value) {
      siteSearchOpen.value = true;
    }
  });
}

const error = useError();
const isAuthFormsPage = computed(() => route.path.includes(`/${getPagePath(AppPage.Login)}`) || route.path.includes(`/${getPagePath(AppPage.Signup)}`) || route.path.includes(`/${getPagePath(AppPage.ForgotPassword)}`) || route.path.includes(`/${getPagePath(AppPage.EmailVerifyComplete)}`));
const showDefaultComponents = computed(() => error.value || !isAuthFormsPage.value);
const hideInElectron = isElectronBuild() ? {
  navBar: true,
  footer: import.meta.client && (route.query ?? {})[QueryInternalRequestParam] === '1',
  cookies: import.meta.client && (route.query ?? {})[QueryInternalRequestParam] === '1'
} : undefined;

</script>

<template>
  <div class="page-content bg-gray-50 dark:bg-gray-900 w-full min-h-lvh min-w-minpgw">
    <NavBar v-if="!hideInElectron?.navBar && showDefaultComponents" ctrl-key="NavBar">
      <div class="w-full h-auto relative z-0">
        <slot/>
        <AppFooter v-if="!hideInElectron?.footer" ctrl-key="Footer" />
      </div>
    </NavBar>
    <div v-else-if="showDefaultComponents" class="w-full h-auto relative z-0">
      <div class="w-full h-auto relative z-0">
        <slot/>
        <AppFooter v-if="!hideInElectron?.footer" ctrl-key="Footer" />
      </div>
    </div>
    <div v-else class="w-full h-auto relative z-0">
      <NavLogo v-if="!isAuthFormsPage && !hideInElectron?.navBar" ctrl-key="standaloneAppLogo" />
      <slot/>
    </div>
    <ClientOnly>
      <CookieBanner v-if="!hideInElectron?.cookies" ctrl-key="CookieBanner" />
      <UModal
        v-if="isElectronBuild()"
        v-model="siteSearchOpen" 
        :ui="{ 
          container: 'items-bottom sm:items-center md:items-center',
          width: 'w-[90vw] min-w-[300px] max-w-minpgw sm:max-w-lg lg:max-w-2xl',
          height: 'h-[60vh] max-h-[60vh] sm:h-[50vh] sm:max-h-[50vh]' 
        }">
        <SiteSearch 
          ctrl-key="siteSearch" 
          @close="siteSearchOpen = false"/>
      </UModal>
      <UNotifications />
    </ClientOnly>
  </div>
</template>

<style global>
  html {
    /** for modal dialogs - all use overlays with background scrolling allowed */
    overflow-y: auto !important;
    padding-right: 0 !important
  }
</style>
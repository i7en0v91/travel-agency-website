<script setup lang="ts">

import type { ControlKey } from './../helpers/components';
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

const CtrlKey: ControlKey = ['Layout'];

await usePageSetup();

const siteSearchOpen = ref(false);
if(isElectronBuild()) {
  const electronApi = (window as any).electronApi as IMainWorldExports;
  electronApi?.onRequestShowSiteSearch((_) => {
    if(!siteSearchOpen.value) {
      siteSearchOpen.value = true;
    }
  });
  (globalThis as any).$navLinkBuilder = useNavLinkBuilder();
}

const error = useError();
const useHardLinks = !!error.value && !!useNuxtApp().isHydrating;
const isAuthFormsPage = computed(() => route.path.includes(`/${getPagePath(AppPage.Login)}`) || route.path.includes(`/${getPagePath(AppPage.Signup)}`) || route.path.includes(`/${getPagePath(AppPage.ForgotPassword)}`) || route.path.includes(`/${getPagePath(AppPage.EmailVerifyComplete)}`));
const showDefaultComponents = computed(() => !isAuthFormsPage.value);
const hideInElectron = isElectronBuild() ? {
  navBar: true,
  footer: import.meta.client && (route.query ?? {})[QueryInternalRequestParam] === '1',
  cookies: import.meta.client && (route.query ?? {})[QueryInternalRequestParam] === '1'
} : undefined;


const ContentWrapperClass = "w-full h-auto relative z-pgcontent bg-gray-50 dark:bg-gray-900";
const SlotWrapperClass = "w-full h-auto min-h-mincontvhxs lg:min-h-mincontvhlg xxl:min-h-mincontvhxxl";

</script>

<template>
  <div class="bg-gray-50 dark:bg-gray-900 w-full min-h-lvh min-w-minpgw">
    <NavBar v-if="!hideInElectron?.navBar && showDefaultComponents" :ctrl-key="[...CtrlKey, 'NavBar']" :hard-links="useHardLinks">
      <div :class="ContentWrapperClass">
        <div :class="SlotWrapperClass">
          <slot/>
        </div>
        <AppFooter v-if="!hideInElectron?.footer" :ctrl-key="[...CtrlKey, 'Footer']" :hard-links="useHardLinks" />
      </div>
    </NavBar>
    <div v-else-if="showDefaultComponents" class="contents">
      <UContainer class="pt-4">
        <div class="absolute w-full max-w-[inherit] top-0 bottom-0 bg-primary-300 dark:bg-gray-800" />
        <div :class="ContentWrapperClass">
          <div :class="SlotWrapperClass">
            <slot />
          </div>
          <!-- nav bar is hidden in Electron build, show only footer -->
          <AppFooter v-if="!hideInElectron?.footer" :ctrl-key="[...CtrlKey, 'Footer']" :hard-links="useHardLinks" />
        </div>
      </UContainer>
    </div>
    <div v-else class="contents">
      <NavLogo v-if="!isAuthFormsPage && !hideInElectron?.navBar" :ctrl-key="[...CtrlKey, 'NavLogo']" :hard-link="useHardLinks" />
      <UContainer class="pt-4">
        <div :class="ContentWrapperClass">
          <div :class="SlotWrapperClass">
            <slot />
          </div>
        </div>
      </UContainer>
    </div>
    <ClientOnly>
      <CookieBanner v-if="!hideInElectron?.cookies" :ctrl-key="[...CtrlKey, 'CookieBanner']" />
      <UModal
        v-if="isElectronBuild()"
        v-model="siteSearchOpen" 
        :ui="{ 
          container: 'items-bottom sm:items-center md:items-center',
          width: 'w-[90vw] min-w-[300px] max-w-minpgw sm:max-w-lg lg:max-w-2xl',
          height: 'h-[60vh] max-h-[60vh] sm:h-[50vh] sm:max-h-[50vh]' 
        }">
        <SiteSearch 
          :ctrl-key="[...CtrlKey, 'SiteSearch']"
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
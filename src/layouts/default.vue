<script setup lang="ts">

import 'vue-toastification/dist/index.css';
import 'cropperjs/dist/cropper.css';
import 'vue3-perfect-scrollbar/style.css';
import '@vueform/slider/themes/default.css';

import { QueryInternalRequestParam, AppPage, getPagePath, MainTitleSlug, lookupPageByUrl, getI18nResName2, ImageCategory, isElectronBuild } from '@golobe-demo/shared';
import { type NavBarMode } from './../types';
import { ModalsContainer } from 'vue-final-modal';
import AppContainer from './../components/app-container.vue';
import NavBar from './../components/navbar/nav-bar.vue';
import HeadingText from './../components/index/main-heading-text.vue';
import AppFooter from './../components/footer/app-footer.vue';
import CookieBanner from './../components/cookie-banner.vue';
import SearchPageHead from './../components/common-page-components/search-page-head.vue';

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
    // { src: 'https://www.google.com/recaptcha/api.js' }
  ],
  link: [
    { rel: 'icon', href: '/img/waiter.gif' }
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

const navBarMode : ComputedRef<NavBarMode> = computed(
  () => (lookupPageByUrl(route.path) === AppPage.Index && !error.value) ? 'landing' : 'inApp');

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
  <div>
    <AppContainer>
      <SearchPageHead
        v-if="navBarMode === 'landing' && showDefaultComponents"
        ctrl-key="SearchPageHead"
        class="search-page-head-landing"
        :image-entity-src="{ slug: MainTitleSlug }"
        :category="ImageCategory.MainTitle"
        :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
        overlay-class="search-page-head-landing-overlay"
      >
        <NavBar v-if="!hideInElectron?.navBar" ctrl-key="NavBar" :mode="navBarMode" />
        <HeadingText ctrl-key="IndexPageMainHeading" />
      </SearchPageHead>
      <NavBar v-else-if="showDefaultComponents && !hideInElectron?.navBar" ctrl-key="NavBar" :mode="navBarMode" />
      <slot />
      <AppFooter v-if="showDefaultComponents && !hideInElectron?.footer" ctrl-key="footer" />
    </AppContainer>
    <ClientOnly>
      <CookieBanner v-if="!hideInElectron?.cookies" ctrl-key="CookieBanner" />
    </ClientOnly>
    <ModalsContainer />
  </div>
</template>

<style lang="scss">
    @use "~/assets/scss/utils";
    @use "~/assets/scss/themes";
    @use "~/assets/scss/main";
    @use "~/assets/scss/system";
    @use "~/assets/scss/transitions";
    @use "~/assets/scss/user-notification";
    @use "~/assets/scss/buttons";
    @use "~/assets/scss/option-buttons";
    @use "~/assets/scss/dropdowns";
    @use "~/assets/scss/checkbox";
    @use "~/assets/scss/images";
    @use "~/assets/scss/nav";
    @use "~/assets/scss/footer";
    @use "~/assets/scss/account";
    @use "~/assets/scss/user-account";
    @use "~/assets/scss/property-grid";
    @use "~/assets/scss/privacy";
    @use "~/assets/scss/common-page-components";
    @use "~/assets/scss/offers-list-view";
    @use "~/assets/scss/index-page";
    @use "~/assets/scss/flights-page";
    @use "~/assets/scss/stays-page";
    @use "~/assets/scss/search-flights-page";
    @use "~/assets/scss/search-stays-page";
    @use "~/assets/scss/flight-details-page";
    @use "~/assets/scss/stay-details-page";
    @use "~/assets/scss/flight-book-page";
    @use "~/assets/scss/stay-book-page";
    @use "~/assets/scss/payments";
    @use "~/assets/scss/booking-details-page";
    @use "~/assets/scss/favourites-page";
</style>

<script setup lang="ts">

import { AppPage, getPagePath, MainTitleSlug, lookupPageByUrl, getI18nResName2, ImageCategory } from '@golobe-demo/shared';
/*
import { ModalsContainer } from 'vue-final-modal';
import AppContainer from './../components/app-container.vue';
import NavBar from './../components/navbar/nav-bar.vue';
import HeadingText from './../components/index/main-heading-text.vue';
import AppFooter from './../components/footer/app-footer.vue';
import CookieBanner from './../components/cookie-banner.vue';
import SearchPageHead from './../components/common-page-components/search-page-head.vue';
*/

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
    { src: '/js/page-load.min.js' },
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

const error = useError();
const isAuthFormsPage = computed(() => route.path.includes(`/${getPagePath(AppPage.Login)}`) || route.path.includes(`/${getPagePath(AppPage.Signup)}`) || route.path.includes(`/${getPagePath(AppPage.ForgotPassword)}`) || route.path.includes(`/${getPagePath(AppPage.EmailVerifyComplete)}`));
const showDefaultComponents = computed(() => error.value || !isAuthFormsPage.value);

</script>

<template>
  <div class="page-content w-full h-full min-w-minpgw">
    <NavBar v-if="showDefaultComponents" ctrl-key="NavBar">
      <div class="w-full h-auto px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
        <slot/>
      </div>
    </NavBar>
    <div v-else class="w-full h-auto px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <ClientOnly>
        <NavLogo v-if="!isAuthFormsPage" ctrl-key="standaloneAppLogo" />
      </ClientOnly>
      <slot/>
    </div>
    <ClientOnly>
      <UNotifications />
    </ClientOnly>
    
    
        <!--
        <SearchPageHead
          v-if="navBarMode === 'landing' && showDefaultComponents"
          ctrl-key="SearchPageHead"
          class="search-page-head-landing"
          :image-entity-src="{ slug: MainTitleSlug }"
          :category="ImageCategory.MainTitle"
          :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
          overlay-class="search-page-head-landing-overlay"
        >
          <NavBar ctrl-key="NavBar"  />
          <HeadingText ctrl-key="IndexPageMainHeading" />
        </SearchPageHead>
        <NavBar v-else-if="showDefaultComponents" ctrl-key="NavBar" :mode="navBarMode" />
        <slot />
        <AppFooter v-if="showDefaultComponents" ctrl-key="footer" />
      </AppContainer>
      <ClientOnly>
        <CookieBanner ctrl-key="CookieBanner" />
      </ClientOnly>
      <ModalsContainer />
    -->
  </div>
</template>

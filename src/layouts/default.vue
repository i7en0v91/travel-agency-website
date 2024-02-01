<script setup lang="ts">

import 'vue-toastification/dist/index.css';
import 'cropperjs/dist/cropper.css';
import 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css';

import Toast, { type PluginOptions, POSITION as ToastPosition } from 'vue-toastification';
import { ModalsContainer } from 'vue-final-modal';
import { getI18nResName2, getI18nResName1 } from './../shared/i18n';
import AppContainer from './../components/app-container.vue';
import NavBar from './../components/navbar/nav-bar.vue';
import HeadingText from './../components/index/main-heading-text.vue';
import AppConfig from './../appconfig';
import { useUserNotificationStore } from './../stores/user-notification-store';
import { type NavBarMode, ImageCategory } from './../shared/interfaces';
import { isLandingPageUrl } from './../shared/common';
import { MainTitleSlug } from './../shared/constants';
import AppFooter from './../components/footer/app-footer.vue';
import CookieBanner from './../components/cookie-banner.vue';
import SearchPageHead from './../components/common-page-components/search-page-head.vue';

const route = useRoute();
const { t, locale } = useI18n();
useLocaleHead({
  addDirAttribute: true,
  // identifierAttribute: 'id',
  addSeoAttributes: true
});

useHead({
  htmlAttrs: {
    lang: locale
  },
  script: [
    { src: '/js/page-load.min.js' },
    { src: '/js/canvas-to-blob.min.js', defer: true }
    // { src: 'https://www.google.com/recaptcha/api.js' }
  ],
  link: [
    { rel: 'icon', href: '/img/waiter.gif' }
  ],
  titleTemplate: computed(() => `%s %separator ${t(getI18nResName2('site', 'name'))}`),
  title: computed(() => route.meta.title ? t(route.meta.title.toString()) : ''),
  // at the moment nuxt seo module doesn't fully support i18n so define SEO attributes manually
  meta: [{
    property: 'og:site_name', content: t(getI18nResName2('site', 'name'))
  }, {
    property: 'title', content: t(getI18nResName2('site', 'name'))
  }, {
    name: 'description', content: t(getI18nResName2('site', 'description'))
  }, {
    property: 'og:description', content: t(getI18nResName2('site', 'description'))
  }, {
    property: 'locale', content: locale
  }, {
    property: 'og:locale', content: locale
  }]
});

const nuxtApp = useNuxtApp();

const toastOptions : PluginOptions = {
  maxToasts: AppConfig.userNotifications.maxItems,
  timeout: AppConfig.userNotifications.timeoutMs,
  position: ToastPosition.TOP_CENTER,
  hideProgressBar: true,
  containerClassName: 'user-notification-container mt-xs-2',
  toastClassName: 'user-notification-toast mb-xs-2 brdr-2',
  closeButtonClassName: 'user-notification-button',
  filterBeforeCreate: filterNotificationDuplicates
};
nuxtApp.vueApp.use(Toast, toastOptions);

const userNotificationStore = useUserNotificationStore();
onMounted(() => {
  userNotificationStore.handleAppMount();
});

function filterNotificationDuplicates (
  toast: any,
  toasts: any[]
): any {
  if (AppConfig.userNotifications.filterDuplicates) {
    if (toasts.filter(t => t.content.toString() === toast.content.toString()).length !== 0) {
      return false;
    }
  }
  return toast;
}

const navBarMode : ComputedRef<NavBarMode> = computed(
  () => (isLandingPageUrl(route.path) && !error.value) ? 'landing' : 'inApp');

const error = useError();
const isAuthFormsPage = computed(() => route.path.includes('/login') || route.path.includes('/signup') || route.path.includes('/forgot-password') || route.path.includes('/email-verify'));
const showDefaultComponents = computed(() => error.value || !isAuthFormsPage.value);

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
        :image-alt-res-name="getI18nResName1('searchPageImageAlt')"
      >
        <NavBar ctrl-key="NavBar" :mode="navBarMode" />
        <HeadingText ctrl-key="IndexPageMainHeading" />
      </SearchPageHead>
      <NavBar v-else-if="showDefaultComponents" ctrl-key="NavBar" :mode="navBarMode" />
      <slot />
      <AppFooter v-if="showDefaultComponents" ctrl-key="footer" />
    </AppContainer>
    <CookieBanner ctrl-key="CookieBanner" />
    <ModalsContainer />
  </div>
</template>

<style lang="scss">
    @use "~/assets/scss/utils";
    @use "~/assets/scss/themes";
    @use "~/assets/scss/svg";
    @use "~/assets/scss/main";
    @use "~/assets/scss/system";
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
    @use "~/assets/scss/index-page";
    @use "~/assets/scss/flights-page";
    @use "~/assets/scss/stays-page";
    @use "~/assets/scss/search-flights-page";
    @use "~/assets/scss/search-stays-page";
</style>

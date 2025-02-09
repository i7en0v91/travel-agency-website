<script setup lang="ts">
import { type Locale, AppPage, getI18nResName2 } from '@golobe-demo/shared';
import SubscribeBox from './subscribe-box.vue';
import AppFooterNav from './app-footer-nav.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import NavLogoFooter from '~/public/img/logo-footer.svg';
import NavLogoLight from '~/public/img/logo-light.svg';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const socialLinks = [{
    icon: 'line-md-twitter-x',
    link: 'https://x.com',
    ariaResName: getI18nResName2('ariaLabels', 'footerSocialLinkTwitter')
  }, {
    icon: 'ion-logo-youtube',
    link: 'https://www.youtube.com',
    ariaResName: getI18nResName2('ariaLabels', 'footerSocialLinkYoutube')
  }];

</script>
<template>
  <footer class="relative w-full bg-primary-300 dark:bg-gray-800 pb-[100px]">
    <div class="mt-[151px] w-full h-auto px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <div class="-translate-y-[91px] block w-full h-auto">
        <SubscribeBox ctrl-key="subscribeBox" />
      </div>
    </div>
    <section class="flex flex-col sm:flex-row flex-nowrap items-center sm:items-start gap-4 px-[14px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <section class="min-w-[200px] flex-initial mb-4 sm:mb-0">
        <ULink class="w-min block mx-auto sm:mx-0 focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
          <NavLogoFooter class="!w-32 !h-auto block dark:hidden" filled />
          <NavLogoLight class="!w-32 !h-auto hidden dark:block" filled />
        </ULink>
        <div class="w-full flex flex-row flex-nowrap items-center gap-[13px] justify-center sm:justify-start mt-4">
          <div v-for="link in socialLinks" :key="`social-link-${link.icon}`" class="flex-grow-0 flex-shrink basis-auto w-min">
            <ULink class="block focus-visible:outline-primary-500 dark:focus-visible:outline-primary-400" :to="link.link"  target="_blank" external>
              <UIcon :name="link.icon" class="block w-6 h-6 bg-black dark:bg-white" :aria-label="$t(link.ariaResName)"/>
            </ULink>
          </div>          
        </div>
      </section>
      <AppFooterNav ctrl-key="NavFooter"/>      
    </section>
  </footer>
</template>

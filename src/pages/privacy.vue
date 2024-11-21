<script setup lang="ts">
import { type Locale, AppConfig, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { joinURL } from 'ufo';

definePageMeta({
  title: { resName: getI18nResName2('privacyPage', 'title'), resArgs: undefined }
});
useOgImage();

const route = useRoute();
const siteConfig = useSiteConfig();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const contentParams = computed(() => {
  return {
    siteUrl: siteConfig.url,
    contactEmail : AppConfig.contactEmail,
    privacyUrl : joinURL(siteConfig.url, navLinkBuilder.buildLink(route.path, locale.value as Locale))
  };
});

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <AppPageMdc tag="article" :content-params="contentParams" />
  </div>
</template>

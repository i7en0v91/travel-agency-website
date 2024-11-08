<script setup lang="ts">
import { type Locale, localizePath, getPagePath, AppConfig, getI18nResName2, AppPage } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { joinURL } from 'ufo';
import ProseStyling from './../content/prose/styling';

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

//const contentQueryParams = computed(() => queryContent().locale(locale.value).params());
const contentQueryParams = queryContent().params();

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <ContentDoc tag="article" :path="localizePath(`/${getPagePath(AppPage.Privacy)}`, locale as Locale)" :query="contentQueryParams" >
      <template #default="{ doc }">
        <ContentRenderer 
          :value="doc" 
          :data="contentParams"
          :components="ProseStyling"
        />
      </template>
    </ContentDoc>
  </div>
</template>

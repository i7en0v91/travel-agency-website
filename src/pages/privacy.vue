<script setup lang="ts">
import { AppConfig, DefaultLocale, type Locale, getI18nResName2 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { joinURL } from 'ufo';
import CProseH1 from './../content/prose/CProseH1.vue';
import CProseH2 from './../content/prose/CProseH2.vue';
import CProseOl from './../content/prose/CProseOl.vue';
import CProseUl from './../content/prose/CProseUl.vue';
import CProseThHidden from './../content/prose/CProseThHidden.vue';
import CProseTheadHidden from './../content/prose/CProseTheadHidden.vue';
import CProseTd from './../content/prose/CProseTd.vue';
import CProseTr from './../content/prose/CProseTr.vue';
import CProseP from './../content/prose/CProseP.vue';

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


const proseStyling = {
  'h1': CProseH1,
  'h2': CProseH2,
  'ol': CProseOl,
  'ul': CProseUl,
  'tr': CProseTr,
  'td': CProseTd,
  'th': CProseThHidden,
  'thead': CProseTheadHidden,
  'p': CProseP
};

const contentQueryParams = queryContent().params();

</script>

<template>
  <AppPageBody>
    <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
      <ContentDoc tag="article" :query="contentQueryParams" >
        <template #default="{ doc }">
          <ContentRenderer 
            :value="doc" 
            :data="contentParams"
            :components="proseStyling"
          />
        </template>
      </ContentDoc>
    </div>
  </AppPageBody>
</template>

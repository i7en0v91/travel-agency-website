<script setup lang="ts">
import { type Locale, localizePath, getPagePath, ImageCategory, MainTitleSlug, getI18nResName2, AppPage } from '@golobe-demo/shared';
import HeadingText from './../components/index/main-heading-text.vue';
import ProseStyling from './../content/prose/styling';

definePageMeta({
  title: { resName: getI18nResName2('indexPage', 'title'), resArgs: undefined }
});
useOgImage();

const { locale } = useI18n();

//const contentQueryParams = computed(() => queryContent().locale(locale.value).params());
const contentQueryParams = queryContent().params();

</script>

<template>
  <div class="golobe-landing-page ">
    <SearchPageHead
      ctrl-key="MainPageHead"
      :image-entity-src="{ slug: MainTitleSlug }"
      :category="ImageCategory.MainTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      :ui="{
        content: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
        image: {
          wrapper: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
          img: 'h-full max-h-[701px] md:max-h-[581px]',
          overlay: 'bg-gradient-to-b from-gray-900 to-60% opacity-75'
        }
      }"
    >
      <HeadingText ctrl-key="IndexPageMainHeading" />
    </SearchPageHead>
    
    <ContentDoc :path="localizePath(`/${getPagePath(AppPage.Index)}`, locale as Locale)" :query="contentQueryParams" >
      <template #default="{ doc }">
        <ContentRenderer 
          :value="doc" 
          :components="ProseStyling"
        />
      </template>
    </ContentDoc>
  </div>
</template>

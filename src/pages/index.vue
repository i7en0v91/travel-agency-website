<script setup lang="ts">
import { ImageCategory, MainTitleSlug, getI18nResName2 } from '@golobe-demo/shared';
import HeadingText from './../components/index/main-heading-text.vue';
import AppPageMdc from './../components/common-page-components/app-page-mdc.vue';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  title: { resName: getI18nResName2('indexPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'Index'];

</script>

<template>
  <div class="golobe-landing-page">
    <SearchPageHead
      :ctrl-key="[...CtrlKey, 'SearchPageHead']"
      :image-entity-src="{ slug: MainTitleSlug }"
      :category="ImageCategory.MainTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      :ui="{
        content: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
        image: {
          wrapper: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
          img: 'max-h-[701px] md:max-h-[581px]',
          overlay: 'bg-gradient-to-b from-gray-900 to-60% opacity-75'
        }
      }"
    >
      <HeadingText :ctrl-key="[...CtrlKey, 'SearchPageHead', 'Title']" />
    </SearchPageHead>
    
    <AppPageMdc/>
  </div>
</template>

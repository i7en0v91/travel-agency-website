<script setup lang="ts">
import { localizePath, getPagePath, type Locale, StaysTitleSlug, AppPage, ImageCategory, getI18nResName2 } from '@golobe-demo/shared';
import HeadingText from './../components/stays/stays-heading-text.vue';
import ProseStyling from './../content/prose/styling';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined }
});
useOgImage();

</script>

<template>
  <div class="stays-page">
    <SearchPageHead
      ctrl-key="SearchPageHeadStays"
      :image-entity-src="{ slug: StaysTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      single-tab="stays"
      :ui="{
        content: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
        image: {
          wrapper: 'h-[701px] max-h-[701px] md:h-[581px] md:max-h-[581px]',
          img: 'h-full max-h-[701px] md:max-h-[581px]',
          overlay: 'bg-gradient-to-b from-gray-700 to-60% opacity-75'
        }
      }"
    >
      <HeadingText ctrl-key="StaysPageHeading" />
    </SearchPageHead>

    <AppPageMdc />
  </div>
</template>

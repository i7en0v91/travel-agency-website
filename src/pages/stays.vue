<script setup lang="ts">
import { StaysTitleSlug, ImageCategory, getI18nResName2 } from '@golobe-demo/shared';
import { TravelDetailsHtmlAnchor } from './../helpers/constants';
import PageSection from './../components/common-page-components/page-section.vue';
import HeadingText from './../components/stays/stays-heading-text.vue';
import TravelCities from './../components/common-page-components/travel-details/travel-cities.vue';
import TravelDetails from './../components/common-page-components/travel-details/travel-details.vue';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'Stays'];

const isError = ref(false);

</script>

<template>
  <div class="stays-page no-hidden-parent-tabulation-check">
    <SearchPageHead
      :ctrl-key="[...CtrlKey, 'SearchPageHead']"
      class="stays-page-head"
      :image-entity-src="{ slug: StaysTitleSlug }"
      :category="ImageCategory.PageTitle"
      :image-alt-res-name="getI18nResName2('searchPageCommon', 'mainImageAlt')"
      overlay-class="search-stays-page-head-overlay"
      single-tab="stays"
    >
      <HeadingText :ctrl-key="[...CtrlKey, 'SearchPageHead', 'Title']" />
    </SearchPageHead>
    <PageSection
      :ctrl-key="[...CtrlKey, 'PageSection']"
      :header-res-name="getI18nResName2('staysPage', 'recentSearchesTitle')"
      :is-error="isError"
      :content-padded="true"
    >
      <LazyStaySearchHistory :ctrl-key="[...CtrlKey, 'RecentSearches']" />
    </PageSection>
    <TravelCities :ctrl-key="[...CtrlKey, 'TravelCities']" book-kind="stay" class="stays-page-travel-cities-section" />
    <TravelDetails :id="TravelDetailsHtmlAnchor" :ctrl-key="[...CtrlKey, 'TravelDetails']" book-kind="stay" />
  </div>
</template>

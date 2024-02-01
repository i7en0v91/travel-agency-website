<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SearchOffers from './../components/common-page-components/search-offers.vue';

definePageMeta({
  title: getI18nResName2('findStaysPage', 'title')
});

</script>

<template>
  <div class="search-stays-page no-hidden-parent-tabulation-check">
    <SearchOffers :ctrl-key="`StaysListingPage-SearchOffers`" :minimum-buttons="true" class="search-stays-offers-box" :take-initial-values-from-url-query="true" single-tab="stays" />
  </div>
</template>

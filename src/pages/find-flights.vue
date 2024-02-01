<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SearchOffers from './../components/common-page-components/search-offers.vue';

definePageMeta({
  title: getI18nResName2('findFlightsPage', 'title')
});

</script>

<template>
  <div class="search-flights-page no-hidden-parent-tabulation-check">
    <SearchOffers :ctrl-key="`FlightsListingPage-SearchOffers`" :minimum-buttons="true" class="search-flights-offers-box" :take-initial-values-from-url-query="true" single-tab="flights" />
  </div>
</template>

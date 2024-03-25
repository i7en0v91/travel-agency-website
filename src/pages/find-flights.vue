<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SearchOffers from './../components/common-page-components/search-offers/search-offers.vue';
import OffersListView from './../components/common-page-components/offers-list-view/list-view.vue';

definePageMeta({
  title: { resName: getI18nResName2('flightsPage', 'title'), resArgs: undefined }
});
useOgImage();

if (process.client) {
  const searchOffersStoreAccessor = useSearchOffersStore();
  const searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', false, false);
  if (searchOffersStore.resultState.initialDataFetched !== 'no') {
    await searchOffersStore.resetFetchState();
  }
}

</script>

<template>
  <div class="search-flights-page no-hidden-parent-tabulation-check">
    <SearchOffers ctrl-key="FlightsListingPage-SearchOffers" :minimum-buttons="true" class="search-flights-offers-box" :take-initial-values-from-url-query="true" single-tab="flights" />
    <OffersListView ctrl-key="FlightsListingPage-OffersListView" offers-kind="flights" class="mt-xs-5" />
  </div>
</template>

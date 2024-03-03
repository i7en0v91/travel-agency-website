<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SearchOffers from './../components/common-page-components/search-offers/search-offers.vue';
import OffersListView from './../components/common-page-components/offers-list-view/list-view.vue';

definePageMeta({
  title: getI18nResName2('findStaysPage', 'title')
});

if (process.client) {
  const searchOffersStoreAccessor = useSearchOffersStore();
  const searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false, false);
  if (searchOffersStore.resultState.initialDataFetched !== 'no') {
    await searchOffersStore.resetFetchState();
  }
}

</script>

<template>
  <div class="search-stays-page no-hidden-parent-tabulation-check">
    <SearchOffers :ctrl-key="`StaysListingPage-SearchOffers`" :minimum-buttons="true" class="search-stays-offers-box" :take-initial-values-from-url-query="true" single-tab="stays" />
    <OffersListView ctrl-key="StaysListingPage-OffersListView" offers-kind="stays" class="mt-xs-5" />
  </div>
</template>

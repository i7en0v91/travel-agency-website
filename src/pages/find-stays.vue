<script setup lang="ts">

import { getI18nResName2 } from './../shared/i18n';
import SearchOffers from './../components/common-page-components/search-offers/search-offers.vue';
import OffersListView from './../components/common-page-components/offers-list-view/list-view.vue';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined },
  middleware: ['redirect-with-search-stays-date-filled']
});
useOgImage();

if (import.meta.client) {
  const searchOffersStoreAccessor = useSearchOffersStore();
  const searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false, false);
  if (searchOffersStore.resultState.initialDataFetched !== 'no') {
    await searchOffersStore.resetFetchState();
  }
}

</script>

<template>
  <div class="search-stays-page no-hidden-parent-tabulation-check">
    <h1 class="search-stays-page-title mb-xs-4">
      {{ $t(getI18nResName2('staysPage', 'title')) }}
    </h1>
    <SearchOffers :ctrl-key="`StaysListingPage-SearchOffers`" :minimum-buttons="true" class="search-stays-offers-box" :take-initial-values-from-url-query="true" single-tab="stays" />
    <OffersListView ctrl-key="StaysListingPage-OffersListView" offers-kind="stays" class="mt-xs-5" />
  </div>
</template>

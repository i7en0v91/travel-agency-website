<script setup lang="ts">

import { getI18nResName2 } from '@golobe-demo/shared';
import SearchOffers from './../components/common-page-components/search-offers/search-offers.vue';
import OffersListView from './../components/common-page-components/offers-list-view/list-view.vue';

definePageMeta({
  title: { resName: getI18nResName2('flightsPage', 'title'), resArgs: undefined }
});
useOgImage();

if (import.meta.client) {
  const searchOffersStoreAccessor = useSearchOffersStore();
  const searchOffersStore = await searchOffersStoreAccessor.getInstance('flights', false, false);
  if (searchOffersStore.resultState.initialDataFetched !== 'no') {
    await searchOffersStore.resetFetchState();
  }
}

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <h2 class="text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">{{ $t(getI18nResName2('flightsPage', 'title')) }}</h2>
    <SearchOffers ctrl-key="FlightsListingPage-SearchOffers" :show-promo-btn="false" class="mt-4 w-full" :take-initial-values-from-url-query="true" single-tab="flights" />
    <OffersListView ctrl-key="FlightsListingPage-OffersListView" offers-kind="flights" class="mt-8" />
  </div>
</template>

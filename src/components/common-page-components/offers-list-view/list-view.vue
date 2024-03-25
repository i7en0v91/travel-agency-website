<script setup lang="ts">

import FilterPanel from './filter-panel.vue';
import DisplayOptions from './display-options.vue';
import ResultItemsList from './result-items-list.vue';
import ListPaging from './list-paging.vue';
import { type OfferKind } from './../../../shared/interfaces';
import ComponentWaiterIndicator from './../../component-waiting-indicator.vue';

interface IProps {
  ctrlKey: string,
  offersKind: OfferKind
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const wasAuthenticated = status.value === 'authenticated';

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(props.offersKind, true, true);

const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'error';
const showWaitingStub = ref(isShowWaitingStubNeeded());

const updateWaitingStubValue = () => {
  showWaitingStub.value = isShowWaitingStubNeeded();
};
watch(() => searchOffersStore.resultState.status, () => {
  if (searchOffersStore.resultState.status === 'error') {
    logger.warn(`(ListView) exception while fetching items, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
    isError.value = true;
  } else {
    isError.value = false;
  }
  updateWaitingStubValue();
});

onMounted(() => {
  logger.verbose(`(ListView) mounted, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
  updateWaitingStubValue();
});

</script>

<template>
  <div class="offers-list-view" role="search">
    <ComponentWaiterIndicator v-if="showWaitingStub && !isError" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="offers-list-view-waiter mt-xs-5" />
    <ErrorHelm v-model:is-error="isError">
      <div v-if="!showWaitingStub" class="offers-list-view-grid">
        <FilterPanel :ctrl-key="`${ctrlKey}-FilterPanel`" :offers-kind="props.offersKind" />
        <DisplayOptions :ctrl-key="`${ctrlKey}-DisplayOptions`" :offers-kind="props.offersKind" />
        <ClientOnly v-if="wasAuthenticated">
          <!-- search results are personalised for authenticated users -->
          <ResultItemsList :ctrl-key="`${ctrlKey}-ResultItemsList`" :items="searchOffersStore.resultState.items" :offers-kind="props.offersKind" />
          <template #fallback>
            <ComponentWaiterIndicator :ctrl-key="`${ctrlKey}-ResultItemsListFallback`" class="result-items-list" />
          </template>
        </ClientOnly>
        <ResultItemsList v-else :ctrl-key="`${ctrlKey}-ResultItemsList`" :items="searchOffersStore.resultState.items" :offers-kind="props.offersKind" />
        <ListPaging :ctrl-key="`${ctrlKey}-ListPaging`" :offers-kind="$props.offersKind" />
      </div>
    </ErrorHelm>
  </div>
</template>

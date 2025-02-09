<script setup lang="ts">
import type { OfferKind } from '@golobe-demo/shared';
import FilterPanel from './filter-panel.vue';
import DisplayOptions from './display-options.vue';
import ResultItemsList from './result-items-list.vue';
import ListPaging from './list-paging.vue';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger();

const isError = ref(false);

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'error';
const showWaitingStub = ref(isShowWaitingStubNeeded());

const updateWaitingStubValue = () => {
  showWaitingStub.value = isShowWaitingStubNeeded();
};
watch(() => searchOffersStore.resultState.status, () => {
  if (searchOffersStore.resultState.status === 'error') {
    logger.warn(`(ListView) exception while fetching items, ctrlKey=${ctrlKey}, type=${offersKind}`);
    isError.value = true;
  } else {
    isError.value = false;
  }
  updateWaitingStubValue();
});

onMounted(() => {
  logger.verbose(`(ListView) mounted, ctrlKey=${ctrlKey}, type=${offersKind}`);
});

</script>

<template>
  <div class="offers-list-view" role="search">
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="offers-list-view-waiter mt-xs-5" />
    <ErrorHelm v-model:is-error="isError">
      <div v-if="!showWaitingStub" class="offers-list-view-grid">
        <FilterPanel :ctrl-key="`${ctrlKey}-FilterPanel`" :offers-kind="offersKind" />
        <DisplayOptions :ctrl-key="`${ctrlKey}-DisplayOptions`" :offers-kind="offersKind" />
        <ResultItemsList :ctrl-key="`${ctrlKey}-ResultItemsList`" :items="searchOffersStore.resultState.items" :offers-kind="offersKind" />
        <ListPaging :ctrl-key="`${ctrlKey}-ListPaging`" :offers-kind="offersKind" />
      </div>
    </ErrorHelm>
  </div>
</template>

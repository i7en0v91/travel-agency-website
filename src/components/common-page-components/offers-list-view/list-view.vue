<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import type { OfferKind } from '@golobe-demo/shared';
import FilterPanel from './filter-panel.vue';
import ResultItemsList from './result-items-list.vue';
import ListPaging from './list-paging.vue';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger().addContextProps({ component: 'ListView' });
const nuxtApp = useNuxtApp();
const isError = ref(false);

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'error';
const showWaitingStub = ref(!import.meta.server && !nuxtApp.isHydrating);

const updateWaitingStubValue = () => {
  showWaitingStub.value = isShowWaitingStubNeeded();
};
watch(() => searchOffersStore.resultState.status, () => {
  if (searchOffersStore.resultState.status === 'error') {
    logger.warn('exception while fetching items', undefined, { ctrlKey, type: offersKind });
    isError.value = true;
  } else {
    isError.value = false;
  }
  updateWaitingStubValue();
});

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
});

</script>

<template>
  <div role="search">
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="[...ctrlKey, 'Waiter']"/>
    <ErrorHelm v-model:is-error="isError">
      <div v-if="!showWaitingStub" class="w-full h-auto grid gap-4 grid-rows-offerslistxs md:grid-rows-offerslistmd grid-cols-offerslistxs md:grid-cols-offerslistmd xl:grid-cols-offerslistxl">
        <FilterPanel :ctrl-key="[...ctrlKey, 'FilterPanel']" :offers-kind="offersKind" class="row-start-1 row-end-2 col-start-1 col-end-2 md:row-end-3" />
        <ResultItemsList :ctrl-key="[...ctrlKey, 'ResultItemsList']" :items="searchOffersStore.resultState.items" :offers-kind="offersKind" class="row-start-2 row-end-3 col-start-1 col-end-2 md:row-start-1 md:row-end-2 md:col-start-2 md:col-end-3" />
        <ListPaging :ctrl-key="[...ctrlKey, 'ListPaging']" :offers-kind="offersKind" class="row-start-3 row-end-4 col-start-1 col-end-2 md:row-start-2 md:row-end-3 md:col-start-2 md:col-end-3" />
      </div>
    </ErrorHelm>    
  </div>
</template>

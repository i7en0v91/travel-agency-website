<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { LOADING_STATE } from './../../../helpers/constants';
import type { OfferKind } from '@golobe-demo/shared';
import FilterPanel from './filter-panel.vue';
import DisplayOptions from './display-options.vue';
import ResultItemsList from './result-items-list.vue';
import ListPaging from './list-paging.vue';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ListView' });
const searchOffersStore = useSearchOffersStore();

const isComponentError = ref(false);
const isError = computed(() => searchOffersStore.isError[offersKind]);
const showWaitingStub = computed(() => {
  return import.meta.client && searchOffersStore.filterInfo[offersKind] === LOADING_STATE;
});

if(import.meta.server || (import.meta.client && useNuxtApp().isHydrating)) {
  await searchOffersStore.load(offersKind);
}


onMounted( () => {
  logger.debug('mounted', { ctrlKey, type: offersKind });
});

</script>

<template>
  <div class="offers-list-view" role="search">
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError && !isComponentError" :ctrl-key="[...ctrlKey, 'Waiter']" class="offers-list-view-waiter mt-xs-5" />
    <ErrorHelm v-model:is-error="isComponentError">
      <div v-if="!showWaitingStub" class="offers-list-view-grid">
        <FilterPanel :ctrl-key="[...ctrlKey, 'FilterPanel']" :offers-kind="offersKind" />
        <DisplayOptions :ctrl-key="[...ctrlKey, 'DisplayOptions']" :offers-kind="offersKind" />
        <ResultItemsList :ctrl-key="[...ctrlKey, 'ResultItemsList']" :offers-kind="offersKind" />
        <ListPaging :ctrl-key="[...ctrlKey, 'ListPaging']" :offers-kind="offersKind" />
      </div>
    </ErrorHelm>
  </div>
</template>

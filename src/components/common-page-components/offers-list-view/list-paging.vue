<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { LOADING_STATE } from './../../../helpers/constants';
import { type OfferKind, getI18nResName2 } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

declare type ViewState = 'visible' | 'hidden' | 'waiting-stub';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ListPaging' });
const searchOffersStore = useSearchOffersStore();

const isError = computed(() => searchOffersStore.isError[offersKind]);
const showWaitingStub = computed(() => {
  return import.meta.client && searchOffersStore.hasMoreItems[offersKind] === LOADING_STATE;
});
const isVisible = computed(() => 
  searchOffersStore.hasMoreItems[offersKind] !== false && 
  searchOffersStore.items[offersKind] !== LOADING_STATE &&
  searchOffersStore.sortInfo[offersKind] !== LOADING_STATE &&
  searchOffersStore.filterInfo[offersKind] !== LOADING_STATE
);
const viewState = computed<ViewState>(() => 
  isVisible.value ? (showWaitingStub.value ? 'waiting-stub' : 'visible') : 'hidden'
);

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
});

</script>

<template>
  <div class="px-2">
    <ComponentWaitingIndicator v-if="viewState === 'waiting-stub' && !isError" :ctrl-key="[...ctrlKey, 'Waiter']" />
    <UButton
      v-if="viewState === 'visible'"
      size="md"
      color="primary"
      variant="solid"
      :ui="{ base: 'w-full h-auto justify-center mt-2 sm:mt-4' }"
      @click="searchOffersStore.load(offersKind, { advanceNextPage: true })"
    >
      {{  $t(getI18nResName2('searchOffers', 'pagingBtn')) }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type OfferKind, getI18nResName2 } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

declare type ViewState = 'visible' | 'hidden' | 'waiting-stub';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const { status } = useAuth();
const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger().addContextProps({ component: 'ListPaging' });

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'page-fetch';
const isVisible = () => searchOffersStore && searchOffersStore.resultState.status === 'fetched' && searchOffersStore.viewState.displayOptions.totalCount > 0 && searchOffersStore.resultState.items.length < searchOffersStore.viewState.displayOptions.totalCount;

const viewState = ref<ViewState>(status.value === 'authenticated' ? 'hidden' : 'visible');

const getViewState = (): ViewState => {
  if (isShowWaitingStubNeeded()) {
    return 'waiting-stub';
  }
  if (!isVisible()) {
    return 'hidden';
  }
  return 'visible';
};

const updateViewState = () => {
  logger.debug('updating view state', { ctrlKey, type: offersKind });
  viewState.value = getViewState();
};

function onPageBtnClick () {
  logger.verbose('page button clicked', { ctrlKey, type: offersKind });
  searchOffersStore.fetchData('page-fetch');
}

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });

  watch(() => searchOffersStore.resultState.status, () => {
    updateViewState();
  });
  updateViewState();
});

</script>

<template>
  <div class="px-2">
    <ComponentWaitingIndicator v-if="viewState === 'waiting-stub'" :ctrl-key="[...ctrlKey, 'Waiter']" />
    <UButton
      v-if="viewState === 'visible'"
      size="md"
      color="primary"
      variant="solid"
      :ui="{ base: 'w-full h-auto justify-center mt-2 sm:mt-4' }"
      @click="onPageBtnClick"
    >
      {{  $t(getI18nResName2('searchOffers', 'pagingBtn')) }}
    </UButton>
  </div>
</template>

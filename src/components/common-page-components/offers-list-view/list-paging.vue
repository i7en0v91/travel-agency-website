<script setup lang="ts">
import { type OfferKind, getI18nResName2 } from '@golobe-demo/shared';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

declare type ViewState = 'visible' | 'hidden' | 'waiting-stub';

interface IProps {
  ctrlKey: string,
  offersKind: OfferKind
}
const props = withDefaults(defineProps<IProps>(), {
});

const { status } = useAuth();
const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(props.offersKind, true, true);

const logger = getCommonServices().getLogger();

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
  logger.debug(`(ListPaging) updating view state, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
  viewState.value = getViewState();
};

function onPageBtnClick () {
  logger.verbose(`(ListPaging) page button clicked, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
  searchOffersStore.fetchData('page-fetch');
}

onMounted(() => {
  logger.verbose(`(ListPaging) mounted, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);

  watch(() => searchOffersStore.resultState.status, () => {
    updateViewState();
  });
  updateViewState();
});

</script>

<template>
  <div
    class="list-paging"
  >
    <ComponentWaitingIndicator v-if="viewState === 'waiting-stub'" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="list-paging-waiter" />
    <SimpleButton
      v-if="viewState === 'visible'"
      kind="accent"
      class="list-paging-btn"
      :ctrl-key="`${ctrlKey}-PagingBtn`"
      :label-res-name="getI18nResName2('searchOffers', 'pagingBtn')"
      @click="onPageBtnClick"
    />
  </div>
</template>

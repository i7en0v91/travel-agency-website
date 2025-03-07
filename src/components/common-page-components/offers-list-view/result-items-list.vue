<script setup lang="ts" generic="TItem extends EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import type { EntityDataAttrsOnly, IFlightOffer, IStayOffer, OfferKind } from '@golobe-demo/shared';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import FlightsListItemCard from './search-flights-result-card.vue';
import StaysListItemCard from './search-stays-result-card.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

type WaitingStubMode = 'hidden' | 'shown' | 'not-needed';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind,
  items: TItem[]
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger().addContextProps({ component: 'ResultItemsList' });

const isError = ref(false);

const getWaitingStubMode = (): WaitingStubMode => !searchOffersStore ? 'hidden' : (searchOffersStore.resultState.status === 'sort-refetch' ? 'shown' : ((searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'filter-refetch') ? 'hidden' : 'not-needed'));
const waitingStubMode = ref<WaitingStubMode>(getWaitingStubMode());

const updateWaitingStubValue = () => {
  waitingStubMode.value = getWaitingStubMode();
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

</script>

<template>
  <section class="result-items-list">
    <ComponentWaitingIndicator v-if="waitingStubMode === 'shown' && !isError" :ctrl-key="[...ctrlKey, 'Waiter']" class="result-items-list-waiter mt-xs-5" />
    <ErrorHelm v-model:is-error="isError">
      <ol v-if="waitingStubMode === 'not-needed' && items.length > 0">
        <li
          v-for="(offer, idx) in (items)"
          :key="`${toShortForm(ctrlKey)}-Offer-${offer.id}`"
          class="result-list-item-div"
        >
          <FlightsListItemCard v-if="offersKind === 'flights'" :ctrl-key="[...ctrlKey, 'Card', 'Flights', idx]" :offer="(offer as EntityDataAttrsOnly<IFlightOffer>)" />
          <StaysListItemCard v-else :ctrl-key="[...ctrlKey, 'Card', 'Stays', idx]" :offer="(offer as EntityDataAttrsOnly<IStayOffer>)" />
        </li>
      </ol>
    </ErrorHelm>
  </section>
</template>

<script setup lang="ts" generic="TOfferKind extends OfferKind">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { LOADING_STATE } from './../../../helpers/constants';
import type { EntityDataAttrsOnly, IFlightOffer, IStayOffer, OfferKind } from '@golobe-demo/shared';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import FlightsListItemCard from './search-flights-result-card.vue';
import StaysListItemCard from './search-stays-result-card.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

type ItemType<TOfferKind extends OfferKind> = 
  TOfferKind extends 'flights' ? EntityDataAttrsOnly<IFlightOffer> : 
  (TOfferKind extends 'stays' ? EntityDataAttrsOnly<IStayOffer> : never);

interface IProps {
  ctrlKey: ControlKey,
  offersKind: TOfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ResultItemsList' });
const searchOffersStore = useSearchOffersStore();

const isComponentError = ref(false);
const isError = computed(() => searchOffersStore.isError[offersKind]);

const items = computed(() => 
  (searchOffersStore.items[offersKind] !== LOADING_STATE ? 
    searchOffersStore.items[offersKind] : []) as ItemType<TOfferKind>[]
);
const showWaitingStub = computed<boolean>(() => {
  return searchOffersStore.items[offersKind] === LOADING_STATE &&
  // if loading on a higher level than items should be an empty array and no need to double waiting indicator
  (
    searchOffersStore.sortInfo[offersKind] !== LOADING_STATE &&
    searchOffersStore.filterInfo[offersKind] !== LOADING_STATE
  );
});

onMounted(() => {
  logger.debug('mounted', { ctrlKey, type: offersKind });
});

</script>

<template>
  <section class="result-items-list">
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError && !isComponentError" :ctrl-key="[...ctrlKey, 'Waiter']" class="result-items-list-waiter mt-xs-5" />
    <ErrorHelm v-model:is-error="isComponentError">
      <ol v-if="items.length > 0">
        <li
          v-for="(offer, idx) in items"
          :key="`${toShortForm(ctrlKey)}-Offer-${offer.id}`"
          class="result-list-item-div"
        >
          <FlightsListItemCard v-if="offersKind === 'flights'" :ctrl-key="[...ctrlKey, 'Card', 'Flights', idx]" :offer="(offer as ItemType<'flights'>)" />
          <StaysListItemCard v-else :ctrl-key="[...ctrlKey, 'Card', 'Stays', idx]" :offer="(offer as ItemType<'stays'>)" />
        </li>
      </ol>
    </ErrorHelm>
  </section>
</template>

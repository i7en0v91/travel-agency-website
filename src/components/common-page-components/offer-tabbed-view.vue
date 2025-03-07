<script setup lang="ts">
import { toShortForm, toKnownElement, type ControlKey } from './../../helpers/components';
import type { I18nResName, OfferKind, EntityDataAttrsOnly, IStayOffer, IFlightOffer, EntityId } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';

interface IProps {
  ctrlKey: ControlKey,
  selectedKind: OfferKind,
  tabPanelIds: { [P in OfferKind]: string },
  displayedItems: { [P in OfferKind]:(((EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { bookingId?: EntityId })[] | undefined) },
  noOffersResName: { [P in OfferKind]: I18nResName },
  cardComponentTypes: { [P in OfferKind]: Component }
}
const { ctrlKey, selectedKind } = defineProps<IProps>();

const isError = ref(false);

watch(() => selectedKind, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

</script>

<template>
  <section class="offer-tabbed-view-div">
    <ErrorHelm v-model:is-error="isError">
      <KeepAlive>
        <div v-for="(kind) in ['flights' as OfferKind, 'stays' as OfferKind]" :key="`${toShortForm(ctrlKey)}-${kind}TabContainer`" class="offer-tabs-div">
          <div v-if="selectedKind === kind" :id="tabPanelIds[kind]" class="offer-tab">
            <ComponentWaitingIndicator v-if="displayedItems[kind] === undefined && !isError" :ctrl-key="[...ctrlKey, toKnownElement(kind), 'Waiter']" class="offer-tab-list-waiter mt-xs-5" />
            <ol v-else-if="!isError && (displayedItems[kind]?.length ?? 0) > 0" class="offer-tab-list">
              <li
                v-for="(item, idx) in displayedItems[kind]"
                :key="`${toShortForm(ctrlKey)}-${kind}OfferTabItem-${item.id}`"
                class="offer-tab-list-item-div mt-xs-4 mt-s-5"
              >
                <component :is="cardComponentTypes[kind]" :ctrl-key="[...ctrlKey, toKnownElement(kind), 'Card', idx]" :offer="item" :booking-id="item.bookingId" class="expand-for-large"/>
              </li>
            </ol>
            <div v-else-if="!isError" class="offer-tab-no-offers mt-xs-5">
              {{ $t(noOffersResName[kind]) }}
            </div>
          </div>
        </div>
      </KeepAlive>
    </ErrorHelm>
  </section>
</template>

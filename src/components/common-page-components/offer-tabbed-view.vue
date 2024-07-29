<script setup lang="ts">

import { type OfferKind, type EntityDataAttrsOnly, type IStayOffer, type IFlightOffer, type EntityId } from '../../shared/interfaces';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import { type I18nResName } from './../../shared/i18n';
import { TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import { updateTabIndices } from './../../shared/dom';


interface IProps {
  ctrlKey: string,
  selectedKind: OfferKind,
  tabPanelIds: { [P in OfferKind]: string },
  displayedItems: { [P in OfferKind]:(((EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { bookingId?: EntityId })[] | undefined) },
  noOffersResName: { [P in OfferKind]: I18nResName },
  cardComponentTypes: { [P in OfferKind]: Component }
}
const props = defineProps<IProps>();

const isError = ref(false);

watch(() => props.selectedKind, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

</script>

<template>
  <section class="offer-tabbed-view-div">
    <ErrorHelm v-model:is-error="isError">
      <KeepAlive>
        <div v-for="(kind) in ['flights' as OfferKind, 'stays' as OfferKind]" :key="`${props.ctrlKey}-${kind}TabContainer`" class="offer-tabs-div">
          <div v-if="selectedKind === kind" :id="tabPanelIds[kind]" class="offer-tab">
            <ComponentWaitingIndicator v-if="displayedItems[kind] === undefined && !isError" :ctrl-key="`${ctrlKey}-${kind}ListWaiterIndicator`" class="offer-tab-list-waiter mt-xs-5" />
            <ol v-else-if="!isError && (displayedItems[kind]?.length ?? 0) > 0" class="offer-tab-list">
              <li
                v-for="(item, idx) in displayedItems[kind]"
                :key="`${props.ctrlKey}-${kind}OfferTabItem-${item.id}`"
                class="offer-tab-list-item-div mt-xs-4 mt-s-5"
              >
                <component :is="cardComponentTypes[kind]" :ctrl-key="`${ctrlKey}-${kind}Card-${idx}`" :offer="item" :booking-id="item.bookingId" class="expand-for-large"/>
              </li>
            </ol>
            <div v-else-if="!isError" class="offer-tab-no-offers mt-xs-5">
              {{ $t($props.noOffersResName[kind]) }}
            </div>
          </div>
        </div>
      </KeepAlive>
    </ErrorHelm>
  </section>
</template>

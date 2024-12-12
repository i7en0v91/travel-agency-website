<script setup lang="ts">
import { type I18nResName, type OfferKind, type EntityDataAttrsOnly, type IStayOffer, type IFlightOffer, type EntityId } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../forms/component-waiting-indicator.vue';

interface IProps {
  ctrlKey: string,
  selectedKind: OfferKind,
  tabPanelIds: { [P in OfferKind]: string },
  displayedItems: { [P in OfferKind]:(((EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { bookingId?: EntityId })[] | undefined) },
  noOffersResName: { [P in OfferKind]: I18nResName },
  cardComponentTypes: { [P in OfferKind]: Component }
}
const props = defineProps<IProps>();

const OfferKinds: OfferKind[] = ['flights', 'stays'];

const isError = ref(false);

</script>

<template>
  <section class="w-full h-auto">
    <ErrorHelm v-model:is-error="isError">
      <KeepAlive>
        <div v-for="(kind) in OfferKinds" :key="`${props.ctrlKey}-${kind}TabContainer`" class="w-full h-auto">
          <div v-if="selectedKind === kind" :id="tabPanelIds[kind]">
            <ComponentWaitingIndicator v-if="displayedItems[kind] === undefined && !isError" :ctrl-key="`${ctrlKey}-${kind}ListWaiterIndicator`" class="mt-8" />
            <ol v-else-if="!isError && (displayedItems[kind]?.length ?? 0) > 0" class="space-y-6 sm:space-y-8">
              <li
                v-for="(item, idx) in displayedItems[kind]"
                :key="`${props.ctrlKey}-${kind}OfferTabItem-${item.id}`"
              >
                <component :is="cardComponentTypes[kind]" :ctrl-key="`${ctrlKey}-${kind}Card-${idx}`" :offer="item" :booking-id="item.bookingId" variant="landscape-lg" />
              </li>
            </ol>
            <div v-else-if="!isError" class="w-full whitespace-normal font-normal text-gray-600 dark:text-gray-300 text-center mt-8">
              {{ $t($props.noOffersResName[kind]) }}
            </div>
          </div>
        </div>
      </KeepAlive>
    </ErrorHelm>
  </section>
</template>

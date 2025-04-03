<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type EntityId, type OfferKind, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, eraseTimeOfDay, getValueForFlightDayFormatting, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { HistoryTabGroup, HistoryTabFlights, HistoryTabStays } from './../../../helpers/constants';
import TabsGroup from '../../forms/tabs-group.vue';
import FlightTicketCard from './../../../components/user-account/ticket-card/ticket-flight-card.vue';
import StayTicketCard from './../../../components/user-account/ticket-card/ticket-stay-card.vue';
import { LOADING_STATE, type TimeRangeFilter } from './../../../helpers/constants';
import { mapLoadOffersResult } from './../../../helpers/entity-mappers';
import { type ILoadOffersDto, ApiEndpointLoadOffers } from '../../../server/api-definitions';
import dayjs from 'dayjs';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

export type UserTicketItem = (EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { bookingId: EntityId, bookingDateUtc: Date };


interface IProps {
  ctrlKey: ControlKey,
  ready: boolean
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TabHistory' });
const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const userAccountStore = useUserAccountStore();

const flightsTabHtmlId = useId();
const staysTabHtmlId = useId();

const isError = ref(false);
const timeRangeFilter = ref<TimeRangeFilter>();
const timeRangeFilterDropdownItems: {value: TimeRangeFilter, resName: I18nResName}[] = (['upcoming', 'passed'] as TimeRangeFilter[]).map(f => { return { value: f, resName: getI18nResName3('accountPage', 'tabHistory', f) }; });
const activeTabKey = ref<ControlKey | undefined>();

const $emit = defineEmits(['update:ready']);

const userTicketsInfo = computed(() => {
  return (userAccountStore.bookings && userAccountStore.bookings !== LOADING_STATE) ? 
            new Map(userAccountStore.bookings.map((b) => [b.offerId, b])) : undefined;
});

const fetchBody = computed(() => { 
  return userTicketsInfo.value !== undefined ? {
    ids: Array.from(userTicketsInfo.value.values()).map(i => i.offerId)
  } as ILoadOffersDto : undefined;
 });
const offersDetailsFetch = 
  useFetch(`/${ApiEndpointLoadOffers}`, {
    server: false,
    lazy: true,
    immediate: false,
    cache: 'no-cache',
    dedupe: 'cancel',
    method: 'POST' as const,
    query: { drafts: enabled },
    body: fetchBody,
    watch: false,
    transform: mapLoadOffersResult,
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });

const now = dayjs().toDate();
const localUtcOffset = dayjs().local().utcOffset();
const filterCheckpointDates = {
  flights: dayjs(now),
  stays: dayjs(eraseTimeOfDay(getValueForFlightDayFormatting(now, localUtcOffset)))
};

const displayedItems = computed<{ [P in OfferKind]:(UserTicketItem[] | undefined) }>(() => {
  return (offersDetailsFetch.status.value === 'success' && !!offersDetailsFetch.data.value && !!userTicketsInfo.value) ? 
  {
    flights: 
      offersDetailsFetch.data.value.flights
        .filter(o => filterCheckpointDates.flights.isAfter((o as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc) === (timeRangeFilter.value === 'passed'))
          .map(o => { 
            const ticketInfo = userTicketsInfo.value!.get(o.id)!; 
            return { 
              ...o, 
              bookingId: ticketInfo.bookingId, 
              bookingDateUtc: new Date(ticketInfo.bookedTimestamp) 
            }; 
          }),
    stays: 
      offersDetailsFetch.data.value.stays
        .filter(o => filterCheckpointDates.stays.isAfter((o as EntityDataAttrsOnly<IStayOffer>).checkIn) === (timeRangeFilter.value === 'passed'))
        .map(o => { 
            const ticketInfo = userTicketsInfo.value!.get(o.id)!; 
            return { 
              ...o, 
              bookingId: ticketInfo.bookingId, 
              bookingDateUtc: new Date(ticketInfo.bookedTimestamp) 
            }; 
          })
  } : {
    flights: undefined,
    stays: undefined
  };
});

const OfferKinds: OfferKind[] = ['flights', 'stays'];
const tabProps = computed(() => OfferKinds.map(offerKind => {
  return {
    ctrlKey: offerKind === 'flights' ? HistoryTabFlights : HistoryTabStays,
    enabled: true,
    label: {
      resName: getI18nResName3('accountPage', 'tabHistory', offerKind === 'flights' ? 'flightsTab' : 'staysTab'),
      shortIcon: offerKind === 'flights' ? 'i-material-symbols-flight' : 'i-material-symbols-bed'
    },
    items: displayedItems.value[offerKind],
    slotName: offerKind
  };
}));

onMounted(() => {
  logger.verbose('mounted, fetching tickets', ctrlKey);

  watch(fetchBody, () => {
    if(fetchBody.value !== undefined) {
      offersDetailsFetch.refresh();
    }
  }, { immediate: true });

  watch(offersDetailsFetch.status, () => { 
    logger.debug('offer details fetch status changed', { ctrlKey, status: offersDetailsFetch.status.value });
    if(offersDetailsFetch.status.value === 'error') {
      logger.warn('got failed offer details fetch status', undefined, ctrlKey);
      isError.value = true;
    } else if(offersDetailsFetch.status.value === 'success') {
      $emit('update:ready', true);
    }
  }, { immediate: true });
});

</script>

<template>
  <div class="w-full h-auto">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'">
      <TabsGroup
        v-model:active-tab-key="activeTabKey"
        :ctrl-key="HistoryTabGroup" 
        :tabs="tabProps"
        variant="split"
        :ui="{
          base: '[&_h2]:hidden'
        }"
      >
        <template v-for="(slotName) in OfferKinds" #[slotName] :key="`FavouritesPage-TabContent-${slotName}`">
          <DropdownList
            v-model:selected-value="timeRangeFilter"
            :ctrl-key="[...ctrlKey, 'TimeRangeFilter', 'Dropdown']"
            variant="none"
            class="ml-auto w-fit"
            :ui="{ input: 'w-auto' }"
            :persistent="true"
            :items="timeRangeFilterDropdownItems"
          />

          <OfferTabbedView
            :ctrl-key="[...ctrlKey, 'OfferTabView']" 
            :selected-kind="slotName" 
            :tab-panel-ids="{ flights: flightsTabHtmlId, stays: staysTabHtmlId }" 
            :displayed-items="displayedItems"
            :no-offers-res-name="{
              flights: getI18nResName3('accountPage', 'tabHistory', 'noOffers'),
              stays: getI18nResName3('accountPage', 'tabHistory', 'noOffers'),
            }"
            :card-component-types="{
              flights: FlightTicketCard,
              stays: StayTicketCard
            }" 
          />
        </template>
      </TabsGroup>
    </ErrorHelm>
  </div>
</template>

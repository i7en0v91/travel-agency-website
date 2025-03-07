<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppConfig, type EntityId, type OfferKind, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, eraseTimeOfDay, getValueForFlightDayFormatting, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { HistoryTabGroup, HistoryTabFlights, HistoryTabStays } from './../../../helpers/constants';
import TabsGroup from '../../forms/tabs-group.vue';
import FlightTicketCard from './../../../components/user-account/ticket-card/ticket-flight-card.vue';
import StayTicketCard from './../../../components/user-account/ticket-card/ticket-stay-card.vue';
import { mapUserTicketsResult } from './../../../helpers/entity-mappers';
import { ApiEndpointUserTickets, type IUserTicketsResultDto } from '../../../server/api-definitions';
import dayjs from 'dayjs';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

export type UserTicketItem = (EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>) & { bookingId: EntityId, bookingDateUtc: Date };
declare type TimeRangeFilter = 'upcoming' | 'passed';
const DefaultTimeRangeFilter: TimeRangeFilter = 'upcoming';

interface IProps {
  ctrlKey: ControlKey,
  ready: boolean
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TabHistory' });
const isError = ref(false);

const timeRangeFilter = ref<TimeRangeFilter>();
const timeRangeFilterDropdownItems: {value: TimeRangeFilter, resName: I18nResName}[] = (['upcoming', 'passed'] as TimeRangeFilter[]).map(f => { return { value: f, resName: getI18nResName3('accountPage', 'tabHistory', f) }; });

const activeTabKey = ref<ControlKey | undefined>();

const $emit = defineEmits(['update:ready']);

const flightsTabHtmlId = useId();
const staysTabHtmlId = useId();

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();
const userTicketsFetch = await useFetch(`/${ApiEndpointUserTickets}`,
{
  server: false,
  lazy: true,
  immediate: false,
  query: { 
    drafts: enabled 
  },
  cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
  transform: (response: IUserTicketsResultDto) => {
    logger.verbose('received user tickets response', ctrlKey);
    if (!response) {
      logger.warn('user tickets response is empty', undefined, ctrlKey);
      return []; // error should be logged by fetchEx
    }
    return mapUserTicketsResult(response);
  },
  $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
});

const now = dayjs().toDate();
const localUtcOffset = dayjs().local().utcOffset();
const filterCheckpointDates = {
  flights: dayjs(now),
  stays: dayjs(eraseTimeOfDay(getValueForFlightDayFormatting(now, localUtcOffset)))
};
const displayedItems = ref(getDisplayedItems());
function getDisplayedItems() {
  return (userTicketsFetch.status.value === 'success' && userTicketsFetch.data.value !== null) ? {
    flights: userTicketsFetch.data.value.filter(o => o.kind === 'flights' && (filterCheckpointDates.flights.isAfter((o as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc) === (timeRangeFilter.value === 'passed'))),
    stays: userTicketsFetch.data.value.filter(o => o.kind === 'stays' && (filterCheckpointDates.stays.isAfter((o as EntityDataAttrsOnly<IStayOffer>).checkIn) === (timeRangeFilter.value === 'passed')))
  } : {
    flights: undefined,
    stays: undefined
  };
}

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

  watch([userTicketsFetch.status, timeRangeFilter], () => { 
    logger.debug('tickets fetch status changed', { ctrlKey, status: userTicketsFetch.status.value });
    displayedItems.value = getDisplayedItems();
    if(userTicketsFetch.status.value === 'error') {
      logger.warn('got failed tickets fetch status', undefined, ctrlKey);
      isError.value = true;
    } else if(userTicketsFetch.status.value === 'success') {
      isError.value = false;
      $emit('update:ready', true);
    }
  }, { immediate: true });

  userTicketsFetch.execute();
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
            :default-value="DefaultTimeRangeFilter"
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

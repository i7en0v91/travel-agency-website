<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { AppConfig, type EntityId, type OfferKind, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, eraseTimeOfDay, getValueForFlightDayFormatting, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
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

const TabHistoryOptionButtonGroup: ControlKey = [...ctrlKey, 'OptionBtnGroup'];
const TabHistoryOptionButtonFlights: ControlKey = [...TabHistoryOptionButtonGroup, 'Flights', 'Option'];
const TabHistoryOptionButtonStays: ControlKey = [...TabHistoryOptionButtonGroup, 'Stays', 'Option'];
const DefaultActiveTabKey: ControlKey = TabHistoryOptionButtonFlights;

const logger = getCommonServices().getLogger().addContextProps({ component: 'TabHistory' });
const isError = ref(false);

const timeRangeFilter = ref<TimeRangeFilter>();
const timeRangeFilterDropdownItems: {value: TimeRangeFilter, resName: I18nResName}[] = (['upcoming', 'passed'] as TimeRangeFilter[]).map(f => { return { value: f, resName: getI18nResName3('accountPage', 'tabHistory', f) }; });

const activeOptionCtrl = ref<ControlKey | undefined>();

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
const displayedItems = computed<{ [P in OfferKind]:(UserTicketItem[] | undefined) }>(() => {
  return (userTicketsFetch.status.value === 'success' && userTicketsFetch.data.value !== null) ? {
    flights: userTicketsFetch.data.value.filter(o => o.kind === 'flights' && (filterCheckpointDates.flights.isAfter((o as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc) === (timeRangeFilter.value === 'passed'))),
    stays: userTicketsFetch.data.value.filter(o => o.kind === 'stays' && (filterCheckpointDates.stays.isAfter((o as EntityDataAttrsOnly<IStayOffer>).checkIn) === (timeRangeFilter.value === 'passed')))
  } : {
    flights: undefined,
    stays: undefined
  };
});

watch(userTicketsFetch.status, () => { 
  logger.debug('tickets fetch status changed', { ctrlKey, status: userTicketsFetch.status.value });
  if(userTicketsFetch.status.value === 'error') {
    logger.warn('got failed tickets fetch status', undefined, ctrlKey);
    isError.value = true;
  } else if(userTicketsFetch.status.value === 'success') {
    isError.value = false;
    $emit('update:ready', true);
  }
});

onMounted(() => {
  logger.verbose('mounted, fetching tickets', ctrlKey);
  userTicketsFetch.execute();
});

</script>

<template>
  <div class="account-tab-container" role="form">
    <div class="account-tab-history-head mb-xs-2 mb-s-3 "> 
      <h2 class="account-page-tab-name font-h3">
        {{ $t(getI18nResName3('accountPage', 'tabHistory', 'title')) }}
      </h2>
      <DropdownList
        v-model:selected-value="timeRangeFilter"
        :ctrl-key="[...ctrlKey, 'TimeRangeFilter', 'Dropdown']"
        :caption-res-name="undefined"
        :persistent="true"
        kind="secondary"
        class="account-tab-history-dropdown"
        list-container-class="account-tab-history-dropdown-list"
        :default-value="DefaultTimeRangeFilter"
        :items="timeRangeFilterDropdownItems"
      />
    </div>
    <div class="account-tab-history pb-xs-2 pb-s-3 brdr-3" role="form">
      <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
        <OptionButtonGroup
          v-model:active-option-key="activeOptionCtrl"
          :ctrl-key="TabHistoryOptionButtonGroup"
          role="tablist"
          :options="[
            { ctrlKey: TabHistoryOptionButtonFlights, labelResName: getI18nResName3('accountPage', 'tabHistory', 'flightsTab'), shortIcon: 'airplane', enabled: true, role: { role: 'tab', tabPanelId: flightsTabHtmlId } },
            { ctrlKey: TabHistoryOptionButtonStays, labelResName: getI18nResName3('accountPage', 'tabHistory', 'staysTab'), shortIcon: 'bed', enabled: true, role: { role: 'tab', tabPanelId: staysTabHtmlId } }
          ]"
        />
        <OfferTabbedView
          :ctrl-key="[...ctrlKey, 'OfferTabView']" 
          :selected-kind="areCtrlKeysEqual((activeOptionCtrl ?? DefaultActiveTabKey), TabHistoryOptionButtonFlights) ? 'flights' : 'stays'" 
          :tab-panel-ids="{ flights: flightsTabHtmlId, stays: staysTabHtmlId }" 
          :displayed-items="displayedItems"
          :no-offers-res-name="{
            flights: getI18nResName3('accountPage', 'tabHistory', 'noOffers'),
            stays: getI18nResName3('accountPage', 'tabHistory', 'noOffers'),
          }"
          :card-component-types="{
            flights: FlightTicketCard,
            stays: StayTicketCard
          }" />
      </ErrorHelm>
    </div>
  </div>
</template>

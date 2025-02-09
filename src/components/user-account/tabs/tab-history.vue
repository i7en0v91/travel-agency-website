<script setup lang="ts">
import { AppConfig, type EntityId, type OfferKind, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, eraseTimeOfDay, getValueForFlightDayFormatting, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { TabHistoryOptionButtonGroup, TabHistoryOptionButtonFlights, TabHistoryOptionButtonStays } from './../../../helpers/constants';
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
  ctrlKey: string,
  ready: boolean
}
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const isError = ref(false);

const controlSettingsStore = useControlSettingsStore();
const timeRangeControlValueSetting = controlSettingsStore.getControlValueSetting<TimeRangeFilter>(`${ctrlKey}-TimeRangeFilter`, DefaultTimeRangeFilter, true);
const timeRangeFilter = ref<TimeRangeFilter>(timeRangeControlValueSetting.value ?? DefaultTimeRangeFilter);
const timeRangeFilterDropdownItems: {value: TimeRangeFilter, resName: I18nResName}[] = (['upcoming', 'passed'] as TimeRangeFilter[]).map(f => { return { value: f, resName: getI18nResName3('accountPage', 'tabHistory', f) }; });

const DefaultActiveTabKey = TabHistoryOptionButtonFlights;
const activeOptionCtrl = ref<string | undefined>();

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
    logger.verbose(`(TabHistory) received user tickets response, ctrlKey=${ctrlKey}`);
    if (!response) {
      logger.warn(`(TabHistory) user tickets response is empty, ctrlKey=${ctrlKey}`);
      return []; // error should be logged by fetchEx
    }
    return mapUserTicketsResult(response);
  },
  $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
});

const filterCheckpointDate = dayjs(eraseTimeOfDay(dayjs().local().toDate()));
const displayedItems = computed<{ [P in OfferKind]:(UserTicketItem[] | undefined) }>(() => {
  return (userTicketsFetch.status.value === 'success' && userTicketsFetch.data.value !== null) ? {
    flights: userTicketsFetch.data.value.filter(o => o.kind === 'flights' && (filterCheckpointDate.isAfter(getValueForFlightDayFormatting((o as EntityDataAttrsOnly<IFlightOffer>).departFlight.departTimeUtc, (o as EntityDataAttrsOnly<IFlightOffer>).departFlight.departAirport.city.utcOffsetMin)) === (timeRangeFilter.value === 'passed'))),
    stays: userTicketsFetch.data.value.filter(o => o.kind === 'stays' && (filterCheckpointDate.isAfter((o as EntityDataAttrsOnly<IStayOffer>).checkIn) === (timeRangeFilter.value === 'passed')))
  } : {
    flights: undefined,
    stays: undefined
  };
});

watch(userTicketsFetch.status, () => { 
  logger.debug(`(TabHistory) tickets fetch status changed: ctrlKey=${ctrlKey}, status=${userTicketsFetch.status.value}`);
  if(userTicketsFetch.status.value === 'error') {
    logger.warn(`(TabHistory) got failed tickets fetch status: ctrlKey=${ctrlKey}`);
    isError.value = true;
  } else if(userTicketsFetch.status.value === 'success') {
    isError.value = false;
    $emit('update:ready', true);
  }
});

onMounted(() => {
  logger.verbose(`(TabHistory) mounted, fetching tickets: ctrlKey=${ctrlKey}`);
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
        :ctrl-key="`${ctrlKey}-TimeRangeFilter`"
        :caption-res-name="undefined"
        :persistent="true"
        kind="secondary"
        class="account-tab-history-dropdown"
        list-container-class="account-tab-history-dropdown-list"
        :default-value="timeRangeControlValueSetting.value ?? DefaultTimeRangeFilter"
        :items="timeRangeFilterDropdownItems"
      />
    </div>
    <div class="account-tab-history pb-xs-2 pb-s-3 brdr-3" role="form">
      <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
        <OptionButtonGroup
          v-model:active-option-ctrl="activeOptionCtrl"
          :ctrl-key="TabHistoryOptionButtonGroup"
          role="tablist"
          :options="[
            { ctrlKey: TabHistoryOptionButtonFlights, labelResName: getI18nResName3('accountPage', 'tabHistory', 'flightsTab'), shortIcon: 'airplane', enabled: true, role: { role: 'tab', tabPanelId: flightsTabHtmlId } },
            { ctrlKey: TabHistoryOptionButtonStays, labelResName: getI18nResName3('accountPage', 'tabHistory', 'staysTab'), shortIcon: 'bed', enabled: true, role: { role: 'tab', tabPanelId: staysTabHtmlId } }
          ]"
        />
        <OfferTabbedView
          :ctrl-key="`${ctrlKey}-OfferTabView`" 
          :selected-kind="(activeOptionCtrl ?? DefaultActiveTabKey) === TabHistoryOptionButtonFlights ? 'flights' : 'stays'" 
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

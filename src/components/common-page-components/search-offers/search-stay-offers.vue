<script setup lang="ts">
import { AppConfig, getI18nResName2, StaysMaxRoomsCount, StaysMaxGuestsCount } from '@golobe-demo/shared';
import type { ISearchListItem, ISearchStayOffersMainParams, ISearchStayOffersParams } from './../../../types';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  takeInitialValuesFromUrlQuery?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  takeInitialValuesFromUrlQuery: false
});
const logger = getCommonServices().getLogger();

const { t } = useI18n();

const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

const elBtn = shallowRef<HTMLElement>();
const destinationCity = ref<ISearchListItem | undefined>();
const checkInDate = ref<Date | undefined>();
const checkOutDate = ref<Date | undefined>();
const numRooms = ref<number | undefined>();
const numGuests = ref<number | undefined>();

const controlSettingsStore = useControlSettingsStore();
const searchOffersStoreAccessor = useSearchOffersStore();

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchStayOffersMainParams>> | undefined;

defineExpose({
  getSearchParamsFromInputControls
});

if (props.takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', true, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  watch([destinationCity, checkInDate, checkOutDate, numRooms, numGuests], () => {
    logger.debug(`(SearchStayOffers) search params watch handler, ctrlKey=${props.ctrlKey}`);
    const inputParams = getSearchParamsFromInputControls();
    $emit('change', inputParams);
  });
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(getSearchParamsFromInputControls);
  watch(displayedSearchParams, () => {
    logger.debug(`(SearchStayOffers) search params change handler, ctrlKey=${props.ctrlKey}`);
    $emit('change', displayedSearchParams!.value);
  });
}

function getSearchParamsFromInputControls (): Partial<ISearchStayOffersMainParams> {
  return {
    type: 'stays',
    checkIn: checkInDate.value,
    checkOut: checkOutDate.value,
    city: destinationCity.value,
    numGuests: numGuests.value,
    numRooms: numRooms.value
  } as Partial<ISearchStayOffersMainParams>;
}

const hasMounted = ref(false);

function onCalendarDataChanged () {
  if (!hasMounted.value) {
    return;
  }

  if (!checkOutDate.value || !checkInDate.value) {
    return;
  }

  if (checkOutDate.value!.getTime() < checkInDate.value!.getTime()) {
    checkOutDate.value = checkInDate.value;
  }
}

const displayText = computed(() => {
  if (!hasMounted.value) {
    return '';
  }

  const numRoomsText = `${numRooms.value} ${t(getI18nResName2('searchStays', 'numRooms'), numRooms.value!)}`;
  const numGuestsText = `${numGuests.value} ${t(getI18nResName2('searchStays', 'numGuests'), numGuests.value!)}`;

  return `${numRoomsText}, ${numGuestsText}`;
});

function hideDropdown () {
  dropdown.value?.hide();
}

function onEscape () {
  hideDropdown();
}

onBeforeMount(() => {
  if (props.takeInitialValuesFromUrlQuery) {
    const roomValueSetting = controlSettingsStore.getControlValueSetting<number | undefined>(`${props.ctrlKey}-Rooms`, 1, true);
    roomValueSetting.value = displayedSearchParams?.value?.numRooms ?? 1;
    const guestsValueSetting = controlSettingsStore.getControlValueSetting<number | undefined>(`${props.ctrlKey}-Guests`, 1, true);
    guestsValueSetting.value = displayedSearchParams?.value?.numGuests ?? 1;
  }

  const roomValueSetting = controlSettingsStore.getControlValueSetting<number | undefined>(`${props.ctrlKey}-Rooms`, 1, true);
  if (roomValueSetting.value) {
    numRooms.value = roomValueSetting.value;
  }
  const guestsValueSetting = controlSettingsStore.getControlValueSetting<number | undefined>(`${props.ctrlKey}-Guests`, 1, true);
  if (guestsValueSetting.value) {
    numGuests.value = guestsValueSetting.value;
  }
});
onMounted(() => {
  hasMounted.value = true;
});

watch(checkInDate, () => {
  if (checkInDate.value && checkOutDate.value && checkOutDate.value.getTime() < checkInDate.value.getTime()) {
    checkOutDate.value = checkInDate.value;
  }
});

const $emit = defineEmits<{(event: 'change', params: Partial<ISearchStayOffersMainParams>): void}>();

</script>

<template>
  <div class="search-offers-controls search-stay-offers">
    <FieldFrame :text-res-name="getI18nResName2('searchStays', 'destinationCaption')" class="search-stays-destination-frame">
      <div class="search-stays-destination-div">
        <div
          class="search-stays-destination-icon pr-xs-3 mr-xs-2"
        />
        <SearchListInput
          v-model:selected-value="destinationCity"
          :initially-selected-value="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.city ?? null) : undefined"
          :ctrl-key="`${props.ctrlKey}-DestinationCity`"
          class="search-stays-destination"
          :item-search-url="`/${ApiEndpointCitiesSearch}`"
          :additional-query-params="{ includeCountry: true }"
          list-container-class="search-offers-dropdown-list-container"
          type="destination"
          :persistent="true"
          :placeholder-res-name="getI18nResName2('searchStays', 'destinationPlaceholder')"
          :min-suggestion-input-chars="2"
          :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelDestination')"
        />
      </div>
    </FieldFrame>
    <div class="search-stays-dates">
      <DatePicker
        v-model:selected-date="checkInDate"
        :initially-selected-date="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.checkIn ?? null) : undefined"
        :ctrl-key="`${props.ctrlKey}-CheckIn`"
        class="search-stays-checkin"
        :caption-res-name="getI18nResName2('searchStays', 'checkInCaption')"
        :persistent="true"
        @update:selected-date="onCalendarDataChanged()"
      />
      <DatePicker
        v-model:selected-date="checkOutDate"
        :initially-selected-date="takeInitialValuesFromUrlQuery ? (displayedSearchParams?.checkOut ?? null) : undefined"
        :ctrl-key="`${props.ctrlKey}-CheckOut`"
        class="search-stays-checkout"
        :caption-res-name="getI18nResName2('searchStays', 'checkOutCaption')"
        :persistent="true"
        :default-date="dayjs().utc(true).add(AppConfig.autoInputDatesRangeDays, 'day').toDate()"
        :min-date="checkInDate"
        @update:selected-date="onCalendarDataChanged()"
      />
    </div>
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
      :distance="-6"
      :hide-triggers="[(triggers: any) => [...triggers, 'click']]"
      placement="bottom"
      class="search-stays-bookparams"
      :flip="false"
      :no-auto-focus="true"
      :boundary="elBtn"
      theme="control-dropdown"
      @keyup.escape="onEscape"
    >
      <FieldFrame :text-res-name="getI18nResName2('searchStays', 'roomsGuestsCaption')" class="search-stays-bookparams-frame">
        <button
          :id="`stays-bookparams-${props.ctrlKey}`"
          ref="elBtn"
          class="search-stays-bookparams-btn brdr-1"
          type="button"
        >
          {{ displayText }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <div class="search-stays-bookparams-content p-xs-2" :data-popper-anchor="`stays-bookparams-${props.ctrlKey}`">
            <SearchOffersCounter
              v-model:value="numRooms"
              :ctrl-key="`${ctrlKey}-Rooms`"
              :default-value="1"
              :min-value="1"
              :max-value="StaysMaxRoomsCount"
              :label-res-name="getI18nResName2('searchStays', 'numberOfRooms')"
            />
            <SearchOffersCounter
              v-model:value="numGuests"
              :ctrl-key="`${ctrlKey}-Guests`"
              class="mt-xs-4"
              :default-value="1"
              :min-value="1"
              :max-value="StaysMaxGuestsCount"
              :label-res-name="getI18nResName2('searchStays', 'numberOfGuests')"
            />
          </div>
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

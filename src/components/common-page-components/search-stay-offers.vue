<script setup lang="ts">
import { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import { WebApiRoutes, StaysMaxRoomsCount, StaysMaxGuestsCount, TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import type { ISearchListItem, ISearchStayOffersMainParams, ISearchStayOffersParams } from './../../shared/interfaces';
import { updateTabIndices } from './../../shared/dom';
import SearchListInput from './../../components/forms/search-list-input.vue';
import DatePicker from './../../components/forms/date-picker.vue';
import { getI18nResName2 } from './../../shared/i18n';
import SearchOffersCounter from './search-offers-counter.vue';
import { useSearchOffersStore } from './../../stores/search-offers-store';
import AppConfig from './../../appconfig';

interface IProps {
  ctrlKey: string,
  takeInitialValuesFromUrlQuery?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  takeInitialValuesFromUrlQuery: false
});
const logger = CommonServicesLocator.getLogger();

const { t } = useI18n();

const dropdown = ref<InstanceType<typeof Dropdown>>();

const elBtn = ref<HTMLElement>();
const destinationCity = ref<ISearchListItem | undefined>();
const checkInDate = ref<Date | undefined>();
const checkOutDate = ref<Date | undefined>();
const numRooms = ref<number | undefined>();
const numGuests = ref<number | undefined>();

const controlSettingsStore = useControlSettingsStore();
const searchOffersStoreAccessor = useSearchOffersStore();

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchStayOffersMainParams>> | undefined;
if (props.takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', true);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => { return searchOffersStore!.currentSearchParams; });
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => {
    return {
      type: 'stays',
      checkIn: checkInDate.value,
      checkOut: checkOutDate.value,
      city: destinationCity.value,
      numGuests: numGuests.value,
      numRooms: numRooms.value
    } as Partial<ISearchStayOffersMainParams>;
  });
}

watch(displayedSearchParams, () => {
  logger.verbose(`(SearchStayOffers) firing change event, ctrlKey=${props.ctrlKey}, params=${JSON.stringify(displayedSearchParams!.value)}`);
  searchOffersStore!.setMainSearchParams(displayedSearchParams!.value);
  $emit('change', displayedSearchParams!.value);
});

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

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

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
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
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
          :item-search-url="`${WebApiRoutes.CitiesSearch}`"
          :additional-query-params="{ includeCountry: true }"
          list-container-class="search-offers-dropdown-list-container"
          type="destination"
          :persistent="true"
          :placeholder-res-name="getI18nResName2('searchStays', 'destinationPlaceholder')"
          :min-suggestion-input-chars="2"
          :aria-label-res-name="getI18nResName2('searchStays', 'ariaLabelDestination')"
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
      :distance="-6"
      :hide-triggers="[(triggers: any) => [...triggers, 'click']]"
      placement="bottom"
      class="search-stays-bookparams"
      :flip="false"
      :boundary="elBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
      @keyup.escape="onEscape"
    >
      <FieldFrame :text-res-name="getI18nResName2('searchStays', 'roomsGuestsCaption')" class="search-stays-bookparams-frame">
        <button
          :id="`stays-bookparams-${ctrlKey}`"
          ref="elBtn"
          class="search-stays-bookparams-btn brdr-1"
          type="button"
        >
          {{ displayText }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <div class="search-stays-bookparams-content p-xs-2" :data-popper-anchor="`stays-bookparams-${ctrlKey}`">
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
    </vdropdown>
  </div>
</template>

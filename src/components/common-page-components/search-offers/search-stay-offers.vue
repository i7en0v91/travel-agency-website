<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { type EntityId, getI18nResName2, StaysMaxRoomsCount, StaysMaxGuestsCount, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import type { ISearchStayOffersMainParams, ISearchStayOffersParams } from './../../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  takeInitialValuesFromUrlQuery?: boolean
}
const { ctrlKey, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

const Today = eraseTimeOfDay(dayjs().toDate());

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchStayOffers' });
const controlValuesStore = useControlValuesStore();
const searchOffersStoreAccessor = useSearchOffersStore();

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchStayOffersMainParams>> | undefined;

const { t } = useI18n();

const destinationCityId = ref<EntityId>();
const checkInDate = ref<Date>();
const checkOutDate = ref<Date>();
const numRooms = ref<number>();
const numGuests = ref<number>();
const hasMounted = ref(false);

const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const openBtn = useTemplateRef<HTMLElement>('open-btn');

defineExpose({
  getSearchParamsFromInputControls
});

if (takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', true, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  destinationCityId.value = displayedSearchParams.value?.cityId;
  checkInDate.value = displayedSearchParams.value?.checkIn;
  checkOutDate.value = displayedSearchParams.value?.checkOut;
  numRooms.value = displayedSearchParams.value?.numRooms;
  numGuests.value = displayedSearchParams.value?.numGuests;
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(getSearchParamsFromInputControls);
}

const displayText = import.meta.client ? (
  controlValuesStore.acquireValuesView(
    (numRoomsRef, numGuestsRef) => {
      const numRooms = numRoomsRef.value as number;
      const numGuests = numGuestsRef.value as number;
      if([numRooms, numGuests].some(v => v === undefined || v === null)) {
        return '';
      }

      const numRoomsText = `${numRooms} ${t(getI18nResName2('searchStays', 'numRooms'), numRooms)}`;
      const numGuestsText = `${numGuests} ${t(getI18nResName2('searchStays', 'numGuests'), numGuests)}`;

      return hasMounted.value ? `${numRoomsText}, ${numGuestsText}` : '';
    }, 
    [...ctrlKey, 'Guests', 'Counter'], 
    [...ctrlKey, 'Rooms', 'Counter']
  )
) : computed(() => '');

function getSearchParamsFromInputControls (): Partial<ISearchStayOffersMainParams> {
  return {
    type: 'stays',
    checkIn: checkInDate.value,
    checkOut: checkOutDate.value,
    cityId: destinationCityId.value,
    numGuests: numGuests.value,
    numRooms: numRooms.value
  } as Partial<ISearchStayOffersMainParams>;
}

function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

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

const $emit = defineEmits<{(event: 'change', params: Partial<ISearchStayOffersMainParams>): void}>();

onMounted(() => {
  hasMounted.value = true;

  watch([checkInDate, checkOutDate], () => {
    if (!checkOutDate.value || !checkInDate.value) {
      return;
    }

    if (checkOutDate.value!.getTime() < checkInDate.value!.getTime()) {
      checkOutDate.value = checkInDate.value;
    }
  }, { immediate: true });

  if (takeInitialValuesFromUrlQuery) {
    watch([destinationCityId, checkInDate, checkOutDate, numRooms, numGuests], () => {
      logger.debug('search params watch handler', ctrlKey);
      const inputParams = getSearchParamsFromInputControls();
      $emit('change', inputParams);
    });
  } else {
    watch(displayedSearchParams, () => {
      logger.debug('search params change handler', ctrlKey);
      $emit('change', displayedSearchParams!.value);
    });
  }

  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

</script>

<template>
  <div class="search-offers-controls search-stay-offers">
    <FieldFrame :text-res-name="getI18nResName2('searchStays', 'destinationCaption')" class="search-stays-destination-frame">
      <div class="search-stays-destination-div">
        <div
          class="search-stays-destination-icon pr-xs-3 mr-xs-2"
        />
        <SearchListInput
          v-model:selected-value="destinationCityId"
          :ctrl-key="[...ctrlKey, 'Destination', 'SearchList']"
          :additional-query-params="{ includeCountry: true }"
          type="City"
          :min-suggestion-input-chars="2"
          class="search-stays-destination"
          list-container-class="search-offers-dropdown-list-container"
          :placeholder-res-name="getI18nResName2('searchStays', 'destinationPlaceholder')"
          :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelDestination')"
        />
      </div>
    </FieldFrame>
    <div class="search-stays-dates">
      <DatePicker
        v-model:selected-date="checkInDate"
        :ctrl-key="[...ctrlKey, 'CheckIn', 'DatePicker']"
        class="search-stays-checkin"
        :caption-res-name="getI18nResName2('searchStays', 'checkInCaption')"
        :min-date="Today"
      />
      <DatePicker
        v-model:selected-date="checkOutDate"
        :ctrl-key="[...ctrlKey, 'CheckOut', 'DatePicker']"
        class="search-stays-checkout"
        :caption-res-name="getI18nResName2('searchStays', 'checkOutCaption')"
        :min-date="checkInDate"
      />
    </div>
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="[...ctrlKey, 'Wrapper']"
      :aria-id="`${toShortForm(ctrlKey)}-DropDownWrapper`"
      :distance="-6"
      :hide-triggers="[(triggers: any) => [...triggers, 'click']]"
      placement="bottom"
      class="search-stays-bookparams"
      :flip="false"
      :no-auto-focus="true"
      :boundary="openBtn"
      theme="control-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
      @keyup.escape="onEscape"
    >
      <FieldFrame :text-res-name="getI18nResName2('searchStays', 'roomsGuestsCaption')" class="search-stays-bookparams-frame">
        <button
          :id="`stays-bookparams-${toShortForm(ctrlKey)}`"
          ref="open-btn"
          class="search-stays-bookparams-btn brdr-1"
          type="button"
        >
          {{ displayText ?? '' }}
        </button>
      </FieldFrame>
      <template #popper>
        <ClientOnly>
          <div class="search-stays-bookparams-content p-xs-2" :data-popper-anchor="`stays-bookparams-${toShortForm(ctrlKey)}`">
            <SearchOffersCounter
              v-model:value="numRooms"
              :ctrl-key="[...ctrlKey, 'Rooms', 'Counter']"
              :default-value="StaysMinRoomsCount"
              :min-value="StaysMinRoomsCount"
              :max-value="StaysMaxRoomsCount"
              :label-res-name="getI18nResName2('searchStays', 'numberOfRooms')"
            />
            <SearchOffersCounter
              v-model:value="numGuests"
              :ctrl-key="[...ctrlKey, 'Guests', 'Counter']"
              class="mt-xs-4"
              :default-value="StaysMinGuestsCount"
              :min-value="StaysMinGuestsCount"
              :max-value="StaysMaxGuestsCount"
              :label-res-name="getI18nResName2('searchStays', 'numberOfGuests')"
            />
          </div>
        </ClientOnly>
      </template>
    </VDropdown>
  </div>
</template>

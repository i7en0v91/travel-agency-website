<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { getI18nResName2, StaysMaxRoomsCount, StaysMaxGuestsCount, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { Dropdown } from 'floating-vue';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchOffersCounter from './search-offers-counter.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const Today = eraseTimeOfDay(dayjs().toDate());

const controlValuesStore = useControlValuesStore();

const { t } = useI18n();

const checkInDate = ref<Date>();
const checkOutDate = ref<Date>();
const hasMounted = ref(false);

const dropdown = useTemplateRef<InstanceType<typeof Dropdown>>('dropdown');
const openBtn = useTemplateRef<HTMLElement>('open-btn');

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
              :ctrl-key="[...ctrlKey, 'Rooms', 'Counter']"
              :default-value="StaysMinRoomsCount"
              :min-value="StaysMinRoomsCount"
              :max-value="StaysMaxRoomsCount"
              :label-res-name="getI18nResName2('searchStays', 'numberOfRooms')"
            />
            <SearchOffersCounter
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

<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type EntityId, getI18nResName2, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import type { ISearchStayOffersMainParams, ISearchStayOffersParams } from './../../../types';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchStayParams from './search-stay-params.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  takeInitialValuesFromUrlQuery?: boolean
}
const { ctrlKey, takeInitialValuesFromUrlQuery = false } = defineProps<IProps>();

const Today = eraseTimeOfDay(dayjs().toDate());

const logger = getCommonServices().getLogger().addContextProps({ component: 'SearchStayOffers' });
const searchOffersStoreAccessor = useSearchOffersStore();

const destinationCityId = ref<EntityId>();
const checkInDate = ref<Date>();
const checkOutDate = ref<Date>();
const stayParams: Ref<{ numRooms: number, numGuests: number } | undefined> = ref();
const hasMounted = ref(false);

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchStayOffersMainParams>> | undefined;

defineExpose({
  getSearchParamsFromInputControls
});

if (takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', true, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  destinationCityId.value = displayedSearchParams.value?.cityId;
  checkInDate.value = displayedSearchParams.value?.checkIn;
  checkOutDate.value = displayedSearchParams.value?.checkOut;
  stayParams.value = (displayedSearchParams.value?.numGuests && displayedSearchParams.value?.numRooms) ? 
    { 
      numGuests: displayedSearchParams.value?.numGuests ?? StaysMinGuestsCount, 
      numRooms: displayedSearchParams.value?.numRooms ?? StaysMinRoomsCount
    } : undefined
  ;
} else {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', false, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(getSearchParamsFromInputControls);
}

function getSearchParamsFromInputControls (): Partial<ISearchStayOffersMainParams> {
  return {
    type: 'stays',
    checkIn: checkInDate.value,
    checkOut: checkOutDate.value,
    cityId: destinationCityId.value,
    numGuests: stayParams.value?.numGuests ?? StaysMinGuestsCount,
    numRooms: stayParams.value?.numRooms ?? StaysMinRoomsCount
  } as Partial<ISearchStayOffersMainParams>;
}

function eraseTimeOfDay (dateTime: Date): Date {
  const totalMs = dateTime.getTime();
  return new Date(totalMs - totalMs % (1000 * 60 * 60 * 24));
}

onMounted(() => {
  watch([checkInDate, checkOutDate], () => {
    if (!checkOutDate.value || !checkInDate.value) {
      return;
    }

    if (checkOutDate.value!.getTime() < checkInDate.value!.getTime()) {
      checkOutDate.value = checkInDate.value;
    }
  }, { immediate: true });

  if (takeInitialValuesFromUrlQuery) {
    watch([destinationCityId, checkInDate, checkOutDate, stayParams], () => {
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

  hasMounted.value = true;
});

const $emit = defineEmits<{(event: 'change', params: Partial<ISearchStayOffersMainParams>): void}>();

</script>

<template>
  <div class="flex flex-col xl:flex-row flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6 w-full h-full">
    <InputFieldFrame :text-res-name="getI18nResName2('searchStays', 'destinationCaption')" class="flex-grow-[4] flex-shrink-[4] basis-auto w-full">
      <div class="min-h-[3.25rem] max-h-[3.25rem] block w-full rounded ring-1 ring-inset ring-gray-500 dark:ring-gray-400 text-gray-500 dark:text-gray-400 font-medium pl-[16px]">
        <SearchListInput
          v-model:selected-value="destinationCityId"
          :ctrl-key="[...ctrlKey, 'Destination', 'SearchList']"
          class="w-full min-h-[3.25rem] max-h-[3.25rem]"
          :item-search-url="`/${ApiEndpointCitiesSearch}`"
          :additional-query-params="{ includeCountry: true }"
          type="City"
          :min-suggestion-input-chars="2"
          :placeholder-res-name="getI18nResName2('searchStays', 'destinationPlaceholder')"
          :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelDestination')"
        />
      </div>
    </InputFieldFrame>
    <div class="flex-grow-[5] flex-shrink-[3] basis-auto w-full flex flex-col sm:flex-row flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6">
      <DatePicker
        v-model:selected-date="checkInDate"
        :ctrl-key="[...ctrlKey, 'CheckIn', 'DatePicker']"
        :ui="{ wrapper: 'w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }"
        :caption-res-name="getI18nResName2('searchStays', 'checkInCaption')"
        :min-date="Today"
      />
      <DatePicker
        v-model:selected-date="checkOutDate"
        :ctrl-key="[...ctrlKey, 'CheckOut', 'DatePicker']"
        :ui="{ wrapper: 'w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }"
        :caption-res-name="getI18nResName2('searchStays', 'checkOutCaption')"
        :min-date="checkInDate"
      />
    </div>
    <SearchStayParams v-model:params="stayParams" :ui="{ wrapper: 'flex-grow-[2] flex-shrink-[4] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="[...ctrlKey, 'StayParams']" />    
  </div>
</template>

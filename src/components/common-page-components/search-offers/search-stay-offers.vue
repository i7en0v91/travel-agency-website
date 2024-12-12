<script setup lang="ts">
import { AppConfig, getI18nResName2, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import type { ISearchListItem, ISearchStayOffersMainParams, ISearchStayOffersParams } from './../../../types';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchStayParams from './search-stay-params.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  takeInitialValuesFromUrlQuery?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  takeInitialValuesFromUrlQuery: false
});
const logger = getCommonServices().getLogger();

const destinationCity: Ref<ISearchListItem | null | undefined> = ref();
const checkInDate = ref<Date | null | undefined>();
const checkOutDate = ref<Date | null | undefined>();
const stayParams: Ref<{ numRooms: number, numGuests: number } | null | undefined> = ref();

const searchOffersStoreAccessor = useSearchOffersStore();

let searchOffersStore: Awaited<ReturnType<typeof searchOffersStoreAccessor.getInstance<ISearchStayOffersParams>>> | undefined;
let displayedSearchParams: ComputedRef<Partial<ISearchStayOffersMainParams>> | undefined;

defineExpose({
  getSearchParamsFromInputControls
});

if (props.takeInitialValuesFromUrlQuery) {
  searchOffersStore = await searchOffersStoreAccessor.getInstance('stays', true, false);
  displayedSearchParams = computed<Partial<ISearchStayOffersMainParams>>(() => { return searchOffersStore!.viewState.currentSearchParams; });
  destinationCity.value = displayedSearchParams.value?.city ?? null;
  checkInDate.value = displayedSearchParams.value?.checkIn ?? null;
  checkOutDate.value = displayedSearchParams.value?.checkOut ?? null;
  stayParams.value = (displayedSearchParams.value?.numGuests && displayedSearchParams.value?.numRooms) ? 
    { 
      numGuests: displayedSearchParams.value?.numGuests ?? StaysMinGuestsCount, 
      numRooms: displayedSearchParams.value?.numRooms ?? StaysMinRoomsCount
    } : null
  ;

  watch([destinationCity, checkInDate, checkOutDate, stayParams], () => {
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
    numGuests: stayParams.value?.numGuests,
    numRooms: stayParams.value?.numRooms
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
  <div class="flex flex-col xl:flex-row flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6 w-full h-full">
    <InputFieldFrame :text-res-name="getI18nResName2('searchStays', 'destinationCaption')" class="flex-grow-[4] flex-shrink-[4] basis-auto w-full">
      <div class="min-h-[3.25rem] max-h-[3.25rem] block w-full rounded ring-1 ring-inset ring-gray-500 dark:ring-gray-400 text-gray-500 dark:text-gray-400 font-medium pl-[16px]">
        <SearchListInput
          v-model:selected-value="destinationCity"
          :ctrl-key="`${props.ctrlKey}-DestinationCity`"
          class="w-full min-h-[3.25rem] max-h-[3.25rem]"
          :item-search-url="`/${ApiEndpointCitiesSearch}`"
          :additional-query-params="{ includeCountry: true }"
          type="destination"
          :persistent="true"
          :placeholder-res-name="getI18nResName2('searchStays', 'destinationPlaceholder')"
          :min-suggestion-input-chars="2"
          :aria-label-res-name="getI18nResName2('ariaLabels', 'ariaLabelDestination')"
        />
      </div>
    </InputFieldFrame>
    <div class="flex-grow-[5] flex-shrink-[3] basis-auto w-full flex flex-col sm:flex-row flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6">
      <DatePicker
        v-model:selected-date="checkInDate"
        :ctrl-key="`${props.ctrlKey}-CheckIn`"
        :ui="{ wrapper: 'w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }"
        :caption-res-name="getI18nResName2('searchStays', 'checkInCaption')"
        :persistent="true"
        @update:selected-date="onCalendarDataChanged()"
      />
      <DatePicker
        v-model:selected-date="checkOutDate"
        :ctrl-key="`${props.ctrlKey}-CheckOut`"
        :ui="{ wrapper: 'w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }"
        :caption-res-name="getI18nResName2('searchStays', 'checkOutCaption')"
        :persistent="true"
        :default-date="dayjs().utc(true).add(AppConfig.autoInputDatesRangeDays, 'day').toDate()"
        :min-date="checkInDate ?? undefined"
        @update:selected-date="onCalendarDataChanged()"
      />
    </div>
    <SearchStayParams v-model:params="stayParams" :ui="{ wrapper: 'flex-grow-[2] flex-shrink-[4] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="`${ctrlKey}-StayParams`" />    
  </div>
</template>

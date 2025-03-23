<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointCitiesSearch } from './../../../server/api-definitions';
import dayjs from 'dayjs';
import SearchListInput from './../../../components/forms/search-list-input.vue';
import InputFieldFrame from '../../forms/input-field-frame.vue';
import DatePicker from './../../../components/forms/date-picker.vue';
import SearchStayParams from './search-stay-params.vue';

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const Today = eraseTimeOfDay(dayjs().toDate());

const checkInDate = ref<Date>();
const checkOutDate = ref<Date>();

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
});

</script>

<template>
  <div class="flex flex-col xl:flex-row flex-nowrap gap-x-[16px] gap-y-4 sm:gap-x-[24px] sm:gap-y-6 w-full h-full">
    <InputFieldFrame :text-res-name="getI18nResName2('searchStays', 'destinationCaption')" class="flex-grow-[4] flex-shrink-[4] basis-auto w-full">
      <div class="min-h-[3.25rem] max-h-[3.25rem] block w-full rounded ring-1 ring-inset ring-gray-500 dark:ring-gray-400 text-gray-500 dark:text-gray-400 font-medium pl-[16px]">
        <SearchListInput
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
    <SearchStayParams :ui="{ wrapper: 'flex-grow-[2] flex-shrink-[4] basis-auto w-full min-h-[3.25rem] max-h-[3.25rem]', input: 'min-h-[3.25rem] max-h-[3.25rem]' }" :ctrl-key="[...ctrlKey, 'StayParams']" />    
  </div>
</template>

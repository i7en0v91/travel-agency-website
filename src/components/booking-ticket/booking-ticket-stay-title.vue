<script setup lang="ts">
import { getLocalizeableValue, type Locale } from '@golobe-demo/shared';
import type { IBookingTicketStayTitleProps } from './../../types';

defineProps<IBookingTicketStayTitleProps>();

const { locale } = useI18n();

</script>

<template>
  <div class="px-8 w-fit h-full flex flex-col flex-nowrap items-center justify-center m-auto text-center font-ticket font-light opacity-75">
    <div class="whitespace-normal break-words text-[26px]">
      {{ getLocalizeableValue(stayName, locale as Locale) }}
    </div>
    <UDivider orientation="horizontal" class="w-full my-1" :ui="{ border: { base: 'border-primary-900 dark:border-white' } }" size="xs"/>
    <div class="whitespace-normal break-words mt-1 text-[20px]">
      {{ getLocalizeableValue(cityName, locale as Locale) }}
    </div>
  </div>
</template>

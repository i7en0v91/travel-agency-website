<script setup lang="ts">
import { type Locale, getLocalizeableValue } from '@golobe-demo/shared';
import isString from 'lodash-es/isString';
import type { IBookingTicketDatesItemProps } from './../../types';

defineProps<IBookingTicketDatesItemProps>();

const { locale } = useI18n();

</script>

<template>
  <div class="block w-full h-auto">
    <div v-if="label" class="block whitespace-nowrap text-3xl font-semibold text-primary-900 dark:text-white">
      {{ label }}
    </div>
    <USkeleton v-else class="w-16 h-9 mt-2" />
    <div v-if="sub" class="text-xs text-gray-500 dark:text-gray-300 mt-1">
      {{ isString(sub) ? $t(sub) : getLocalizeableValue(sub, locale as Locale) }}
    </div>
    <USkeleton v-else class="w-1/3 h-4 mt-1" />
  </div>
</template>

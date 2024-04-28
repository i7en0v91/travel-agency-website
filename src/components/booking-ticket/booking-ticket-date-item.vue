<script setup lang="ts">
import isString from 'lodash-es/isString';
import { getLocalizeableValue } from './../../shared/common';
import { type Locale } from './../../shared/constants';
import type { IBookingTicketDatesItemProps } from './../../shared/interfaces';

withDefaults(defineProps<IBookingTicketDatesItemProps>(), {
  label: undefined,
  sub: undefined
});

const { locale } = useI18n();

</script>

<template>
  <div class="ticket-date-item">
    <div v-if="label" class="ticket-date-item-label">
      {{ label }}
    </div>
    <div v-else class="ticket-date-item-label data-loading-stub text-data-loading" />
    <div v-if="sub" class="ticket-date-item-sub mt-xs-1">
      {{ isString(sub) ? $t(sub) : getLocalizeableValue(sub, locale as Locale) }}
    </div>
    <div v-else class="ticket-date-item-sub mt-xs-1 data-loading-stub text-data-loading" />
  </div>
</template>

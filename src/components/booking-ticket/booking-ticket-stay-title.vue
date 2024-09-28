<script setup lang="ts">
import { getLocalizeableValue, type Locale } from '@golobe-demo/shared';
import type { IBookingTicketStayTitleProps } from './../../types';

defineProps<IBookingTicketStayTitleProps>();

const { locale } = useI18n();

</script>

<template>
  <div class="booking-ticket-stay-title px-xs-5">
    <div class="booking-ticket-stay-name">
      {{ getLocalizeableValue(stayName, locale as Locale) }}
    </div>
    <div class="booking-ticket-stay-city mt-xs-1">
      {{ getLocalizeableValue(cityName, locale as Locale) }}
    </div>
  </div>
</template>

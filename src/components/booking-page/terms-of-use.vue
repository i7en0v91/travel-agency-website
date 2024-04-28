<script setup lang="ts">
import range from 'lodash-es/range';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import AppConfig from './../../appconfig';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

</script>

<template>
  <section class="booking-terms">
    <h2 class="booking-terms-title">
      {{ $t(getI18nResName2('bookingTnC', 'title')) }}
    </h2>
    <div class="booking-terms-section mt-xs-4 mt-s-5">
      <h3 class="booking-terms-section-title">
        {{ $t(getI18nResName3('bookingTnC', 'payments', 'title')) }}
      </h3>
      <ul class="booking-terms-payment-terms">
        <li v-for="(i) in range(0, 3)" :key="`${ctrlKey}-PaymentTerm${i}`" class="booking-terms-payment-term">
          <div class="booking-terms-payment-terms-bullet pt-xs-3 px-xs-2" />
          <div class="booking-terms-payment-terms-par pt-xs-3">
            {{ $t(getI18nResName3('bookingTnC', 'payments', `paragraph${i + 1}` as any), { companyName: AppConfig.booking.companyName }) }}
          </div>
        </li>
      </ul>
    </div>
    <div class="booking-terms-section mt-xs-4 mt-s-5">
      <h3 class="booking-terms-section-title">
        {{ $t(getI18nResName3('bookingTnC', 'contactUs', 'title')) }}
      </h3>
      <i18n-t :keypath="getI18nResName3('bookingTnC', 'contactUs', 'directions')" tag="div" scope="global" class="booking-terms-contacts mt-xs-2 mt-s-3">
        <template #siteUrl>
          <NuxtLink class="booking-terms-contacts-link brdr-1" :to="AppConfig.booking.siteUrl">
            {{ AppConfig.booking.siteUrl }}
          </NuxtLink>
        </template>
      </i18n-t>
    </div>
  </section>
</template>

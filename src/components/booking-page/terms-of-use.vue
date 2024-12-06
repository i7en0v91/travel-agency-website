<script setup lang="ts">
import { AppConfig, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import range from 'lodash-es/range';

interface IProps {
  ctrlKey: string
};
defineProps<IProps>();

const LiBullet = 'before:content-["•"]';

</script>

<template>
  <!--KB: not using MDC as localizations are also directly used in PDF document-->
  <section class="w-full h-auto max-w-[90vw] mt-16 text-primary-900 dark:text-white whitespace-normal break-words">
    <h2 class="text-2xl font-semibold">
      {{ $t(getI18nResName2('bookingTnC', 'title')) }}
    </h2>
    <div class="mt-6 sm:mt-8">
      <h3 class="text-xl font-semibold">
        {{ $t(getI18nResName3('bookingTnC', 'payments', 'title')) }}
      </h3>
      <ul class="table text-gray-600 dark:text-gray-300">
        <li v-for="(i) in range(0, 3)" :key="`${ctrlKey}-PaymentTerm${i}`" class="table-row">
          <div :class="`table-cell pt-4 px-2 before:inline-block ${LiBullet}`"/>
          <div class="table-cell pt-4 w-fit">
            {{ $t(getI18nResName3('bookingTnC', 'payments', `paragraph${i + 1}` as any), { companyName: AppConfig.booking.companyName }) }}
          </div>
        </li>
      </ul>
    </div>
    <div class="mt-6 sm:mt-8">
      <h3 class="text-xl font-semibold">
        {{ $t(getI18nResName3('bookingTnC', 'contactUs', 'title')) }}
      </h3>
      <i18n-t :keypath="getI18nResName3('bookingTnC', 'contactUs', 'directions')" tag="div" scope="global" class="text-gray-600 dark:text-gray-300 mt-2 sm:mt-4">
        <template #siteUrl>
          <ULink :to="AppConfig.booking.siteUrl" :external="true">
            {{ AppConfig.booking.siteUrl }}
          </ULink>
        </template>
      </i18n-t>
    </div>
  </section>
</template>

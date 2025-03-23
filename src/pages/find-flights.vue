<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import type { ControlKey } from './../helpers/components';
import { FindFlightsPageCtrlKey } from './../helpers/constants';

definePageMeta({
  title: { resName: getI18nResName2('flightsPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = FindFlightsPageCtrlKey;

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <h2 class="text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">{{ $t(getI18nResName2('flightsPage', 'title')) }}</h2>
    <LazySearchOffers :ctrl-key="['SearchOffers']" :show-promo-btn="false" class="mt-4 w-full" single-tab="flights" />
    <LazyListView :ctrl-key="[...CtrlKey, 'ListView']" offers-kind="flights" class="mt-8" />
  </div>
</template>

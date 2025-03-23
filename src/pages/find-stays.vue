<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import type { ControlKey } from './../helpers/components';
import { FindStaysPageCtrlKey } from './../helpers/constants';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined },
  middleware: ['02-redirect-with-search-stays-date-filled']
});
useOgImage();

const CtrlKey: ControlKey = FindStaysPageCtrlKey;

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <h2 class="text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">{{ $t(getI18nResName2('staysPage', 'title')) }}</h2>
    <LazySearchOffers :ctrl-key="['SearchOffers']" :show-promo-btn="false" class="mt-4 w-full" single-tab="stays" />
    <LazyListView :ctrl-key="[...CtrlKey, 'ListView']" offers-kind="stays" class="mt-8" />
  </div>
</template>

<script setup lang="ts">
import { getI18nResName2 } from '@golobe-demo/shared';
import type { ControlKey } from './../helpers/components';
import { FindStaysPageCtrlKey } from './../helpers/constants';

definePageMeta({
  title: { resName: getI18nResName2('staysPage', 'title'), resArgs: undefined },
  middleware: ['redirect-with-search-stays-date-filled']
});
useOgImage();

const CtrlKey: ControlKey = FindStaysPageCtrlKey;

</script>

<template>
  <div class="search-stays-page no-hidden-parent-tabulation-check">
    <h1 class="search-stays-page-title mb-xs-4">
      {{ $t(getI18nResName2('staysPage', 'title')) }}
    </h1>
    <LazySearchOffers :ctrl-key="['SearchOffers']" :minimum-buttons="true" class="search-stays-offers-box" single-tab="stays" />
    <LazyListView :ctrl-key="[...CtrlKey, 'ListView']" offers-kind="stays" class="mt-xs-5" />
  </div>
</template>

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
  <div class="search-flights-page no-hidden-parent-tabulation-check">
    <h1 class="search-flights-page-title mb-xs-4">
      {{ $t(getI18nResName2('flightsPage', 'title')) }}
    </h1>
    <LazySearchOffers :ctrl-key="['SearchOffers']" :minimum-buttons="true" class="search-flights-offers-box" single-tab="flights" />
    <LazyListView :ctrl-key="[...CtrlKey, 'ListView']" offers-kind="flights" class="mt-xs-5" />
  </div>
</template>

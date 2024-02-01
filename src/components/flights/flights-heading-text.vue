<script setup lang="ts">

import { getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <div class="heading-text" role="heading" aria-level="1">
    <h2>{{ $t(getI18nResName3('flightsPage', 'heading', 'main')) }}</h2>
    <p class="mt-xs-1">
      {{ $t(getI18nResName3('flightsPage', 'heading', 'sub')) }}
    </p>
  </div>
</template>

<script setup lang="ts">

import { getI18nResName3 } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <header class="heading-text">
    <h1 class="font-h2">{{ $t(getI18nResName3('searchPageCommon', 'heading', 'main')) }}</h1>
    <p class="mt-xs-1">
      {{ $t(getI18nResName3('searchPageCommon', 'heading', 'sub')) }}
    </p>
  </header>
</template>

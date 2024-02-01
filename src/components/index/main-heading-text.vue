<script setup lang="ts">

import { getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

</script>

<template>
  <div class="heading-text" role="heading" aria-level="1">
    <h2>{{ $t(getI18nResName3('indexPage', 'heading', 'pre')) }}</h2>
    <h1 class="mb-xs-3 mt-xs-1 mx-xs-3 mx-s-4 px-l-4 mx-l-5">
      {{ $t(getI18nResName3('indexPage', 'heading', 'main')) }}
    </h1>
    <p class="mx-xs-3 mx-s-4">
      {{ $t(getI18nResName3('indexPage', 'heading', 'sub')) }}
    </p>
  </div>
</template>

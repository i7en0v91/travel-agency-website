<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <header class="heading-text">
    <p class="heading-text-pre font-h2">{{ $t(getI18nResName3('indexPage', 'heading', 'pre')) }}</p>
    <h1 class="mb-xs-3 mt-xs-1 mx-xs-3 mx-s-4 px-l-4 mx-l-5">
      {{ $t(getI18nResName3('indexPage', 'heading', 'main')) }}
    </h1>
    <p class="mx-xs-3 mx-s-4">
      {{ $t(getI18nResName3('indexPage', 'heading', 'sub')) }}
    </p>
  </header>
</template>

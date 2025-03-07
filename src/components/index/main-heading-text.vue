<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey
}
defineProps<IProps>();

</script>

<template>
  <div class="relative w-auto h-full overflow-y-hidden">
    <header class="text-white font-bold break-words text-center w-full min-w-minpgw h-auto min-h-lvh mt-[40px] sm:mt-[80px] absolute top-[50px] sm:[top-80px] left-0 right-0 px-4">
      <p class="text-5xl break-words">{{ $t(getI18nResName3('indexPage', 'heading', 'pre')) }}</p>
      <h1 class="text-7xl break-words mt-6 mx-4 sm:mx-6 lg:px-6 lg:mx-8">
        {{ $t(getI18nResName3('indexPage', 'heading', 'main')) }}
      </h1>
      <p class="font-semibold text-xl break-words mt-6 mx-4 sm:mx-6">
        {{ $t(getI18nResName3('indexPage', 'heading', 'sub')) }}
      </p>
    </header>
  </div>
</template>

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
    <header class="text-white font-bold break-words text-start h-auto px-4 w-full max-w-[80vw] mx-auto mt-[70px] sm:mt-[140px] sm:ml-[100px] sm:mr-0 sm:max-w-[60vw] md:ml-[126px] xl:mt-[120px] xl:max-w-[50vw]">
      <h1 class="text-5xl break-words">
        {{ $t(getI18nResName3('searchPageCommon', 'heading', 'main')) }}
      </h1>
      <p class="font-semibold text-xl break-words mt-1">
        {{ $t(getI18nResName3('searchPageCommon', 'heading', 'sub')) }}
      </p>
    </header>
  </div>
</template>

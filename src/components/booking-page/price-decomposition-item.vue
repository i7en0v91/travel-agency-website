<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  labelResName: I18nResName,
  amount?: number
};
defineProps<IProps>();

</script>

<template>
  <li class="w-full h-auto flex flex-row flex-nowrap items-baseline gap-2 justify-between mt-4">
    <div class="flex-1 h-auto whitespace-normal">
      {{ $t(labelResName) }}
    </div>
    <div v-if="amount" class="flex-initial h-auto font-bold whitespace-nowrap text-end">
      {{ $n(Math.floor(amount), 'currency') }}
    </div>
    <USkeleton v-else class="flex-initial basis-1/3 h-4" />
  </li>
</template>

<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { PaymentMethodType, I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: ControlKey,
  selected: boolean,
  type: PaymentMethodType,
  headerResName: I18nResName,
  textResName: I18nResName,
  textResArgs?: any | null | undefined
};

defineProps<IProps>();

</script>

<template>
  <div class="cursor-pointer w-full h-auto flex flex-row flex-nowrap items-between justify-start gap-4 p-4 pl-0 bg-transparent dark:bg-transparent rounded-xl">
    <div class="block w-full h-auto align-middle">
      <div class="text-sm sm:text-base break-all sm:break-words font-bold">
        {{ $t(headerResName) }}
      </div>
      <div v-if="textResArgs !== undefined" class="payment-method-variant-text mt-xs-2">
        {{ $t(textResName, textResArgs ?? undefined) }}
      </div>
      <USkeleton v-else class="w-1/2 h-3 mt-2" />
    </div>
  </div>
</template>

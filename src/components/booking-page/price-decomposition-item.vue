<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string,
  labelResName: I18nResName,
  amount?: number
};
withDefaults(defineProps<IProps>(), {
  amount: undefined
});

</script>

<template>
  <li class="pricing-details-decomposition-item mt-xs-3">
    <div class="pricing-details-decomposition-label">
      {{ $t(labelResName) }}
    </div>
    <div v-if="amount" class="pricing-details-decomposition-amount">
      {{ $n(Math.floor(amount), 'currency') }}
    </div>
    <div v-else class="pricing-details-decomposition-amount data-loading-stub text-data-loading" />
  </li>
</template>

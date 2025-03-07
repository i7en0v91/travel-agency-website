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

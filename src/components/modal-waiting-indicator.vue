<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';
import { VueFinalModal } from 'vue-final-modal';

interface IProps {
  ctrlKey: string
  labelResName: I18nResName
}

defineProps<IProps>();

const $emit = defineEmits(['update:modelValue']);

</script>

<template>
  <VueFinalModal
    class="modal-waiting-indicator"
    content-class="modal-waiting-indicator-content"
    :click-to-close="false"
    :esc-to-close="false"
    :lock-scroll="false"
    @update:model-value="(val: boolean) => $emit('update:modelValue', val)"
  >
    <ClientOnly>
      <img class="waiting-indicator-image" src="/img/waiter.gif">
      <div class="waiting-indicator-label">
        {{ $t(labelResName) }}
      </div>
    </ClientOnly>
  </VueFinalModal>
</template>

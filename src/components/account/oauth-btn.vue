<script setup lang="ts">

import type { AuthProvider, I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string,
  provider: AuthProvider,
  ariaLabelResName?: I18nResName,
  enabled: boolean
}
const { enabled } = defineProps<IProps>();

const $emit = defineEmits(['click']);
function onClick () {
  if (!enabled) {
    return;
  }

  $emit('click');
}

</script>

<template>
  <button :class="`btn-oauth py-xs-3 icon-login-${provider.toLowerCase()} ${!enabled ? 'disabled' : ''} brdr-1`" type="button" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''" @click="onClick" />
</template>

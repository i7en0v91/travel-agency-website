<script setup lang="ts">

import type { AuthProvider } from './../../shared/interfaces';
import { type I18nResName } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  provider: AuthProvider,
  ariaLabelResName?: I18nResName,
  enabled: boolean
}
const props = withDefaults(defineProps<IProps>(), { ariaLabelResName: undefined });

const $emit = defineEmits(['click']);
function onClick () {
  if (!props.enabled) {
    return;
  }

  $emit('click');
}

</script>

<template>
  <button :class="`btn-oauth py-xs-3 icon-login-${provider.toLowerCase()} ${!enabled ? 'disabled' : ''} brdr-1`" type="button" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''" @click="onClick" />
</template>

<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';
import { type ButtonKind } from './../../shared/interfaces';

interface IProps {
  ctrlKey: string,
  labelResName?: I18nResName,
  kind?: ButtonKind,
  icon?: string,
  enabled?: boolean,
  role?: string
}
const props = withDefaults(defineProps<IProps>(), {
  kind: 'default',
  enabled: true,
  icon: undefined,
  labelResName: undefined,
  role: undefined
});
const $emit = defineEmits(['click']);

function onClick () {
  $emit('click');
}

const cssClass = computed(() => {
  let result = `btn py-xs-3 px-xs-2 ${props.icon ? `btn-icon icon-${props.icon}` : ''} ${!(props.labelResName?.length ?? 0) ? 'btn-icon-only' : ''} ${(props.enabled ?? true) ? 'enabled' : 'disabled'}`;
  switch (props.kind) {
    case 'icon':
      result += ' btn-picture';
      break;
    case 'accent':
      result += ' btn-accent';
      break;
    case 'support':
      result += ' btn-support';
      break;
  }
  return result;
});

</script>

<template>
  <button :class="cssClass" type="button" @click="onClick">
    {{ labelResName ? $t(labelResName) : '' }}
  </button>
</template>

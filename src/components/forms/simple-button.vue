<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';
import { type ButtonKind } from './../../types';

interface IProps {
  ctrlKey: string,
  labelResName?: I18nResName,
  ariaLabelResName?: I18nResName,
  labelResArgs?: any,
  titleResName?: I18nResName,
  tabbableGroupId?: string,
  kind?: ButtonKind,
  icon?: string,
  enabled?: boolean
}
const props = withDefaults(defineProps<IProps>(), {
  kind: 'default',
  enabled: true,
  icon: undefined,
  labelResName: undefined,
  labelResArgs: undefined,
  titleResName: undefined,
  ariaLabelResName: undefined,
  tabbableGroupId: undefined
});
const $emit = defineEmits(['click']);

function onClick () {
  $emit('click');
}

const cssClass = computed(() => {
  let result = `btn py-xs-3 px-xs-2 ${props.icon ? `btn-icon icon-${props.icon}` : ''} ${!(props.labelResName?.length ?? 0) ? 'btn-icon-only' : ''} ${(props.enabled ?? true) ? 'enabled' : 'disabled'} ${props.tabbableGroupId ? `tabbable-group-${props.tabbableGroupId}` : ''}`;
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
  <button :class="cssClass" type="button" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : undefined" :title="titleResName ? $t(titleResName) : undefined" @click="onClick">
    {{ labelResName ? (labelResArgs ? $t(labelResName, labelResArgs) : $t(labelResName)) : '' }}
  </button>
</template>

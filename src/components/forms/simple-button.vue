<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';
import type { ButtonKind } from './../../types';

interface IProps {
  ctrlKey: ControlKey,
  labelResName?: I18nResName,
  ariaLabelResName?: I18nResName,
  labelResArgs?: any,
  titleResName?: I18nResName,
  tabbableGroupId?: string,
  kind?: ButtonKind,
  icon?: string,
  enabled?: boolean
}
const { tabbableGroupId, labelResName, icon, enabled = true, kind = 'default' } = defineProps<IProps>();
const $emit = defineEmits(['click']);

function onClick () {
  $emit('click');
}

const cssClass = computed(() => {
  let result = `btn py-xs-3 px-xs-2 ${icon ? `btn-icon icon-${icon}` : ''} ${!(labelResName?.length ?? 0) ? 'btn-icon-only' : ''} ${(enabled ?? true) ? 'enabled' : 'disabled'} ${tabbableGroupId ? `tabbable-group-${tabbableGroupId}` : ''}`;
  switch (kind) {
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

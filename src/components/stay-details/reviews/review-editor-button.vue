<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';
import type { ReviewEditorButtonType } from './../../../types';
import kebabCase from 'lodash-es/kebabCase';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  type: ReviewEditorButtonType,
  disabled: boolean,
  active: boolean
}
const { ctrlKey, type, disabled, active } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewEditorButton' });

const cssClass = computed(() => `review-editor-button brdr-1 editor-icon-${kebabCase(type)} ${(disabled) ? 'disabled' : ''} ${(active) ? 'active' : ''}`);

const $emit = defineEmits(['click']);
function onClick () {
  logger.debug('clicked', ctrlKey);
  $emit('click');
}

</script>

<template>
  <button
    :disabled="disabled"
    :class="cssClass"
    :aria-label="$t(getI18nResName3('reviewEditor', 'buttons', type))"
    @click="onClick"
  />
</template>

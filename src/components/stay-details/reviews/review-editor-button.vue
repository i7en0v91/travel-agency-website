<script setup lang="ts">
import { getI18nResName3 } from '@golobe-demo/shared';
import type { ReviewEditorButtonType } from './../../../types';
import kebabCase from 'lodash-es/kebabCase';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  type: ReviewEditorButtonType,
  disabled: boolean,
  active: boolean
}
const { ctrlKey, type, disabled, active } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const cssClass = computed(() => `review-editor-button brdr-1 editor-icon-${kebabCase(type)} ${(disabled) ? 'disabled' : ''} ${(active) ? 'active' : ''}`);

const $emit = defineEmits(['click']);
function onClick () {
  logger.debug(`(ReviewEditorButton) clicked, ctrlKey=${ctrlKey}`);
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

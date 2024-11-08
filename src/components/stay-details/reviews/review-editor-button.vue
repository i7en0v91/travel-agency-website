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
const props = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const styleClass = computed(() => `review-editor-button brdr-1 editor-icon-${kebabCase(props.type)} ${(props.disabled) ? 'disabled' : ''} ${(props.active) ? 'active' : ''}`);

const $emit = defineEmits(['click']);
function onClick () {
  logger.debug(`(ReviewEditorButton) clicked, ctrlKey=${props.ctrlKey}`);
  $emit('click');
}

</script>

<template>
  <button
    :disabled="disabled"
    :class="styleClass"
    :aria-label="$t(getI18nResName3('reviewEditor', 'buttons', type))"
    @click="onClick"
  />
</template>

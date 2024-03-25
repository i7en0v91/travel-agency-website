<script setup lang="ts">

import kebabCase from 'lodash-es/kebabCase';
import { getI18nResName3 } from './../../../shared/i18n';
import type { ReviewEditorButtonType } from './../../../shared/interfaces';

interface IProps {
  ctrlKey: string,
  type: ReviewEditorButtonType,
  disabled: boolean,
  active: boolean
}
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const cssClass = computed(() => `review-editor-button brdr-1 editor-icon-${kebabCase(props.type)} ${(props.disabled) ? 'disabled' : ''} ${(props.active) ? 'active' : ''}`);

const $emit = defineEmits(['click']);
function onClick () {
  logger.debug(`(ReviewEditorButton) clicked, ctrlKey=${props.ctrlKey}`);
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

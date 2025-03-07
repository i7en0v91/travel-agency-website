<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { getI18nResName3 } from '@golobe-demo/shared';
import type { ReviewEditorButtonType } from './../../../types';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  type: ReviewEditorButtonType,
  disabled: boolean,
  active: boolean
}
const { ctrlKey, type, disabled } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewEditorButton' });

const { t } = useI18n();

const iconsMap: { [P in ReviewEditorButtonType]: string } = {
  redo: 'i-tabler-arrow-forward-up',
  undo: 'i-tabler-arrow-back-up',
  blockquote: 'i-tabler-blockquote',
  bold: 'i-tabler-bold',
  italic: 'i-tabler-italic',
  strikethrough: 'i-tabler-strikethrough',
  bulletList: 'i-tabler-list',
  orderedList: 'i-tabler-list-numbers',
  underline: 'i-tabler-underline'
};

const $emit = defineEmits(['click']);
function onClick () {
  logger.debug('clicked', ctrlKey);
  $emit('click');
}

</script>

<template>
  <UButton :icon="iconsMap[type]" size="lg" :class="`flex-initial text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400 bg-transparent dark:bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 ${active ? 'bg-primary-200 dark:bg-primary-700 hover:bg-primary-300 dark:hover:bg-primary-800' : ''} disabled:!bg-transparent aria-disabled:!bg-transparent dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent disabled:opacity-50 dark:disabled:opacity-50`" variant="soft" color="gray" :disabled="disabled" :aria-label="$t(getI18nResName3('reviewEditor', 'buttons', type))" :title="t(getI18nResName3('reviewEditor', 'buttons', type))" @click="onClick"/>
</template>

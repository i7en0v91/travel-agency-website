<script setup lang="ts">
import type { ArbitraryControlElementMarker, ControlKey } from './../../../helpers/components';
import { type EntityId, AppException, AppExceptionCodeEnum, MaxStayReviewLength, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import type { ReviewEditorButtonType } from './../../../types';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { useModal } from 'vue-final-modal';
import { TiptapUnderline, TiptapPlaceholder } from './../../../client/tiptapExt';
import ReviewEditorButton from './review-editor-button.vue';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import ReviewScorePicker from './review-score-picker.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useStayReviewsStore } from '../../../stores/stay-reviews-store';

interface IProps {
  ctrlKey: ControlKey,
  stayId: EntityId
}

const { ctrlKey, stayId } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewEditor' });

const { t } = useI18n();

const editor = useEditor({
  content: '',
  extensions: [
    TiptapStarterKit,
    TiptapUnderline,
    TiptapPlaceholder.configure({
      placeholder: () => {
        return t(getI18nResName2('reviewEditor', 'placeholder'));
      }
    })]
});

function setEditedContent (content: string) {
  logger.verbose('set content', { ctrlKey, length: content?.length });
  editor.value?.commands.setContent(content);
}

defineExpose({
  setEditedContent
});

const stayReviewsStore = useStayReviewsStore();
const isMounted = ref(false);
const sendButtonVisible = computed(() => 
  !isMounted.value || stayReviewsStore.reviews.get(stayId)?.status === 'success'
);
const validationErrMsgResName = ref<I18nResName | undefined>();

let completeCallback: (() => void) | undefined;
const scorePickerResult = ref<number | 'cancel'>('cancel');
const { open } = useModal({
  component: ReviewScorePicker,
  attrs: {
    ctrlKey: [...ctrlKey, 'ScorePicker'],
    setResultCallback: (result: number | 'cancel') => { scorePickerResult.value = result; },
    onOpened () {
      logger.debug('opened score picker', { ctrlKey, result: scorePickerResult.value });
    },
    onClosed () {
      logger.debug('closing score picker', { ctrlKey, result: scorePickerResult.value });
      completeCallback!();
      setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
    }
  }
});

function refreshTabIndices () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onButtonClicked (type: ReviewEditorButtonType) {
  logger.debug('btn click handler', { ctrlKey, type });
  let editMethod: () => void;
  switch (type) {
    case 'bold':
      editMethod = () => editor.value?.chain().focus().toggleBold().run();
      break;
    case 'italic':
      editMethod = () => editor.value?.chain().focus().toggleItalic().run();
      break;
    case 'strikethrough':
      editMethod = () => editor.value?.chain().focus().toggleStrike().run();
      break;
    case 'underline':
      editMethod = () => editor.value?.chain().focus().toggleUnderline().run();
      break;
    case 'bulletList':
      editMethod = () => editor.value?.chain().focus().toggleBulletList().run();
      break;
    case 'orderedList':
      editMethod = () => editor.value?.chain().focus().toggleOrderedList().run();
      break;
    case 'blockquote':
      editMethod = () => editor.value?.chain().focus().toggleBlockquote().run();
      break;
    case 'undo':
      editMethod = () => editor.value?.chain().focus().undo().run();
      break;
    case 'redo':
      editMethod = () => editor.value?.chain().focus().redo().run();
      break;
  }
  try {
    editMethod();
    refreshTabIndices();
    logger.debug('btn click handler - completed', { ctrlKey, type });
  } catch (err: any) {
    logger.verbose('btn click handler failed', { ctrlKey, type });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'edit review error occured', 'error-stub');
  }
}

 
const $emit = defineEmits<{
(event: 'submitReview', reviewHtml: string, score: number): void,
(event: 'cancelEdit'): void,
// eslint-disable-next-line @typescript-eslint/unified-signatures
(event: 'startEdit'): void
}>();

function openScorePickerDialog (): Promise<void> {
  completeCallback = undefined;
  scorePickerResult.value = 'cancel';
  return new Promise((resolve) => {
    completeCallback = resolve;
    logger.debug('opening score picker dialog', ctrlKey);
    open();
  });
}

function isEditorTextValid (): true | I18nResName {
  logger.debug('validating editor text', ctrlKey);
  const validatingText = editor.value!.getText()?.replace(/\s/g, '') ?? '';
  let result = validatingText.length > 0 ? true : getI18nResName3('stayDetailsPage', 'reviews', 'validationErrEmptyReview');
  if (result !== true) {
    editor.value?.commands.setContent(''); // reset to inital state
  }
  if (result && editor.value!.getHTML().length >= MaxStayReviewLength) {
    result = getI18nResName3('stayDetailsPage', 'reviews', 'validationErrTooLongReview');
  }
  logger.debug('editor text validation finished', { ctrlKey, text: validatingText, result });
  return result;
}

async function onSendReviewBtnClick (): Promise<void> {
  logger.debug('send review btn click handler', ctrlKey);

  validationErrMsgResName.value = undefined;
  const validationResult = isEditorTextValid();
  if (validationResult !== true) {
    validationErrMsgResName.value = validationResult;
    logger.verbose('review text validation failed', { ctrlKey, result: validationResult });
    return;
  }

  await openScorePickerDialog();

  const result = scorePickerResult.value;
  if (!result || result === 'cancel') {
    logger.verbose('cancelled', { ctrlKey, result: scorePickerResult.value });
    return;
  }

  logger.verbose('submitting review', { ctrlKey, score: scorePickerResult.value });
  $emit('submitReview', editor.value!.getHTML(), result);
}

function onCancelReviewEditBtnClick () {
  logger.debug('cancel review edit btn click handler', ctrlKey);
  validationErrMsgResName.value = undefined;
  $emit('cancelEdit');
}

onBeforeUnmount(() => {
  logger.verbose('before unmount handler', ctrlKey);
  unref(editor)?.destroy();
});

onMounted(() => {
  logger.verbose('mounted', ctrlKey);
  isMounted.value = true;
  refreshTabIndices();
});

</script>

<template>
  <div class="review-editor">
    <div v-if="editor" class="review-editor-container">
      <div class="review-editor-buttons">
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Bold' as ArbitraryControlElementMarker]"
          type="bold"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :active="editor.isActive('bold')"
          @click="onButtonClicked('bold')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Italic' as ArbitraryControlElementMarker]"
          type="italic"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :active="editor.isActive('italic')"
          @click="onButtonClicked('italic')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Strikethrough' as ArbitraryControlElementMarker]"
          type="strikethrough"
          :disabled="!editor.can().chain().focus().toggleStrike().run()"
          :active="editor.isActive('strike')"
          @click="onButtonClicked('strikethrough')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Underline' as ArbitraryControlElementMarker]"
          type="underline"
          :disabled="!editor.can().chain().focus().toggleUnderline().run()"
          :active="editor.isActive('underline')"
          @click="onButtonClicked('underline')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'BulletList' as ArbitraryControlElementMarker]"
          type="bulletList"
          :disabled="false"
          :active="editor.isActive('bulletList')"
          @click="onButtonClicked('bulletList')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'OrderedList' as ArbitraryControlElementMarker]"
          type="orderedList"
          :disabled="false"
          :active="editor.isActive('orderedList')"
          @click="onButtonClicked('orderedList')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Blockquote' as ArbitraryControlElementMarker]"
          type="blockquote"
          :disabled="false"
          :active="editor.isActive('blockquote')"
          @click="onButtonClicked('blockquote')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Undo' as ArbitraryControlElementMarker]"
          type="undo"
          :disabled="!editor.can().chain().focus().undo().run()"
          :active="editor.isActive('undo')"
          @click="onButtonClicked('undo')"
        />
        <ReviewEditorButton
          :ctrl-key="[...ctrlKey, 'ReviewEditorBtn', 'Redo' as ArbitraryControlElementMarker]"
          type="redo"
          :disabled="!editor.can().chain().focus().redo().run()"
          :active="editor.isActive('redo')"
          @click="onButtonClicked('redo')"
        />
      </div>
    </div>
    <div class="tiptap-div">
      <PerfectScrollbar
        :options="{
          suppressScrollX: false,
          suppressScrollY: false,
          wheelPropagation: true
        }"
        :watch-options="false"
        tag="div"
        class="tiptap-main-scroll"
      >
        <TiptapEditorContent :editor="editor" />
      </PerfectScrollbar>
    </div>
    <div v-if="validationErrMsgResName" class="form-error-msg my-xs-2 my-s-3">
      {{ $t(validationErrMsgResName) }}
    </div>
    <div class="review-editor-control-buttons mt-xs-2 mt-s-3 pb-xs-2">
      <SimpleButton
        kind="support"
        :ctrl-key="[...ctrlKey, 'Btn', 'Cancel']"
        icon="cross"
        :label-res-name="getI18nResName3('reviewEditor', 'controlButtons', 'cancel')"
        @click="onCancelReviewEditBtnClick"
      />
      <SimpleButton
        v-if="sendButtonVisible"
        kind="default"
        :ctrl-key="[...ctrlKey, 'Btn', 'Send']"
        icon="paper-plane"
        :label-res-name="getI18nResName3('reviewEditor', 'controlButtons', 'send')"
        @click="onSendReviewBtnClick"
      />
      <ComponentWaitingIndicator v-else :ctrl-key="[...ctrlKey, 'Send', 'Waiter']" class="send-review-waiting-indicator" />
    </div>
  </div>
</template>

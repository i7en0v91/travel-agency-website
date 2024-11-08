<script setup lang="ts">
import { type EntityId, AppException, AppExceptionCodeEnum, MaxStayReviewLength, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { type ReviewEditorButtonType } from './../../../types';
import { useModal } from 'vue-final-modal';
import { TiptapUnderline, TiptapPlaceholder } from './../../../client/tiptapExt';
import ReviewEditorButton from './review-editor-button.vue';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import ReviewScorePicker from './review-score-picker.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  stayId: EntityId
}

const props = defineProps<IProps>();
const logger = getCommonServices().getLogger();

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
  logger.verbose(`(ReviewEditor) set content, ctrlKey=${props.ctrlKey}, length=${content?.length}`);
  editor.value?.commands.setContent(content);
}

defineExpose({
  setEditedContent
});

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(props.stayId);

const validationErrMsgResName = ref<I18nResName | undefined>();

let completeCallback: (() => void) | undefined;
const scorePickerResult = ref<number | 'cancel'>('cancel');
const { open } = useModal({
  component: ReviewScorePicker,
  attrs: {
    ctrlKey: `${props.ctrlKey}-scorePicker`,
    setResultCallback: (result: number | 'cancel') => { scorePickerResult.value = result; },
    onOpened () {
      logger.debug(`(ReviewEditor) opened score picker: ctrlKey=${props.ctrlKey}, result=${scorePickerResult.value}`); ;
    },
    onClosed () {
      const logger = getCommonServices().getLogger();
      logger.debug(`(ReviewEditor) closing score picker: ctrlKey=${props.ctrlKey}, result=${scorePickerResult.value}`);
      completeCallback!();
    }
  }
});

function onButtonClicked (type: ReviewEditorButtonType) {
  logger.debug(`(ReviewEditor) btn click handler, ctrlKey=${props.ctrlKey}, type=${type}`);
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
    logger.debug(`(ReviewEditor) btn click handler - completed, ctrlKey=${props.ctrlKey}, type=${type}`);
  } catch (err: any) {
    logger.verbose(`(ReviewEditor) btn click handler failed, ctrlKey=${props.ctrlKey}, type=${type}`, err);
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
    logger.debug(`(ReviewEditor) opening score picker dialog, ctrlKey=${props.ctrlKey}`);
    open();
  });
}

function isEditorTextValid (): true | I18nResName {
  logger.debug(`(ReviewEditor) validating editor text, ctrlKey=${props.ctrlKey}`);
  const validatingText = editor.value!.getText()?.replace(/\s/g, '') ?? '';
  let result = validatingText.length > 0 ? true : getI18nResName3('stayDetailsPage', 'reviews', 'validationErrEmptyReview');
  if (result !== true) {
    editor.value?.commands.setContent(''); // reset to inital state
  }
  if (result && editor.value!.getHTML().length >= MaxStayReviewLength) {
    result = getI18nResName3('stayDetailsPage', 'reviews', 'validationErrTooLongReview');
  }
  logger.debug(`(ReviewEditor) editor text validation finished, ctrlKey=${props.ctrlKey}, text=${validatingText}, result=${result}`);
  return result;
}

async function onSendReviewBtnClick (): Promise<void> {
  logger.debug(`(ReviewEditor) send review btn click handler, ctrlKey=${props.ctrlKey}`);

  validationErrMsgResName.value = undefined;
  const validationResult = isEditorTextValid();
  if (validationResult !== true) {
    validationErrMsgResName.value = validationResult;
    logger.verbose(`(ReviewEditor) review text validation failed, ctrlKey=${props.ctrlKey}, result=${validationResult}`);
    return;
  }

  await openScorePickerDialog();

  const result = scorePickerResult.value;
  if (!result || result === 'cancel') {
    logger.verbose(`(ReviewEditor) cancelled, ctrlKey=${props.ctrlKey}, result=${scorePickerResult.value}`);
    return;
  }

  logger.verbose(`(ReviewEditor) submitting review, ctrlKey=${props.ctrlKey}, score=${scorePickerResult.value}`);
  $emit('submitReview', editor.value!.getHTML(), result);
}

function onCancelReviewEditBtnClick () {
  logger.debug(`(ReviewEditor) cancel review edit btn click handler, ctrlKey=${props.ctrlKey}`);
  validationErrMsgResName.value = undefined;
  $emit('cancelEdit');
}

const isMounted = ref(false);
function isSendButtonVisible (): boolean {
  return !isMounted.value || reviewStore.status !== 'pending';
}
const sendButtonVisible = ref(isSendButtonVisible());

watch(() => reviewStore.status, () => {
  logger.debug(`(ReviewEditor) review store status changed, ctrlKey=${props.ctrlKey}, status=${reviewStore.status}`);
  sendButtonVisible.value = isSendButtonVisible();
});

onBeforeUnmount(() => {
  logger.verbose(`(ReviewEditor) before unmount handler, ctrlKey=${props.ctrlKey}`);
  unref(editor)?.destroy();
});

onMounted(() => {
  logger.verbose(`(ReviewEditor) mounted, ctrlKey=${props.ctrlKey}`);
  isMounted.value = true;
  sendButtonVisible.value = isSendButtonVisible();
});

</script>

<template>
  <div class="review-editor">
    <div v-if="editor" class="review-editor-container">
      <div class="review-editor-buttons">
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnBold`"
          type="bold"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :active="editor.isActive('bold')"
          @click="onButtonClicked('bold')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnItalic`"
          type="italic"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :active="editor.isActive('italic')"
          @click="onButtonClicked('italic')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnStrikethrough`"
          type="strikethrough"
          :disabled="!editor.can().chain().focus().toggleStrike().run()"
          :active="editor.isActive('strike')"
          @click="onButtonClicked('strikethrough')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnUnderline`"
          type="underline"
          :disabled="!editor.can().chain().focus().toggleUnderline().run()"
          :active="editor.isActive('underline')"
          @click="onButtonClicked('underline')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnBulletList`"
          type="bulletList"
          :disabled="false"
          :active="editor.isActive('bulletList')"
          @click="onButtonClicked('bulletList')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnOrderedList`"
          type="orderedList"
          :disabled="false"
          :active="editor.isActive('orderedList')"
          @click="onButtonClicked('orderedList')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnBlockquote`"
          type="blockquote"
          :disabled="false"
          :active="editor.isActive('blockquote')"
          @click="onButtonClicked('blockquote')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnUndo`"
          type="undo"
          :disabled="!editor.can().chain().focus().undo().run()"
          :active="editor.isActive('undo')"
          @click="onButtonClicked('undo')"
        />
        <ReviewEditorButton
          :ctrl-key="`${props.ctrlKey}-BtnRedo`"
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
        :ctrl-key="`${ctrlKey}-CancelReviewEdit`"
        icon="cross"
        :label-res-name="getI18nResName3('reviewEditor', 'controlButtons', 'cancel')"
        @click="onCancelReviewEditBtnClick"
      />
      <SimpleButton
        v-if="sendButtonVisible"
        kind="default"
        :ctrl-key="`${ctrlKey}-SendReview`"
        icon="paper-plane"
        :label-res-name="getI18nResName3('reviewEditor', 'controlButtons', 'send')"
        @click="onSendReviewBtnClick"
      />
      <ComponentWaitingIndicator v-else :ctrl-key="`${ctrlKey}-SendReviewWaiter`" class="send-review-waiting-indicator" />
    </div>
  </div>
</template>

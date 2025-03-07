<script setup lang="ts">
import type { ArbitraryControlElementMarker, ControlKey } from './../../../helpers/components';
import { type EntityId, AppException, AppExceptionCodeEnum, MaxStayReviewLength, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import * as config from './../../../node_modules/@nuxt/ui/dist/runtime/ui.config/index.js';
import type { ReviewEditorButtonType } from './../../../types';
import { TiptapUnderline, TiptapPlaceholder } from './../../../client/tiptapExt';
import ReviewEditorButton from './review-editor-button.vue';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import ReviewScorePicker from './review-score-picker.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useModalDialogResult } from '../../../composables/modal-dialog-result';

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
const scorePickerResult = ref<number | 'cancel'>();
const reviewScorePickerRef = useTemplateRef('review-score-picker');  

function setEditedContent (content: string) {
  logger.verbose('set content', { ctrlKey, length: content?.length });
  editor.value?.commands.setContent(content);
}

defineExpose({
  setEditedContent
});

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(stayId);

const validationErrMsgResName = ref<I18nResName | undefined>();

const open = ref(false);

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

  const prevUserScore = scorePickerResult.value;
  const reviewScorePicker = useModalDialogResult<number | 'cancel'>(reviewScorePickerRef, { open, result: scorePickerResult }, 'cancel');
  const result = await reviewScorePicker.show();
  if (!result || result === 'cancel') {
    logger.verbose('cancelled', { ctrlKey, result: scorePickerResult.value });
    scorePickerResult.value = prevUserScore;
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

const isMounted = ref(false);
function isSendButtonVisible (): boolean {
  return !isMounted.value || reviewStore.status !== 'pending' || reviewStore.items === undefined;
}
const sendButtonVisible = ref(isSendButtonVisible());

watch(() => reviewStore.status, () => {
  logger.debug('review store status changed', { ctrlKey, status: reviewStore.status });
  sendButtonVisible.value = isSendButtonVisible();
});

onBeforeUnmount(() => {
  logger.verbose('before unmount handler', ctrlKey);
  unref(editor)?.destroy();
});

onMounted(() => {
  logger.verbose('mounted', ctrlKey);
  isMounted.value = true;
  sendButtonVisible.value = isSendButtonVisible();
});

</script>

<template>
  <div class="w-full h-auto">
    <div v-if="editor" class="w-full h-auto">
      <div class="w-full h-auto flex flex-row flex-wrap items-center gap-4">
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
    <div class="block relative overflow-hidden w-full h-[12rem] sm:h-[20rem] max-h-[12rem] sm:max-h-[20rem] rounded-xl ring-1 ring-gray-500 dark:ring-gray-400 mt-2" :style="{ overflowAnchor: 'none' }">
      <div data-review-editor-styling="1" class="relative max-h-[12rem] sm:max-h-[20rem] p-2 text-sm sm:text-base overflow-x-auto overflow-y-auto text-gray-600 dark:text-gray-300">
        <TiptapEditorContent :editor="editor" />
      </div>
    </div>
    <div v-if="validationErrMsgResName" :class="`my-2 sm:my-4 ${config.formGroup.error}`">
      {{ $t(validationErrMsgResName) }}
    </div>
    <div class="flex flex-row flex-wrap items-center gap-4 sm:gap-6 mt-4 pb-2">
      <UButton size="lg" icon="i-mdi-close" variant="outline" color="gray" @click="onCancelReviewEditBtnClick">
        {{ $t(getI18nResName3('reviewEditor', 'controlButtons', 'cancel')) }}
      </UButton>
      <UButton v-if="sendButtonVisible" size="lg" icon="i-ion-paper-plane" variant="solid" color="primary" @click="onSendReviewBtnClick">
        {{ $t(getI18nResName3('reviewEditor', 'controlButtons', 'send')) }}
      </UButton>
      <ComponentWaitingIndicator v-else :ctrl-key="[...ctrlKey, 'Send', 'Waiter']" class="!w-8 !h-8" ui="w-8 h-8"/>
    </div>
    <ReviewScorePicker 
      ref="review-score-picker"
      v-model:open="open" 
      v-model:result="scorePickerResult"
      :ctrl-key="[...ctrlKey, 'ScorePicker']" 
      @close="open = false"/>
  </div>
</template>


<style global>
  [data-review-editor-styling="1"] .tiptap {
    width: max-content;
  }

  [data-review-editor-styling="1"] .tiptap:focus-visible, [data-review-editor-styling="1"] .tiptap p:focus-visible, [data-review-editor-styling="1"] .tiptap div:focus-visible  {
    border: none;
    box-shadow: none;
    outline: none;
  }
  
  /* Display a Placeholder only for the first line in an empty editor. */
  [data-review-editor-styling="1"] .tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    opacity: 60%;
  }

  [data-review-editor-styling="1"] strong {
    font-weight: bold;
  }

  [data-review-editor-styling="1"] em {
    font-style: italic;
  }

  [data-review-editor-styling="1"] ul li p::before {
    content: '• ';
    display: inline;
  }

  [data-review-editor-styling="1"] ol { 
    counter-reset: item;
  }

  [data-review-editor-styling="1"] ol li { 
    display: block;
  }

  [data-review-editor-styling="1"] ol li::before { 
    content: counters(item, ".") ". "; 
    counter-increment: item;
  }

  [data-review-editor-styling="1"] ol li p {
    display: inline-block;
  }

  [data-review-editor-styling="1"] blockquote {
    --glb-review-editor-quote-icon-size: 1.25rem;
    --glb-review-editor-quote-icon: rgb(var(--color-gray-400) / var(--tw-bg-opacity));
    --glb-review-editor-quote-text: rgb(var(--color-gray-500) / var(--tw-bg-opacity));
    --glb-review-editor-quote-bg: rgb(var(--color-gray-200) / var(--tw-bg-opacity));
    --glb-review-editor-border-w: 0.35rem;
    --glb-review-editor-border: rgb(var(--color-primary-300) / var(--tw-bg-opacity));
    --glb-review-editor-border-dark: rgb(var(--color-primary-600) / var(--tw-bg-opacity));
    --glb-review-editor-text: rgb(var(--color-gray-400) / var(--tw-bg-opacity));

    display: block;
    min-height: calc(2rem + var(--glb-review-editor-quote-icon-size));
    
    padding: 0.25rem;
    border-radius: 0.5rem;
    background-color: var(--glb-review-editor-quote-bg);
    border-left: var(--glb-review-editor-border-w) solid var(--glb-review-editor-border);
  }

  [data-review-editor-styling="1"] blockquote p {
    padding-left: 0.25rem;
    display: block;
  }

  [data-review-editor-styling="1"] blockquote, [data-review-editor-styling="1"]  blockquote::before {
    color: var(--glb-review-editor-quote-text);
  }
    
  [data-review-editor-styling="1"] blockquote::before {
    display: block;
  }

  [data-review-editor-styling="1"] blockquote::before {
    display: block;
    float: right;

    width: var(--glb-review-editor-quote-icon-size);
    height: var(--glb-review-editor-quote-icon-size);
    margin-right: 0.5rem;
    margin-left: 1rem;
    margin-bottom: 0;

    -webkit-mask-image: url('~/public/img/icon-quote.svg');
    mask-image: url('~/public/img/icon-quote.svg'); 
    
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center center;
    mask-position: center center;

    background-color: var(--glb-review-editor-quote-icon);
    content: '';
  }

  :root[data-theme="dark"] [data-review-editor-styling="1"] blockquote {
    border-left: var(--glb-review-editor-border-w) solid var(--glb-review-editor-border-dark);
  }
    
</style>
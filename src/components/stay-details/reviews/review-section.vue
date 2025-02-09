<script setup lang="ts">
import { type EntityId, type ReviewSummary, getI18nResName2, getI18nResName3, type I18nResName, DefaultStayReviewScore, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout, StayReviewEditorHtmlAnchor, StayReviewSectionHtmlAnchor } from './../../../helpers/constants';
import type { IStayReviewItem } from './../../../stores/stay-reviews-store';
import type ReviewEditor from './review-editor.client.vue';
import ReviewList from './review-list.vue';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

const { t } = useI18n();

interface IProps {
  ctrlKey: string,
  stayId: EntityId,
  preloadedSummaryInfo?: ReviewSummary
}

const { ctrlKey, preloadedSummaryInfo, stayId } = defineProps<IProps>();

const { status } = useAuth();
const { enabled, requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger();

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(stayId);

const promoTooltipShown = ref(false);
const reviewListComponent = useTemplateRef('review-list');
const editor = useTemplateRef('editor');

const reviewScore = ref<number | undefined>();
const scoreClassResName = ref<I18nResName | undefined>();
const reviewsCountText = ref<string>('');
let initialUserReviewReset = false;
// for computing average
let cumulativeScore: number | undefined;
let reviewsCount: number | undefined;

const $emit = defineEmits<{(event: 'reviewSummaryChanged', value: ReviewSummary): void}>();

function refreshReviewSummaryValues(refreshFromStore: boolean = true) {
  logger.debug(`(StayReviewsSection) refreshing review summary values: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, refreshFromStore=${refreshFromStore}`);
  if(enabled) {
    cumulativeScore = DefaultStayReviewScore;
    reviewsCount = 0;
  } else if(refreshFromStore) {
    if(reviewStore.items === undefined || reviewStore.status !== 'success') {
      cumulativeScore = undefined;
      reviewsCount = preloadedSummaryInfo?.numReviews;
    } else {
      cumulativeScore = reviewStore.items.length > 0 ? reviewStore.items.map(r => r.score).reduce((sum, v) => sum + v, 0) : DefaultStayReviewScore;
      reviewsCount = reviewStore.items.length;
    }
  }
  reviewScore.value = cumulativeScore !== undefined  ? (reviewsCount! > 0 ? cumulativeScore / reviewsCount! : DefaultStayReviewScore) : undefined; 
  reviewsCountText.value = reviewsCount !== undefined ? `${reviewsCount} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), reviewsCount)}` : '';
  scoreClassResName.value = reviewScore.value !== undefined ? getScoreClassResName(reviewScore.value) : undefined;
  logger.debug(`(StayReviewsSection) review summary values refreshed: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, refreshFromStore=${refreshFromStore}`);
}

function adjustReviewSummaryValues(currentReviewScore: number | undefined, newReviewScore: number | undefined) {
  logger.debug(`(StayReviewsSection) adjusting review summary values: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
  if(cumulativeScore === undefined || reviewsCount === undefined) {
    logger.warn(`(StayReviewsSection) cannot adjust uninitialized review summary values: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, cumulativeScore=${cumulativeScore}, reviewsCount=${reviewsCount},  currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
    return;
  }

  if(currentReviewScore !== undefined && reviewsCount === 0) {
    logger.warn(`(StayReviewsSection) failed to adjust empty review summary values: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, cumulativeScore=${cumulativeScore}, reviewsCount=${reviewsCount},  currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
    return;
  }

  if(currentReviewScore !== undefined) {
    reviewsCount -= 1;
    cumulativeScore -= currentReviewScore;
  }

  if(newReviewScore !== undefined) {
    reviewsCount += 1;
    cumulativeScore += newReviewScore;
  }
  
  if(currentReviewScore !== undefined || newReviewScore !== undefined) {
    refreshReviewSummaryValues(false);
    $emit('reviewSummaryChanged', { numReviews: reviewsCount, score: reviewsCount > 0 ? (cumulativeScore / reviewsCount) : DefaultStayReviewScore });
  }
  logger.debug(`(StayReviewsSection) review summary values adjusted: ctrlKey=${ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
}

function onUserReviewDeleted (deletedReview: IStayReviewItem) {
  logger.verbose(`(StayReviewsSection) user review deleted handler: ctrlKey=${ctrlKey}`);
  resetUserReviewText();
  adjustReviewSummaryValues(deletedReview.score, undefined);
}

function scrollToReviewEditor () {
  const sectionElement = document.getElementById(StayReviewEditorHtmlAnchor)!;
  sectionElement.scrollIntoView({
    block: 'center',
    behavior: 'smooth'
  });
}

function scrollToSectionHeading () {
  const sectionElement = document.getElementById(StayReviewSectionHtmlAnchor)!;
  sectionElement.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  });
}

function onUserEditBtnClick() {
  logger.debug(`(StayReviewsSection) user edit btn click handler: ctrlKey=${ctrlKey}`);
  resetUserReviewText();
  scrollToReviewEditor();
}

function resetUserReviewText () {
  logger.verbose(`(StayReviewsSection) resetting user review text: ctrlKey=${ctrlKey}`);
  const userReview = reviewStore.getUserReview()?.text.en ?? '';
  editor.value?.setEditedContent(userReview);
}

async function onSubmitReview (reviewHtml: string, score: number): Promise<void> {
  logger.debug(`(StayReviewsSection) send review handler, ctrlKey=${ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);

  if(!await requestUserAction()) {
    logger.verbose(`(StayReviewsSection) send review handler hasn't been run - not allowed in preview mode, ctrlKey=${ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);
    return;
  }

  if(reviewStore.status === 'pending') {
    logger.verbose(`(StayReviewsSection) cannot submit review while store is in pending state, ctrlKey=${ctrlKey}, reviewHtml=${reviewHtml}`);
    return;
  }

  const prevUserReviewScore: number | undefined =  (await reviewStore.getUserReview())?.score;
  try {
    adjustReviewSummaryValues(prevUserReviewScore, score);
    await reviewStore.createOrUpdateReview(reviewHtml, score);
    reviewListComponent.value?.rewindToTop();  
    scrollToSectionHeading();
  } catch(err: any) {
    logger.warn(`(StayReviewsSection) failed to submit review, ctrlKey=${ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`, err);
    adjustReviewSummaryValues(score, prevUserReviewScore);
  }

  logger.debug(`(StayReviewsSection) send review handler completed, ctrlKey=${ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

refreshReviewSummaryValues();
watch([() => reviewStore.items, () => reviewStore.status], () => {
  if(cumulativeScore === undefined) {
    refreshReviewSummaryValues();
  }
  if(reviewStore.status === 'success' && !initialUserReviewReset) {
    initialUserReviewReset = true;
    resetUserReviewText();
  }
});

</script>

<template>
  <ClientOnly>
    <section :id="StayReviewSectionHtmlAnchor">
      <div class="flex flex-row flex-wrap items-center justify-between gap-2">
        <h2 class="flex-initial block w-fit max-w-[90vw] text-3xl font-semibold text-gray-600 dark:text-gray-300 break-words">
          {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'title')) }}
        </h2>
        <UButton v-if="status === 'authenticated'" size="lg" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :aria-label="t(getI18nResName2('ariaLabels', 'btnGiveReview'))" @click="scrollToReviewEditor">
          {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'giveReviewBtn')) }}
        </UButton>
        <UPopover v-else v-model:open="promoTooltipShown" :popper="{ placement: 'bottom' }" class="flex-grow-0 flex-shrink basis-auto">
          <UButton size="lg" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :aria-label="t(getI18nResName2('ariaLabels', 'btnGiveReview'))" @click="scheduleTooltipAutoHide">
            {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'giveReviewBtn')) }}
          </UButton>
          <template #panel="{ close }">
            <span class="p-2 block" @click="close">{{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'mustBeLoggedInToReview')) }}</span>
          </template>
        </UPopover>  
      </div>
      <ClientOnly>
        <div class="w-full h-auto flex flex-row flex-wrap items-center text-gray-600 dark:text-gray-300 gap-4 mt-4">
          <div v-if="reviewScore !== undefined" class="text-5xl font-bold">
            {{ reviewScore.toFixed(1) }}
          </div>
          <USkeleton v-else class="w-12 h-12" />
          <div>
            <div v-if="scoreClassResName" class="w-fit h-auto text-xl font-semibold whitespace-nowrap">
              {{ $t(scoreClassResName) }}
            </div>
            <USkeleton v-else class="w-1/2 h-5" />
            <div v-if="scoreClassResName" class="text-sm w-fit h-auto whitespace-normal">
              {{ reviewsCountText }}
            </div>
            <USkeleton v-else class="w-full h-3" />
          </div>
        </div>
        <div class="w-full h-auto mt-3 sm:mt-6">
          <ReviewList ref="review-list" :ctrl-key="`${ctrlKey}-ReviewList`" :stay-id="stayId" @edit-btn-click="onUserEditBtnClick" @user-review-deleted="onUserReviewDeleted"/>
        </div>
        <ReviewEditor
          v-if="status === 'authenticated'"
          :id="StayReviewEditorHtmlAnchor"
          ref="editor"
          :ctrl-key="`${ctrlKey}-ReviewEditor`"
          :stay-id="stayId"
          class="pt-2 w-full h-auto"
          @submit-review="onSubmitReview"
          @cancel-edit="resetUserReviewText"
        />
      </ClientOnly>
    </section>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="`${ctrlKey}-ClientFallback`" class="my-8"/>
    </template>
  </ClientOnly>
</template>

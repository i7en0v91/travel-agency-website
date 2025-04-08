<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type EntityId, type ReviewSummary, getI18nResName2, getI18nResName3, type I18nResName, DefaultStayReviewScore, getScoreClassResName } from '@golobe-demo/shared';
import { LOADING_STATE, TooltipHideTimeout, StayReviewEditorHtmlAnchor, StayReviewSectionHtmlAnchor } from './../../../helpers/constants';
import { useStayReviewsStore, type IStayReviewItem } from './../../../stores/stay-reviews-store';
import type ReviewEditor from './review-editor.client.vue';
import ReviewList from './review-list.vue';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

const { t } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  stayId: EntityId,
  preloadedSummaryInfo?: ReviewSummary
}

const { ctrlKey, preloadedSummaryInfo, stayId } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewSection' });
const { enabled, requestUserAction } = usePreviewState();
const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const stayReviewsStore = useStayReviewsStore();
stayReviewsStore.trackStayReviews(stayId);
const stayReviews = computed(() => stayReviewsStore.reviews.get(stayId));

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
  logger.debug('refreshing review summary values', { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, refreshFromStore });
  if(enabled) {
    cumulativeScore = DefaultStayReviewScore;
    reviewsCount = 0;
  } else if(refreshFromStore) {
    if(stayReviews.value?.items === undefined || stayReviews.value?.items === LOADING_STATE || stayReviews.value?.status !== 'success') {
      cumulativeScore = undefined;
      reviewsCount = preloadedSummaryInfo?.numReviews;
    } else {
      cumulativeScore = stayReviews.value.items.length > 0 ? stayReviews.value.items.map(r => r.score).reduce((sum, v) => sum + v, 0) : DefaultStayReviewScore;
      reviewsCount = stayReviews.value.items.length;
    }
  }
  reviewScore.value = cumulativeScore !== undefined  ? (reviewsCount! > 0 ? cumulativeScore / reviewsCount! : DefaultStayReviewScore) : undefined; 
  reviewsCountText.value = reviewsCount !== undefined ? `${reviewsCount} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), reviewsCount)}` : '';
  scoreClassResName.value = reviewScore.value !== undefined ? getScoreClassResName(reviewScore.value) : undefined;
  logger.debug('review summary values refreshed', { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, refreshFromStore });
}

function adjustReviewSummaryValues(currentReviewScore: number | undefined, newReviewScore: number | undefined) {
  logger.debug('adjusting review summary values', { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
  if(cumulativeScore === undefined || reviewsCount === undefined) {
    logger.warn('cannot adjust uninitialized review summary values', undefined, { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, cumulativeScore, reviewsCount, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
    return;
  }

  if(currentReviewScore !== undefined && reviewsCount === 0) {
    logger.warn('failed to adjust empty review summary values', undefined, { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, cumulativeScore, reviewsCount, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
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
  logger.debug('review summary values adjusted', { ctrlKey, items: stayReviews.value?.items, status: stayReviews.value?.status, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
}

function onUserReviewDeleted (deletedReview: IStayReviewItem) {
  logger.verbose('user review deleted handler', ctrlKey);
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
  logger.debug('user edit btn click handler', ctrlKey);
  resetUserReviewText();
  scrollToReviewEditor();
}

function resetUserReviewText () {
  logger.verbose('resetting user review text', ctrlKey);
  const userReview = (stayReviews.value?.items && stayReviews.value.items !== LOADING_STATE) ? 
    (stayReviews.value.items.find(i => i.user.id === userAccountStore.userId)?.text.en ?? '') : '';
  editor.value?.setEditedContent(userReview);
}

async function onSubmitReview (reviewHtml: string, score: number): Promise<void> {
  logger.debug('send review handler', { ctrlKey, reviewHtml, score });

  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('send review handler hasn', { ctrlKey, reviewHtml, score });
    return;
  }

  if(stayReviews.value?.status === 'pending') {
    logger.verbose('cannot submit review while store is in pending state', { ctrlKey, reviewHtml });
    return;
  }

  const prevUserReviewScore: number | undefined = 
    (stayReviews.value?.items && stayReviews.value.items !== LOADING_STATE) ? 
      (stayReviews.value.items.find(i => i.user.id === userAccountStore.userId)?.score) : 
      undefined;
  try {
    adjustReviewSummaryValues(prevUserReviewScore, score);
    await stayReviewsStore.createOrUpdateReview(stayId, reviewHtml, score);
    reviewListComponent.value?.rewindToTop();  
    scrollToSectionHeading();
  } catch(err: any) {
    logger.warn('failed to submit review', err, { ctrlKey, reviewHtml, score });
    adjustReviewSummaryValues(score, prevUserReviewScore);
  }

  logger.debug('send review handler completed', { ctrlKey, reviewHtml, score });
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { promoTooltipShown.value = false; }, TooltipHideTimeout);
}

refreshReviewSummaryValues();
watch([() => stayReviews.value?.items, () => stayReviews.value?.status], () => {
  if(cumulativeScore === undefined) {
    refreshReviewSummaryValues();
  }
  if(stayReviews.value?.status === 'success' && !initialUserReviewReset) {
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
        <ClientOnly>
          <UButton v-if="userAccountStore.isAuthenticated" size="lg" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" :aria-label="t(getI18nResName2('ariaLabels', 'btnGiveReview'))" @click="scrollToReviewEditor">
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
          <template #fallback />
        </ClientOnly>
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
          <ReviewList ref="review-list" :ctrl-key="[...ctrlKey, 'ResultItemsList']" :stay-id="stayId" @edit-btn-click="onUserEditBtnClick" @user-review-deleted="onUserReviewDeleted"/>
        </div>
        <ReviewEditor
          v-if="userAccountStore.isAuthenticated"
          :id="StayReviewEditorHtmlAnchor"
          ref="editor"
          :ctrl-key="[...ctrlKey, 'ReviewEditor']"
          :stay-id="stayId"
          class="pt-2 w-full h-auto"
          @submit-review="onSubmitReview"
          @cancel-edit="resetUserReviewText"
        />
      </ClientOnly>
    </section>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" class="my-8"/>
    </template>
  </ClientOnly>
</template>

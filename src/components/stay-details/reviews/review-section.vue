<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { type EntityId, type ReviewSummary, getI18nResName2, getI18nResName3, type I18nResName, DefaultStayReviewScore, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../../helpers/constants';
import type { IStayReviewItem } from './../../../stores/stay-reviews-store';
import ReviewEditor from './review-editor.client.vue';
import ReviewList from './review-list.vue';
import CollapsableSection from './../../collapsable-section.vue';
import ComponentWaitingIndicator from './../../../components/component-waiting-indicator.vue';
import type { Tooltip } from 'floating-vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

const { t } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  stayId: EntityId,
  preloadedSummaryInfo?: ReviewSummary
}

const { ctrlKey, preloadedSummaryInfo, stayId } = defineProps<IProps>();

const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const { enabled, requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewSection' });

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(stayId);

const editorHidden = ref(true);

const tooltip = useTemplateRef<InstanceType<typeof Tooltip>>('tooltip');
const reviewList = useTemplateRef('review-list');
const editorSection = useTemplateRef('editor-section');
const editor = useTemplateRef('editor');

const reviewScore = ref<number | undefined>();
const scoreClassResName = ref<I18nResName | undefined>();
const reviewsCountText = ref<string>('');
// for computing average
let cumulativeScore: number | undefined;
let reviewsCount: number | undefined;

const $emit = defineEmits<{(event: 'reviewSummaryChanged', value: ReviewSummary): void}>();

function refreshReviewSummaryValues(refreshFromStore: boolean = true) {
  logger.debug('refreshing review summary values', { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, refreshFromStore });
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
  logger.debug('review summary values refreshed', { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, refreshFromStore });
}

function adjustReviewSummaryValues(currentReviewScore: number | undefined, newReviewScore: number | undefined) {
  logger.debug('adjusting review summary values', { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
  if(cumulativeScore === undefined || reviewsCount === undefined) {
    logger.warn('cannot adjust uninitialized review summary values', undefined, { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, cumulativeScore, reviewsCount, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
    return;
  }

  if(currentReviewScore !== undefined && reviewsCount === 0) {
    logger.warn('failed to adjust empty review summary values', undefined, { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, cumulativeScore, reviewsCount, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
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
  logger.debug('review summary values adjusted', { ctrlKey, numItems: reviewStore.items?.length, status: reviewStore.status, currentReviewScore: currentReviewScore ?? '', newReviewScore: newReviewScore ?? '' });
}

function onUserReviewDeleted (deletedReview: IStayReviewItem) {
  logger.verbose('user review deleted handler', ctrlKey);
  adjustReviewSummaryValues(deletedReview.score, undefined);
}

function onAddReviewBtnClick () {
  logger.verbose('add btn click handler', ctrlKey);
  const userReview = reviewStore.getUserReview()?.text.en ?? '';
  editor.value?.setEditedContent(userReview);
  editorSection.value?.expand();
}

async function onSubmitReview (reviewHtml: string, score: number): Promise<void> {
  logger.debug('send review handler', { ctrlKey, reviewHtml, score });

  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('send review handler hasn', { ctrlKey, reviewHtml, score });
    return;
  }

  if(reviewStore.status === 'pending') {
    logger.verbose('cannot submit review while store is in pending state', { ctrlKey, reviewHtml });
    return;
  }

  const prevUserReviewScore: number | undefined =  (await reviewStore.getUserReview())?.score;
  try {
    adjustReviewSummaryValues(prevUserReviewScore, score);
    await reviewStore.createOrUpdateReview(reviewHtml, score);
    editorSection.value?.collapse();
    reviewList.value?.rewindToTop();  
  } catch(err: any) {
    logger.warn('failed to submit review', err, { ctrlKey, reviewHtml, score });
    adjustReviewSummaryValues(score, prevUserReviewScore);
  }

  logger.debug('send review handler completed', { ctrlKey, reviewHtml, score });
}

function onCancelEdit () {
  logger.debug('cancel review edit handler', ctrlKey);
  editorSection.value?.collapse();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

refreshReviewSummaryValues();
watch([() => reviewStore.items, () => reviewStore.status], () => {
  if(cumulativeScore === undefined) {
    refreshReviewSummaryValues();
  }
});

const tooltipId = useId();

</script>

<template>
  <ClientOnly>
    <section class="stay-reviews">
      <div class="stay-reviews-heading">
        <h2 class="stay-reviews-title mt-xs-2">
          {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'title')) }}
        </h2>
        <ClientOnly>
          <SimpleButton
            v-if="userAccountStore.isAuthenticated"
            class="stay-reviews-addBtn mt-xs-2"
            :ctrl-key="[...ctrlKey, 'Btn', 'Add']"
            :label-res-name="getI18nResName3('stayDetailsPage', 'reviews', 'giveReviewBtn')"
            :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGiveReview')"
            kind="default"
            @click="onAddReviewBtnClick"
          />
          <VTooltip
            v-else
            ref="tooltip"
            :aria-id="tooltipId"
            :distance="6"
            :triggers="['click']"
            placement="bottom-end"
            :flip="false"
            theme="default-tooltip"
            :auto-hide="true"
            no-auto-focus
            @apply-show="scheduleTooltipAutoHide"
          >
            <SimpleButton
              class="stay-reviews-addBtn mt-xs-2"
              :ctrl-key="[...ctrlKey, 'Btn', 'Add']"
              :label-res-name="getI18nResName3('stayDetailsPage', 'reviews', 'giveReviewBtn')"
              :aria-label-res-name="getI18nResName2('ariaLabels', 'btnGiveReview')"
              kind="default"
            />
            <template #popper>
              <div>
                {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'mustBeLoggedInToReview')) }}
              </div>
            </template>
          </VTooltip>
          <template #fallback />
        </ClientOnly>
      </div>
      <ClientOnly>
        <div class="stay-reviews-summary mt-xs-3">
          <div v-if="reviewScore" class="stay-reviews-score">
            {{ reviewScore.toFixed(1) }}
          </div>
          <div v-else class="stay-reviews-score data-loading-stub text-data-loading" />
          <div class="stay-reviews-rating">
            <div v-if="scoreClassResName" class="stay-reviews-score-class">
              {{ $t(scoreClassResName) }}
            </div>
            <div v-else class="stay-reviews-score-class data-loading-stub text-data-loading" />
            <div v-if="scoreClassResName" class="stay-reviews-count">
              {{ reviewsCountText }}
            </div>
            <div v-else class="stay-reviews-count data-loading-stub text-data-loading" />
          </div>
        </div>
        <CollapsableSection
          v-if="userAccountStore.isAuthenticated"
          ref="editor-section"
          v-model:collapsed="editorHidden"
          :ctrl-key="[...ctrlKey, 'CollapsableSection']"
          collapseable
          :show-collapsable-button="false"
        >
          <template #head>
            <div />
          </template>
          <template #content>
            <ReviewEditor
              ref="editor"
              :ctrl-key="[...ctrlKey, 'ReviewEditor']"
              :stay-id="stayId"
              class="stay-reviews-editor pt-xs-2"
              @submit-review="onSubmitReview"
              @cancel-edit="onCancelEdit"
            />
          </template>
        </CollapsableSection>
      </ClientOnly>
      <ReviewList ref="review-list" :ctrl-key="[...ctrlKey, 'ResultItemsList']" :stay-id="stayId" @edit-btn-click="onAddReviewBtnClick" @user-review-deleted="onUserReviewDeleted"/>
    </section>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" class="my-xs-5"/>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { type EntityId, type ReviewSummary, getI18nResName2, getI18nResName3, type I18nResName, DefaultStayReviewScore, getScoreClassResName } from '@golobe-demo/shared';
import { TooltipHideTimeout } from './../../../helpers/constants';
import { type IStayReviewItem } from './../../../stores/stay-reviews-store';
import ReviewEditor from './review-editor.client.vue';
import ReviewList from './review-list.vue';
//import CollapsableSection from './../../collapsable-section.vue';
import ComponentWaitingIndicator from './../../../components/component-waiting-indicator.vue';
import { type ComponentInstance } from 'vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

const { t } = useI18n();

interface IProps {
  ctrlKey: string,
  stayId: EntityId,
  preloadedSummaryInfo?: ReviewSummary
}

const props = defineProps<IProps>();

const { status } = useAuth();
const { enabled, requestUserAction } = usePreviewState();

const logger = getCommonServices().getLogger();

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(props.stayId);

const editorHidden = ref(true);

const tooltip = shallowRef<ComponentInstance<typeof Tooltip>>();
const reviewListComponent = shallowRef<ComponentInstance<typeof ReviewList>>();
//const editorSection = shallowRef<ComponentInstance<typeof CollapsableSection>>();
const editor = shallowRef<ComponentInstance<typeof ReviewEditor>>();

const reviewScore = ref<number | undefined>();
const scoreClassResName = ref<I18nResName | undefined>();
const reviewsCountText = ref<string>('');
// for computing average
let cumulativeScore: number | undefined;
let reviewsCount: number | undefined;

const $emit = defineEmits<{(event: 'reviewSummaryChanged', value: ReviewSummary): void}>();

function refreshReviewSummaryValues(refreshFromStore: boolean = true) {
  logger.debug(`(StayReviews) refreshing review summary values: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, refreshFromStore=${refreshFromStore}`);
  if(enabled) {
    cumulativeScore = DefaultStayReviewScore;
    reviewsCount = 0;
  } else if(refreshFromStore) {
    if(reviewStore.items === undefined || reviewStore.status !== 'success') {
      cumulativeScore = undefined;
      reviewsCount = props.preloadedSummaryInfo?.numReviews;
    } else {
      cumulativeScore = reviewStore.items.length > 0 ? reviewStore.items.map(r => r.score).reduce((sum, v) => sum + v, 0) : DefaultStayReviewScore;
      reviewsCount = reviewStore.items.length;
    }
  }
  reviewScore.value = cumulativeScore !== undefined  ? (reviewsCount! > 0 ? cumulativeScore / reviewsCount! : DefaultStayReviewScore) : undefined; 
  reviewsCountText.value = reviewsCount !== undefined ? `${reviewsCount} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), reviewsCount)}` : '';
  scoreClassResName.value = reviewScore.value !== undefined ? getScoreClassResName(reviewScore.value) : undefined;
  logger.debug(`(StayReviews) review summary values refreshed: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, refreshFromStore=${refreshFromStore}`);
}

function adjustReviewSummaryValues(currentReviewScore: number | undefined, newReviewScore: number | undefined) {
  logger.debug(`(StayReviews) adjusting review summary values: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
  if(cumulativeScore === undefined || reviewsCount === undefined) {
    logger.warn(`(StayReviews) cannot adjust uninitialized review summary values: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, cumulativeScore=${cumulativeScore}, reviewsCount=${reviewsCount},  currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
    return;
  }

  if(currentReviewScore !== undefined && reviewsCount === 0) {
    logger.warn(`(StayReviews) failed to adjust empty review summary values: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, cumulativeScore=${cumulativeScore}, reviewsCount=${reviewsCount},  currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
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
  logger.debug(`(StayReviews) review summary values adjusted: ctrlKey=${props.ctrlKey}, numItems=${reviewStore.items?.length}, status=${reviewStore.status}, currentReviewScore=${currentReviewScore ?? ''}, newReviewScore=${newReviewScore ?? ''}`);
}

function onUserReviewDeleted (deletedReview: IStayReviewItem) {
  logger.verbose(`(StayReviews) user review deleted handler: ctrlKey=${props.ctrlKey}`);
  adjustReviewSummaryValues(deletedReview.score, undefined);
}

function onAddReviewBtnClick () {
  logger.verbose(`(StayReviews) add btn click handler: ctrlKey=${props.ctrlKey}`);
  const userReview = reviewStore.getUserReview()?.text.en ?? '';
  editor.value?.setEditedContent(userReview);
  //editorSection.value?.expand();
}

async function onSubmitReview (reviewHtml: string, score: number): Promise<void> {
  logger.debug(`(StayReviews) send review handler, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);

  if(!await requestUserAction()) {
    logger.verbose(`(StayReviews) send review handler hasn't been run - not allowed in preview mode, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);
    return;
  }

  if(reviewStore.status === 'pending') {
    logger.verbose(`(StayReviews) cannot submit review while store is in pending state, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}`);
    return;
  }

  const prevUserReviewScore: number | undefined =  (await reviewStore.getUserReview())?.score;
  try {
    adjustReviewSummaryValues(prevUserReviewScore, score);
    await reviewStore.createOrUpdateReview(reviewHtml, score);
    //editorSection.value?.collapse();
    reviewListComponent.value?.rewindToTop();  
  } catch(err: any) {
    logger.warn(`(StayReviews) failed to submit review, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`, err);
    adjustReviewSummaryValues(score, prevUserReviewScore);
  }

  logger.debug(`(StayReviews) send review handler completed, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);
}

function onCancelEdit () {
  logger.debug(`(StayReviews) cancel review edit handler, ctrlKey=${props.ctrlKey}`);
  //editorSection.value?.collapse();
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
        <SimpleButton
          v-if="status === 'authenticated'"
          class="stay-reviews-addBtn mt-xs-2"
          :ctrl-key="`${ctrlKey}-AddReviewBtn`"
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
            :ctrl-key="`${ctrlKey}-AddReviewBtn`"
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
        <!--
        <CollapsableSection
          v-if="status === 'authenticated'"
          ref="editorSection"
          v-model:collapsed="editorHidden"
          :ctrl-key="`${$props.ctrlKey}-ReviewEditorSection`"
          :collapse-enabled="true"
          :show-collapsable-button="false"
          :persistent="false"
        >
          <template #head>
            <div />
          </template>
          <template #content>
            <ReviewEditor
              ref="editor"
              :ctrl-key="`${ctrlKey}-ReviewEditor`"
              :stay-id="stayId"
              class="stay-reviews-editor pt-xs-2"
              @submit-review="onSubmitReview"
              @cancel-edit="onCancelEdit"
            />
          </template>
        </CollapsableSection>
        -->
        
      </ClientOnly>
      <ReviewList ref="reviewListComponent" :ctrl-key="`${ctrlKey}-ReviewList`" :stay-id="stayId" @edit-btn-click="onAddReviewBtnClick" @user-review-deleted="onUserReviewDeleted"/>
    </section>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="`${ctrlKey}-ClientFallback`" class="my-xs-5"/>
    </template>
  </ClientOnly>
</template>

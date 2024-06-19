<script setup lang="ts">

import type { Tooltip } from 'floating-vue';
import { DefaultStayReviewScore, TooltipHideTimeout } from './../../../shared/constants';
import { getScoreClassResName } from './../../../shared/common';
import { getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import type { EntityId } from './../../../shared/interfaces';
import ReviewEditor from './review-editor.client.vue';
import ReviewList from './review-list.vue';
import CollapsableSection from './../../collapsable-section.vue';
import ComponentWaiterIndicator from './../../../components/component-waiting-indicator.vue';

const { t } = useI18n();

interface IProps {
  ctrlKey: string,
  stayId: EntityId,
  preloadedSummaryInfo?: {
    reviewScore: number,
    numReviews: number
  }
}

const props = defineProps<IProps>();

const { status } = useAuth();

const logger = CommonServicesLocator.getLogger();

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(props.stayId);

const editorHidden = ref(true);

const tooltip = shallowRef<InstanceType<typeof Tooltip>>();
const reviewListComponent = shallowRef<InstanceType<typeof ReviewList>>();
const editorSection = shallowRef<InstanceType<typeof CollapsableSection>>();
const editor = shallowRef<InstanceType<typeof ReviewEditor>>();

const reviewScore = computed(() => ((reviewStore.items !== undefined && reviewStore.status === 'success') ? (reviewStore.items.length > 0 ? reviewStore.items.map(r => r.score).reduce((sum, v) => sum + v, 0) / reviewStore.items.length : DefaultStayReviewScore) : undefined));
const scoreClassResName = computed(() => reviewScore.value ? getScoreClassResName(reviewScore.value) : undefined);
const reviewsCount = computed(() => (reviewStore.items?.length !== undefined && reviewStore.status === 'success') ? reviewStore.items.length : props.preloadedSummaryInfo!.numReviews);
const reviewsCountText = computed(() => reviewsCount.value !== undefined ? `${reviewsCount.value} ${t(getI18nResName3('stayDetailsPage', 'reviews', 'count'), reviewsCount.value)}` : '');

function onAddReviewBtnClick () {
  logger.verbose(`(StayReviews) add btn click handler: ctrlKey=${props.ctrlKey}`);
  const userReview = reviewStore.getUserReview()?.text.en ?? '';
  editor.value?.setEditedContent(userReview);
  editorSection.value?.expand();
}

async function onSubmitReview (reviewHtml: string, score: number): Promise<void> {
  logger.verbose(`(StayReviews) send review handler, ctrlKey=${props.ctrlKey}, reviewHtml=${reviewHtml}, score=${score}`);
  await reviewStore.createOrUpdateReview(reviewHtml, score);
  editorSection.value?.collapse();
  reviewListComponent.value?.rewindToTop();
}

function onCancelEdit () {
  logger.debug(`(StayReviews) cancel review edit handler, ctrlKey=${props.ctrlKey}`);
  editorSection.value?.collapse();
}

function scheduleTooltipAutoHide () {
  setTimeout(() => { tooltip.value?.hide(); }, TooltipHideTimeout);
}

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
      </ClientOnly>
      <ReviewList ref="reviewListComponent" :ctrl-key="`${ctrlKey}-ReviewList`" :stay-id="stayId" @edit-btn-click="onAddReviewBtnClick" />
    </section>
    <template #fallback>
      <ComponentWaiterIndicator :ctrl-key="`${ctrlKey}-ClientFallback`" class="my-xs-5"/>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { type EntityId, ImageCategory, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import { isPrefersReducedMotionEnabled } from './../../../helpers/dom';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { Grid, Navigation } from 'swiper/modules';
import { type Swiper } from 'swiper';
import ComponentWaitingIndicator from './../../../components/component-waiting-indicator.vue';
import { type IStayReviewItem } from './../../../stores/stay-reviews-store';
import { useConfirmBox } from './../../../composables/confirm-box';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

const { locale } = useI18n();

interface IProps {
  ctrlKey: string,
  stayId: EntityId
}

const ReviewsPerSlidePage = 5;

const { status } = useAuth();
const { requestUserAction } = usePreviewState();

const props = defineProps<IProps>();
const logger = getCommonServices().getLogger();

const swiper = shallowRef<InstanceType<typeof Swiper>>();
const isSwiperReady = ref(false);
const showNoReviewStub = computed(() => reviewStore.status === 'success' && reviewStore.items !== undefined && reviewStore.items.length === 0);
const isNavButtonsVisible = computed(() => reviewStore.status === 'error' && reviewStore.items !== undefined && isSwiperReady.value && !showNoReviewStub.value);
const pagingState = ref<{ of: number, total: number } | undefined>();
const slideAnimationEnabled = import.meta.client && !isPrefersReducedMotionEnabled();

function refreshPagingState () {
  logger.debug(`(ReviewList) refreshing paging state, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  const swiperInstance = swiper.value;
  if (!isSwiperReady.value || !swiperInstance) {
    logger.debug(`(ReviewList) refreshing paging state - swiper not initialized, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
    return;
  }

  const of = swiperInstance.realIndex + 1;
  const total = Math.ceil(swiperInstance.slides.length / ReviewsPerSlidePage);

  logger.debug(`(ReviewList) refreshing paging state completed, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}, of=${of}, total=${total}`);
  pagingState.value = { of, total };
}

function rewindToTop () {
  logger.debug(`(ReviewList) rewind to top, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  if (isSwiperReady.value && swiper.value) {
    swiper.value.slideTo(0);
    refreshPagingState();
  }
}

const $emit = defineEmits<{
  (event: 'editBtnClick'): void,
  (event: 'userReviewDeleted', value: IStayReviewItem): void,
}>();

defineExpose({
  rewindToTop
});

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(props.stayId);
const userAccountStore = useUserAccountStore();
const userAccount = ref<IUserAccount>();

const confirmBox = useConfirmBox();

const isError = ref(reviewStore.status === 'error');

watch(() => reviewStore.status, () => {
  isError.value = reviewStore.status === 'error';
  nextTick(refreshPagingState);
});

async function refreshUserAccount (): Promise<void> {
  if (status.value === 'authenticated') {
    try {
      userAccount.value = await userAccountStore.getUserAccount();
    } catch (err: any) {
      logger.warn(`(ReviewList) failed to initialize user account info, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`, err);
      userAccount.value = undefined;
    }
  } else {
    userAccount.value = undefined;
  }
}

watch(status, async () => {
  await refreshUserAccount();
});
await refreshUserAccount();

function isTestUserReview (review: IStayReviewItem): boolean {
  return review.text.en !== review.text.ru;
}

function onEditUserReviewBtnClick () {
  logger.verbose(`(ReviewList) edit review btn click handler, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  $emit('editBtnClick');
}

async function onDeleteUserReviewBtnClick (): Promise<void> {
  logger.verbose(`(ReviewList) delete review btn click handler, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);

  if(!await requestUserAction()) {
    logger.verbose(`(ReviewList) delete review btn click handler hasn't been run - not allowed in preview mode, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
    return;
  }

  const result = await confirmBox.confirm(`${props.ctrlKey}-UserReview-DeleteConfirm`, ['yes', 'no'], getI18nResName3('stayDetailsPage', 'reviews', 'confirmDelete'));
  if (result === 'yes') {
    const deletingReview = await reviewStore.getUserReview()!;
    await reviewStore.deleteReview();
    nextTick(refreshPagingState);
    $emit('userReviewDeleted', deletingReview);
  }
}

function onSwiperInit () {
  logger.debug(`(ReviewList) swiper initialized, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  swiper.value = (document.querySelector('.stay-reviews-swiper') as any).swiper as Swiper;
  isSwiperReady.value = true;
  nextTick(refreshPagingState);
}

function onSwiperSlideChanged () {
  logger.debug(`(ReviewList) swiper slide changed, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  refreshPagingState();
}

function onNavNextBtnClick () {
  logger.debug(`(ReviewList) nav next btn clicked, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  if (isSwiperReady.value && swiper.value) {
    swiper.value.slideNext();
  }
}

function onNavPrevBtnClick () {
  logger.debug(`(ReviewList) nav next btn clicked, ctrlKey=${props.ctrlKey}, stayId=${props.stayId}`);
  if (isSwiperReady.value && swiper.value) {
    swiper.value.slidePrev();
  }
}

</script>

<template>
  <div class="stay-reviews-list-div no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="isError">
      <Swiper
        v-if="reviewStore.status !== 'error' && reviewStore.items !== undefined"
        :class="`stay-reviews-list stay-reviews-swiper pb-xs-4 ${isSwiperReady ? 'initialized' : ''} ${showNoReviewStub ? 'hidden' : ''}`"
        :modules="[Navigation, Grid]"
        :slides-per-view="1"
        :allow-touch-move="true"
        :simulate-touch="false"
        :rewind="true"
        :effect="slideAnimationEnabled ? 'slide' : 'fade'"
        :speed="slideAnimationEnabled ? 300 : 0"
        :grid="{ rows: Math.min(reviewStore.items.length, ReviewsPerSlidePage), fill: 'row' }"
        :navigation="{
          enabled: true,
          nextEl: null,
          prevEl: null,
        }"
        @init="onSwiperInit"
        @slide-change-transition-end="onSwiperSlideChanged"
      >
        <SwiperSlide
          v-for="(review) in reviewStore.items "
          :key="`${ctrlKey}-Review-${review.id}`"
          class="stay-reviews-list-item"
        >
          <hr class="stay-details-section-separator review-item-separator">
          <article class="stay-reviews-card">
            <div class="stay-reviews-card-avatar">
              <StaticImage
                v-if="review.user === 'current' ? !!(userAccount?.avatar) : !!(review.user.avatar)"
                :ctrl-key="`${ctrlKey}-ReviewItem${review.id}-Avatar`"
                :show-stub="false"
                class="stay-reviews-card-avatar"
                img-class="stay-reviews-card-avatar-img"
                :entity-src="review.user === 'current' ? userAccount?.avatar : review.user.avatar"
                :category="ImageCategory.UserAvatar"
                sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
                :alt-res-name="getI18nResName3('stayDetailsPage', 'reviews', 'avatarImgAlt')"
              />
              <div v-else class="stay-reviews-card-avatar stay-reviews-card-avatar-default" />
            </div>
            <div class="stay-reviews-card-content-div">
              <PerfectScrollbar
                :options="{
                  suppressScrollX: false,
                  suppressScrollY: false,
                  wheelPropagation: true
                }"
                :watch-options="false"
                tag="div"
                class="stay-reviews-card-content-scroll"
              >
                <div :class="`stay-reviews-card-content ${isTestUserReview(review) ? 'test-user-review' : ''} pb-xs-2 mr-xs-1`">
                  <h3 class="stay-reviews-card-scoring">
                    <div class="stay-reviews-card-score-class">
                      {{ `${review.score.toFixed(1)} ${$t(getScoreClassResName(review.score))}` }}
                    </div>
                    <span class="stay-reviews-card-scoring-separator" />
                    <div class="stay-reviews-card-username">
                      {{ `${review.user === 'current' ? (userAccount ? `${userAccount.firstName} ${userAccount.lastName}` : '...') : (`${review.user.firstName} ${review.user.lastName}`)}` }}
                    </div>
                  </h3>
                  <p v-if="isTestUserReview(review)" class="stay-reviews-card-text">
                    {{ getLocalizeableValue(review.text, locale as Locale) }}
                  </p>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <p v-else v-html="review.text.en" /> <!-- to prevent attack additional sanitizing is applied on server -->
                </div>
              </PerfectScrollbar>
            </div>
            <div class="stay-reviews-card-buttons-div mr-xs-2">
              <div class="stay-reviews-card-flag" />
              <div v-if="review.user === 'current' || review.user.id === userAccount?.userId" class="stay-reviews-card-control-buttons">
                <SimpleButton
                  class="stay-reviews-card-btn review-btn-delete no-hidden-parent-tabulation-check"
                  :ctrl-key="`${props.ctrlKey}-UserReview-DeleteBtn`"
                  :aria-label-res-name="getI18nResName2('ariaLabels', 'btnDeleteUserReview')"
                  :title-res-name="getI18nResName2('ariaLabels', 'btnDeleteUserReview')"
                  icon="delete"
                  kind="support"
                  @click="onDeleteUserReviewBtnClick"
                />
                <SimpleButton
                  class="stay-reviews-card-btn review-btn-edit no-hidden-parent-tabulation-check"
                  :ctrl-key="`${props.ctrlKey}-UserReview-EditBtn`"
                  :aria-label-res-name="getI18nResName2('ariaLabels', 'btnEditUserReview')"
                  :title-res-name="getI18nResName2('ariaLabels', 'btnEditUserReview')"
                  icon="change"
                  kind="support"
                  @click="onEditUserReviewBtnClick"
                />
              </div>
            </div>
          </article>
        </SwiperSlide>
      </Swiper>
      <hr v-if="!showNoReviewStub" class="stay-details-section-separator review-item-separator">
      <section v-if="isNavButtonsVisible" :class="`reviews-list-nav-buttons ${(pagingState?.total ?? 0) <= 1 ? 'one-page' : ''} mt-xs-2 mt-s-3`">
        <SimpleButton
          kind="support"
          class="reviews-list-nav-btn btn-prev"
          :ctrl-key="`${ctrlKey}-NavPrev`"
          icon="nav-prev"
          @click="onNavPrevBtnClick"
        />
        <div class="reviews-list-nav-paging mx-xs-2 mx-s-3">
          {{ pagingState ? $t(getI18nResName3('stayDetailsPage', 'reviews', 'paging'), pagingState) : '' }}
        </div>
        <SimpleButton
          kind="support"
          class="reviews-list-nav-btn btn-next"
          :ctrl-key="`${ctrlKey}-NavNext`"
          icon="nav-next"
          @click="onNavNextBtnClick"
        />
      </section>
      <div v-if="showNoReviewStub" class="reviews-list-noitems-stub my-xs-3 my-s-5 px-xs-3">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'noReviews')) }}
      </div>
      <ComponentWaitingIndicator v-if="reviewStore.status === 'pending' || !(reviewStore.status !== 'error' && reviewStore.items !== undefined) || !isSwiperReady" :ctrl-key="`${ctrlKey}-ReviewListWaiterFallback`" class="stay-reviews-waiting-indicator my-xs-5" />
    </ErrorHelm>
  </div>
</template>

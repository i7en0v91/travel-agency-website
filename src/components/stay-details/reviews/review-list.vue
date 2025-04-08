<script setup lang="ts">
import { toShortForm, type ControlKey, type ArbitraryControlElementMarker } from './../../../helpers/components';
import { type EntityId, ImageCategory, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices, isPrefersReducedMotionEnabled } from './../../../helpers/dom';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { Grid, Navigation } from 'swiper/modules';
import type { Swiper } from 'swiper';
import ComponentWaitingIndicator from './../../../components/component-waiting-indicator.vue';
import { useStayReviewsStore, type IStayReviewItem } from './../../../stores/stay-reviews-store';
import { useConfirmBox } from './../../../composables/confirm-box';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import { LOADING_STATE } from '../../../helpers/constants';

const { locale } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  stayId: EntityId
}

const ReviewsPerSlidePage = 5;

const userNotificationStore = useUserNotificationStore();
const { requestUserAction } = usePreviewState();
const stayReviewsStore = useStayReviewsStore();
const userAccountStore = useUserAccountStore();
const confirmBox = useConfirmBox();

const isError = computed(() => stayReviewsStore.reviews.get(stayId)?.status === 'error');

const { ctrlKey, stayId } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewList' });

const swiper = shallowRef<InstanceType<typeof Swiper>>();
const isSwiperReady = ref(false);
const stayReviews = computed(() => stayReviewsStore.reviews.get(stayId));
const showNoReviewStub = computed(() => { 
  const reviews = stayReviews.value;
  return reviews?.status === 'success' && reviews.items !== undefined && reviews.items !== LOADING_STATE && reviews.items.length === 0;
});
const isNavButtonsVisible = computed(() => {
  const reviews = stayReviews.value;
  return reviews && reviews.status !== 'error' && reviews.items !== undefined && reviews.items !== LOADING_STATE && isSwiperReady.value && !showNoReviewStub.value;
});
const pagingState = ref<{ of: number, total: number } | undefined>();
const slideAnimationEnabled = import.meta.client && !isPrefersReducedMotionEnabled();

function refreshPagingState () {
  logger.debug('refreshing paging state', { ctrlKey, stayId });
  const swiperInstance = swiper.value;
  if (!isSwiperReady.value || !swiperInstance || !swiperInstance.slides) {
    logger.debug('refreshing paging state - swiper not initialized', { ctrlKey, stayId });
    return;
  }

  const of = swiperInstance.realIndex + 1;
  const total = Math.ceil(swiperInstance.slides.length / ReviewsPerSlidePage);

  logger.debug('refreshing paging state completed', { ctrlKey, stayId, of, total });
  pagingState.value = { of, total };
}

function rewindToTop () {
  logger.debug('rewind to top', { ctrlKey, stayId });
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

function isTestUserReview (review: IStayReviewItem): boolean {
  return review.text.en !== review.text.ru;
}

function onEditUserReviewBtnClick () {
  logger.verbose('edit review btn click handler', { ctrlKey, stayId });
  $emit('editBtnClick');
}

async function onDeleteUserReviewBtnClick (): Promise<void> {
  logger.verbose('delete review btn click handler', { ctrlKey, stayId });

  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('delete review btn click handler hasn', { ctrlKey, stayId });
    return;
  }

  const deletingReview = 
    (stayReviews.value?.items && stayReviews.value.items !== LOADING_STATE) ? 
    stayReviews.value.items.find(i => i.user.id === userAccountStore.userId) :
    undefined;
  if(!deletingReview) {
    logger.warn('no user review found to delete', undefined, { ctrlKey, stayId });
    return;
  }

  const result = await confirmBox.confirm([...ctrlKey, 'UserReview', 'Delete', 'ConfirmBox'], ['yes', 'no'], getI18nResName3('stayDetailsPage', 'reviews', 'confirmDelete'));
  if (result === 'yes') {
    try {
      await stayReviewsStore.deleteReview(stayId);
      setTimeout(refreshPagingState);
      $emit('userReviewDeleted', deletingReview);
    } catch(err: any) {
      logger.warn('failed to delete review', err, { ctrlKey, stayId });
    }
  }
}

function refreshTabIndices () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onSwiperInit () {
  logger.debug('swiper initialized', { ctrlKey, stayId });
  swiper.value = (document.querySelector('.stay-reviews-swiper') as any).swiper as Swiper;
  isSwiperReady.value = true;
  setTimeout(refreshPagingState);
}

function onSwiperSlideChanged () {
  logger.debug('swiper slide changed', { ctrlKey, stayId });
  refreshPagingState();
  refreshTabIndices();
}

function onNavNextBtnClick () {
  logger.debug('nav next btn clicked', { ctrlKey, stayId });
  if (isSwiperReady.value && swiper.value) {
    swiper.value.slideNext();
  }
}

function onNavPrevBtnClick () {
  logger.debug('nav prev btn clicked', { ctrlKey, stayId });
  if (isSwiperReady.value && swiper.value) {
    swiper.value.slidePrev();
  }
}

onMounted(() => {
  watch(() => stayReviewsStore.reviews.get(stayId)?.status, () => {
    setTimeout(refreshPagingState);
  });
});

</script>

<template>
  <div class="stay-reviews-list-div no-hidden-parent-tabulation-check">
    <ErrorHelm :is-error="isError">
      <Swiper
        v-if="stayReviews && stayReviews.status !== 'error' && stayReviews.items && stayReviews.items !== LOADING_STATE"
        :class="`stay-reviews-list stay-reviews-swiper pb-xs-4 ${isSwiperReady ? 'initialized' : ''} ${showNoReviewStub ? 'hidden' : ''}`"
        :modules="[Navigation, Grid]"
        :slides-per-view="1"
        :allow-touch-move="true"
        :simulate-touch="false"
        :rewind="true"
        :effect="slideAnimationEnabled ? 'slide' : 'fade'"
        :speed="slideAnimationEnabled ? 300 : 0"
        :grid="{ rows: Math.min(stayReviews.items.length, ReviewsPerSlidePage), fill: 'row' }"
        :navigation="{
          enabled: true,
          nextEl: null,
          prevEl: null,
        }"
        @init="onSwiperInit"
        @slide-change-transition-end="onSwiperSlideChanged"
      >
        <SwiperSlide
          v-for="(review) in stayReviews.items"
          :key="`${toShortForm(ctrlKey)}-Review-${review.id}`"
          class="stay-reviews-list-item"
        >
          <hr class="stay-details-section-separator review-item-separator">
          <article class="stay-reviews-card">
            <div class="stay-reviews-card-avatar">
              <StaticImage
                v-if="review.user.id === userAccountStore.userId ? !!(userAccountStore.avatar) : !!(review.user.avatar)"
                :ctrl-key="[...ctrlKey, 'ReviewItem', review.id as ArbitraryControlElementMarker, 'Avatar', 'StaticImg']"
                :stub="false"
                class="stay-reviews-card-avatar"
                :ui="{ img: 'stay-reviews-card-avatar-img' }"
                :src="review.user.id === userAccountStore.userId ? ((userAccountStore.avatar && userAccountStore.avatar !== LOADING_STATE) ? userAccountStore.avatar : undefined) : review.user.avatar"
                :category="ImageCategory.UserAvatar"
                sizes="xs:30vw sm:20vw md:20vw lg:10vw xl:10vw"
                :alt="{ resName: getI18nResName3('stayDetailsPage', 'reviews', 'avatarImgAlt') }"
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
                      {{ `${review.user.id === userAccountStore.userId ? ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? `${userAccountStore.name.firstName} ${userAccountStore.name.lastName}` : '...') : (`${review.user.firstName} ${review.user.lastName}`)}` }}
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
              <div v-if="review.user.id === userAccountStore.userId" class="stay-reviews-card-control-buttons">
                <SimpleButton
                  class="stay-reviews-card-btn review-btn-delete no-hidden-parent-tabulation-check"
                  :ctrl-key="[...ctrlKey, 'UserReview', 'Btn', 'Delete']"
                  :aria-label-res-name="getI18nResName2('ariaLabels', 'btnDeleteUserReview')"
                  :title-res-name="getI18nResName2('ariaLabels', 'btnDeleteUserReview')"
                  icon="delete"
                  kind="support"
                  @click="onDeleteUserReviewBtnClick"
                />
                <SimpleButton
                  class="stay-reviews-card-btn review-btn-edit no-hidden-parent-tabulation-check"
                  :ctrl-key="[...ctrlKey, 'UserReview', 'Btn', 'Change']"
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
          :ctrl-key="[...ctrlKey, 'Paging', 'Btn', 'Prev']"
          icon="nav-prev"
          @click="onNavPrevBtnClick"
        />
        <div class="reviews-list-nav-paging mx-xs-2 mx-s-3">
          {{ pagingState ? $t(getI18nResName3('stayDetailsPage', 'reviews', 'paging'), pagingState) : '' }}
        </div>
        <SimpleButton
          kind="support"
          class="reviews-list-nav-btn btn-next"
          :ctrl-key="[...ctrlKey, 'Paging', 'Btn', 'Next']"
          icon="nav-next"
          @click="onNavNextBtnClick"
        />
      </section>
      <div v-if="showNoReviewStub" class="reviews-list-noitems-stub my-xs-3 my-s-5 px-xs-3">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'noReviews')) }}
      </div>
      <ComponentWaitingIndicator 
        v-if="(stayReviews?.status !== 'error' && (stayReviews?.items === undefined || stayReviews?.items === LOADING_STATE)) || !isSwiperReady" 
        :ctrl-key="[...ctrlKey, 'ResultItemsList', 'Waiter']" 
        class="stay-reviews-waiting-indicator my-xs-5" 
      />
    </ErrorHelm>
  </div>
</template>

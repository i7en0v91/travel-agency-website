<script setup lang="ts">
import { toShortForm, type ControlKey, type ArbitraryControlElementMarker } from './../../../helpers/components';
import { type EntityId, ImageCategory, type Locale, getLocalizeableValue, getScoreClassResName, getI18nResName3, getI18nResName2 } from '@golobe-demo/shared';
import { formatImageEntityUrl } from './../../../helpers/dom';
import ConfirmBox from '../../forms/confirm-box.vue';
import { useConfirmDialogResult } from './../../../composables/modal-dialog-result';
import type { IStayReviewItem } from './../../../stores/stay-reviews-store';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import type { UCarousel } from '../../../.nuxt/components';
import type { ComponentInstance } from 'vue';
import type { ConfirmBoxButton } from './../../../types';
import chunk from 'lodash-es/chunk';

const { locale } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  stayId: EntityId
}

const ReviewsPerSlidePage = 5;

const { status } = useAuth();
const userNotificationStore = useUserNotificationStore();
const { requestUserAction } = usePreviewState();

const { ctrlKey, stayId } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ReviewList' });

const carouselRef = useTemplateRef<ComponentInstance<any>>('carousel');
const confirmBoxRef = useTemplateRef('confirm-box');  
const confirmBoxButtons: ConfirmBoxButton[] = ['yes', 'no'];
const isCarouselReady = ref(false);

const showNoReviewStub = computed(() => reviewStore.status === 'success' && reviewStore.items !== undefined && reviewStore.items.length === 0);
const isNavButtonsVisible = computed(() => reviewStore.status !== 'error' && reviewStore.items !== undefined && isCarouselReady.value && !showNoReviewStub.value);
const pagingState = ref<{ current: number, total: number } | undefined>();

const $emit = defineEmits<{
  (event: 'editBtnClick'): void,
  (event: 'userReviewDeleted', value: IStayReviewItem): void,
}>();

defineExpose({
  rewindToTop
});

const reviewStoreFactory = useStayReviewsStoreFactory();
const reviewStore = await reviewStoreFactory.getInstance(stayId);
const userAccountStore = useUserAccountStore();
const userAccount = ref<IUserAccount>();

const open = ref(false);
const result = ref<ConfirmBoxButton>();

const isError = ref(reviewStore.status === 'error');

watch(() => reviewStore.status, () => {
  isError.value = reviewStore.status === 'error';
  nextTick(refreshPagingState);
});

function refreshPagingState () {
  logger.debug('refreshing paging state', { ctrlKey, stayId });
  const carouselInstance = carouselRef.value;
  if (!isCarouselReady.value || !carouselInstance) {
    logger.debug('refreshing paging state - carousel not initialized', { ctrlKey, stayId });
    return;
  }

  const current = carouselInstance.page;
  const total = Math.max(Math.ceil((reviewStore.items?.length ?? 0) / ReviewsPerSlidePage), current);

  logger.debug('refreshing paging state completed', { ctrlKey, stayId, current, total });
  pagingState.value = { current, total };
}

function rewindToTop () {
  logger.debug('rewind to top', { ctrlKey, stayId });
  if (isCarouselReady.value && carouselRef.value) {
    carouselRef.value.select(0);
    refreshPagingState();
  }
}

async function refreshUserAccount (): Promise<void> {
  if (status.value === 'authenticated') {
    try {
      userAccount.value = await userAccountStore.getUserAccount();
    } catch (err: any) {
      logger.warn('failed to initialize user account info', err, { ctrlKey, stayId });
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
  logger.verbose('edit review btn click handler', { ctrlKey, stayId });
  $emit('editBtnClick');
}

async function onDeleteUserReviewBtnClick (): Promise<void> {
  logger.verbose('delete review btn click handler', { ctrlKey, stayId });

  if(!await requestUserAction(userNotificationStore)) {
    logger.verbose('delete review btn click handler hasn', { ctrlKey, stayId });
    return;
  }

  if(reviewStore.status === 'pending') {
    logger.verbose('cannot delete review while store is in pending state', { ctrlKey, stayId });
    return;
  }

  const confirmBox = useConfirmDialogResult(confirmBoxRef, { open, result }, confirmBoxButtons, 'no', getI18nResName3('stayDetailsPage', 'reviews', 'confirmDelete'));
  const dialogResult = await confirmBox.show();
  if (dialogResult === 'yes') {
    const deletingReview = await reviewStore.getUserReview()!;
    await reviewStore.deleteReview();
    nextTick(refreshPagingState);
    $emit('userReviewDeleted', deletingReview);
  }
}

function onSlideChanged () {
  logger.debug('slide changed', { ctrlKey, stayId });
  refreshPagingState();
}

function onNavNextBtnClick () {
  logger.debug('nav next btn clicked', { ctrlKey, stayId });
  if (isCarouselReady.value && carouselRef.value) {
    carouselRef.value.next();
  }
}

function onNavPrevBtnClick () {
  logger.debug('nav prev btn clicked', { ctrlKey, stayId });
  if (isCarouselReady.value && carouselRef.value) {
    carouselRef.value.prev();
  }
}

const carouselPages = computed(() => {
  return (reviewStore.status !== 'error' && reviewStore.items?.length) ? 
    chunk(reviewStore.items, Math.min(reviewStore.items.length, ReviewsPerSlidePage)) : [];
});

onMounted(() => {
  isCarouselReady.value = true;
  nextTick(refreshPagingState);
  watch(() => carouselRef?.value?.page, refreshPagingState);
});

</script>

<template>
  <div class="block w-full h-auto">
    <ErrorHelm v-model:is-error="isError">
      <UCarousel
        v-if="reviewStore.status !== 'error' && reviewStore.items !== undefined"
        v-slot="{ item: reviewsPage }" 
        ref="carousel"
        :items="carouselPages" 
        :ui="{ 
          wrapper: `pb-6 ${isCarouselReady ? '' : 'invisible h-0'} ${showNoReviewStub ? 'invisible h-0 hidden' : ''}`, 
          item: 'snap-end justify-around basis-full' }"
        :indicators="false" 
        @on-click="onSlideChanged"
      >
        <div class="w-full h-auto flex flex-col flex-nowrap gap-3 sm:gap-6 items-stretch">
          <div
            v-for="(review) in reviewsPage"
            :key="`${toShortForm(ctrlKey)}-Review-${review.id}`"
            class="w-full h-auto"
          >
            <UDivider color="gray" orientation="horizontal" class="w-full mb-3 sm:mb-6" size="sm"/>
            <article class="w-full h-auto flex flex-row flex-nowrap items-start gap-4">
              <div class="flex-initial">
                <UAvatar 
                  v-if="review.user === 'current' ? !!(userAccount?.avatar) : !!(review.user.avatar)"
                  :src="formatImageEntityUrl(review.user === 'current' ? userAccount?.avatar : review.user.avatar, ImageCategory.UserAvatar, 1)"
                  :alt="$t(getI18nResName3('stayDetailsPage', 'reviews', 'avatarImgAlt'))"
                  :ui="{ rounded: 'rounded-full' }"
                />
                <div v-else class="w-8 h-8">
                  <UIcon name="i-heroicons-user-20-solid" class="w-full h-full" :alt="$t(getI18nResName3('stayDetailsPage', 'reviews', 'avatarImgAlt'))"/>
                </div>
              </div>
              <div class="flex-auto w-full h-fit contents">
                <div class="w-full h-28 max-h-28 overflow-y-auto">
                  <div :class="`w-full h-auto flex flex-col flex-nowrap items-start gap-3 text-sm ${isTestUserReview(review) ? 'w-fit' : ''} pb-xs-2 mr-xs-1`">
                    <h3 class="w-fit h-auto flex flex-col flex-nowrap self-start sm:flex-row sm:flex-wrap sm:items-center gap-3 text-black dark:text-white font-semibold">
                      <div class="whitespace-wrap">
                        {{ `${review.score.toFixed(1)} ${$t(getScoreClassResName(review.score))}` }}
                      </div>
                      <span class="hidden sm:block">|</span>
                      <div class="whitespace-wrap">
                        {{ `${review.user === 'current' ? (!!userAccount ? `${userAccount!.firstName} ${userAccount!.lastName}` : '...') : (`${review.user.firstName} ${review.user.lastName}`)}` }}
                      </div>
                    </h3>
                    <p v-if="isTestUserReview(review)" class="block w-full h-auto whitespace-normal">
                      {{ getLocalizeableValue(review.text, locale as Locale) }}
                    </p>
                    <div v-else class="w-auto h-auto" data-review-editor-styling="1">
                      <p v-html="review.text.en" /> <!-- to prevent attack additional sanitizing is applied on server  -->
                    </div>
                  </div>
                </div>
              </div>
              <div class="w-max flex-initial flex flex-col flex-nowrap items-center gap-2 mr-2">
                <UIcon name="heroicons-solid:flag" class="bg-primary-200 dark:bg-primary-700 m-1.5 mt-0" size="xs"/>
                <div v-if="review.user === 'current' || review.user.id === userAccount?.userId" class="contents">
                  <UButton icon="i-heroicons-solid-trash" size="xs" variant="outline" class="border-none ring-0" :title="$t(getI18nResName2('ariaLabels', 'btnDeleteUserReview'))" @click="onDeleteUserReviewBtnClick"/>
                  <UButton icon="i-heroicons-solid-pencil" size="xs" variant="outline" class="border-none ring-0" :title="$t(getI18nResName2('ariaLabels', 'btnEditUserReview'))" @click="onEditUserReviewBtnClick"/>
                </div>
              </div>
            </article>
          </div>
        </div>
      </UCarousel>
      <UDivider v-if="!showNoReviewStub" color="gray" orientation="horizontal" class="w-full mb-3 sm:mb-6" size="sm"/>
      <ComponentWaitingIndicator v-if="(reviewStore.status !== 'error' && reviewStore.items === undefined) || !isCarouselReady" :ctrl-key="[...ctrlKey, 'ResultItemsList', 'Waiter']" class="my-6" />
      <section v-if="isNavButtonsVisible" :class="`w-full h-auto flex flex-row flex-nowrap items-center justify-center gap-4 my-2 sm:my-4 ${(pagingState?.total ?? 0) <= 1 ? 'hidden' : ''}`">
        <UButton icon="i-heroicons-chevron-left-20-solid" size="sm" color="gray" variant="outline" class="border-none ring-0" :disabled="(pagingState?.current ?? 0) <= 1" @click="onNavPrevBtnClick"/>
        <div class="mx-2 sm:mx-4 text-sm text-gray-500 dark:text-gray-400">
          {{ pagingState ? $t(getI18nResName3('stayDetailsPage', 'reviews', 'paging'), { of: pagingState.current, total: pagingState.total }) : '' }}
        </div>
        <UButton icon="i-heroicons-chevron-right-20-solid" size="sm" color="gray" variant="outline" class="border-none ring-0" :disabled="(pagingState?.current ?? 0) === (pagingState?.total ?? 0)" @click="onNavNextBtnClick"/>
      </section>
      <div v-if="showNoReviewStub" class="w-full max-w-[60vw] text-center whitespace-normal mx-auto text-lg my-12 sm:my-8 px-4">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'noReviews')) }}
      </div>
    </ErrorHelm>
    <ConfirmBox ref="confirm-box" v-model:open="open" v-model:result="result" :ctrl-key="[...ctrlKey, 'UserReview', 'Delete', 'ConfirmBox']" :buttons="confirmBoxButtons" :msg-res-name="getI18nResName3('stayDetailsPage', 'reviews', 'confirmDelete')"/>
  </div>
</template>

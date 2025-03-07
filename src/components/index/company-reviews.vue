<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import range from 'lodash-es/range';
import { usePreviewState } from './../../composables/preview-state';
import { getCommonServices } from './../../helpers/service-accessors';
import { ApiEndpointCompanyReviewsList, type ICompanyReviewDto } from './../../server/api-definitions';
import { useCarouselPlayer } from '../../composables/carousel-player';

interface IProps {
  ctrlKey: ControlKey,
};
defineProps<IProps>();

const nuxtApp = useNuxtApp();
const logger = getCommonServices().getLogger().addContextProps({ component: 'CompanyReviews' });
const { enabled } = usePreviewState();

const reviewsListFetch = await useFetch(`/${ApiEndpointCompanyReviewsList}`, 
  {
    server: true,
    lazy: true,
    cache: 'no-cache',
    query: { drafts: enabled },
    default: () => { return range(0, 10, 1).map(_ => null); },
    transform: (response: ICompanyReviewDto[]) => {
      logger.verbose('received company reviews list', response);
      if (!response) {
        logger.warn('company review list response is empty');
        return range(0, 10, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-stub' })
  });


const carouselRef = useTemplateRef('carousel');
useCarouselPlayer(carouselRef as any);

</script>

<template>
  <ErrorHelm :is-error="!!reviewsListFetch.error.value">
    <UCarousel
      v-slot="{ item: review }" 
      ref="carousel"
      :items="reviewsListFetch.data.value" 
      :ui="{ item: 'snap-end justify-around basis-full md:basis-1/2 xl:basis-1/3' }"
      :indicators="false" 
    >
      <CompanyReviewCard 
        :style="{ width: 'auto' }"
        :ctrl-key="[...ctrlKey, 'Card', 'CompanyReview', review?.id ?? 0]"
        :header="review?.header ?? undefined"
        :body="review?.body ?? undefined"
        :user-name="review?.userName ?? undefined"
        :img-src="review?.img?.slug ? { slug: review.img.slug, timestamp: review.img.timestamp } : undefined"
      />
    </UCarousel>
  </ErrorHelm>
</template>

<script setup lang="ts">
import { type ICompanyReviewDto } from './../../server/api-definitions';
import { useCarouselPlayer } from '../../composables/carousel-player';
import type { UCarousel } from '../../.nuxt/components';

interface IProps {
  ctrlKey: string,
  reviews: (ICompanyReviewDto | null)[]
};
defineProps<IProps>();

const carouselRef = shallowRef<InstanceType<typeof UCarousel> | undefined>();
useCarouselPlayer(carouselRef);

</script>

<template>
  <UCarousel
    v-slot="{ item: review }" 
    ref="carouselRef"
    :items="reviews" 
    :ui="{ item: 'snap-end justify-around basis-full md:basis-1/2 xl:basis-1/3' }"
    :indicators="false" 
  >
    <CompanyReviewCard 
      :style="{ width: 'auto' }"
      :ctrl-key="`CompanyReviewCard-${review?.id ?? 'Empty'}`"
      class="Tml-xs-1 Tmr-xs-2 Tmr-s-4"
      :header="review?.header ?? undefined"
      :body="review?.body ?? undefined"
      :user-name="review?.userName ?? undefined"
      :img-src="review?.img?.slug ? { slug: review.img.slug, timestamp: review.img.timestamp } : undefined"
    />
  </UCarousel>
</template>

<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { AppConfig } from '@golobe-demo/shared';
import { type IPopularCityDto, ApiEndpointPopularCitiesList } from './../../../server/api-definitions';
import range from 'lodash-es/range';
import TravelCityCard from './travel-city-card.vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useCarouselPlayer } from '../../../composables/carousel-player';
import type { UCarousel } from './../../../.nuxt/components';


interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay'
};
const { ctrlKey, bookKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelCities' });

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();

const carouselRef = useTemplateRef('carousel');
useCarouselPlayer(carouselRef as any);

const popularCitiesListFetch = await useFetch(`/${ApiEndpointPopularCitiesList}`,
  {
    server: true,
    lazy: true,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    query: { drafts: enabled },
    default: () => { return range(0, 20, 1).map(_ => null); },
    transform: (response: IPopularCityDto[]) => {
      logger.verbose('received popular cities list response', ctrlKey);
      if (!response) {
        logger.warn('popular cities list response is empty', undefined, ctrlKey);
        return range(0, 20, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });

</script>

<template>
  <ErrorHelm :is-error="!!popularCitiesListFetch.error.value">
    <UCarousel
      v-slot="{ item: city }" 
      ref="carousel"
      :items="popularCitiesListFetch.data.value" 
      :ui="{ 
        container: 'gap-4',
        item: 'snap-end justify-around basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6' 
      }"
      :indicators="false" 
    >
    <TravelCityCard
      :ctrl-key="[...ctrlKey, 'TravelCities', city?.id ?? 0]"
      :book-kind="bookKind"
      :city-name="city?.cityDisplayName ?? undefined"
      :promo-line="city?.promoLine ?? undefined"
      :promo-price="city?.promoPrice ?? undefined"
      :img-src="city?.imgSlug ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
      :city-slug="city?.slug"
    />
    </UCarousel>
  </ErrorHelm>
</template>

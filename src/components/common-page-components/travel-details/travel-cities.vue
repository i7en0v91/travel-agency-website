<script setup lang="ts">
import { AppConfig, getI18nResName2 } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../../../helpers/dom';
import { type IPopularCityDto, ApiEndpointPopularCitiesList } from './../../../server/api-definitions';
import { Navigation, Autoplay, Mousewheel } from 'swiper/modules';
import range from 'lodash-es/range';
import PageSection from './../page-section.vue';
import TravelCityCard from './travel-city-card.vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay'
};
const props = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const nuxtApp = useNuxtApp();
const { enabled } = usePreviewState();

const popularCitiesListFetch = await useFetch(`/${ApiEndpointPopularCitiesList}`,
  {
    server: true,
    lazy: true,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    query: { drafts: enabled },
    default: () => { return range(0, 20, 1).map(_ => null); },
    transform: (response: IPopularCityDto[]) => {
      logger.verbose(`(TravelCities) received popular cities list response: ctrlKey=${props.ctrlKey}`);
      if (!response) {
        logger.warn(`(TravelCities) popular cities list response is empty, ctrlKey=${props.ctrlKey}`);
        return range(0, 20, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });

function onActiveSlideChanged () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

watch(popularCitiesListFetch.status, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

</script>

<template>
  <PageSection
    :ctrl-key="`${ctrlKey}-TravelCities`"
    :header-res-name="getI18nResName2('travelCities', 'title')"
    :subtext-res-name="getI18nResName2('travelCities', 'subtext')"
    :btn-text-res-name="getI18nResName2('travelCities', 'btn')"
    :content-padded="true"
    :is-error="!!popularCitiesListFetch.error.value"
  >
    <Swiper
      class="travel-cities-swiper pb-xs-4"
      :modules="[Navigation, Mousewheel, Autoplay]"
      slides-per-view="auto"
      :navigation="{
        enabled: true,
        nextEl: null,
        prevEl: null
      }"
      space-between="16"
      :loop="true"
      :allow-touch-move="true"
      :simulate-touch="true"
      :autoplay="{
        delay: AppConfig.sliderAutoplayPeriodMs
      }"
      :mousewheel="{
        forceToAxis: true
      }"
      @slide-change="onActiveSlideChanged"
    >
      <SwiperSlide
        v-for="(city, index) in popularCitiesListFetch.data.value"
        :key="`${ctrlKey}-TravelCity-${index}`"
        :style="{width: 'auto'}"
      >
        <TravelCityCard
          :ctrl-key="`${ctrlKey}-TravelCity-${index}`"
          :book-kind="bookKind"
          :city-name="city?.cityDisplayName ?? undefined"
          :promo-line="city?.promoLine ?? undefined"
          :promo-price="city?.promoPrice ?? undefined"
          :img-src="city?.imgSlug ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
          :city-slug="city?.slug"
        />
      </SwiperSlide>
    </Swiper>
  </PageSection>
</template>

<script setup lang="ts">

import shuffle from 'lodash-es/shuffle';
import { Navigation, Autoplay, Mousewheel } from 'swiper/modules';
import range from 'lodash-es/range';
import PageSection from './../page-section.vue';
import TravelCityCard from './travel-city-card.vue';
import { useFetchEx } from './../../../shared/fetch-ex';
import { getI18nResName2 } from './../../../shared/i18n';
import { WebApiRoutes, TabIndicesUpdateDefaultTimeout } from './../../../shared/constants';
import { type IPopularCityDto } from './../../../server/dto';
import AppConfig from './../../../appconfig';
import { updateTabIndices } from './../../../shared/dom';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay'
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();

const popularCitiesListFetch = await useFetchEx<IPopularCityDto[], IPopularCityDto[], null[]>(WebApiRoutes.PopularCitiesList, 'error-page',
  {
    server: true,
    lazy: true,
    cache: 'default',
    default: () => { return range(0, 20, 1).map(_ => null); },
    transform: (response: IPopularCityDto[]) => {
      logger.verbose(`(TravelCities) received popular cities list response: ctrlKey=${props.ctrlKey}, json=${JSON.stringify(response)}`);
      if (!response) {
        logger.warn(`(TravelCities) popular cities list response is empty, ctrlKey=${props.ctrlKey}`);
        return []; // error should be logged by fetchEx
      }
      return shuffle(response);
    }
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
    :is-error="popularCitiesListFetch.error.value !== undefined"
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

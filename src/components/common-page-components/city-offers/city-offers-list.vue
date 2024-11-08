<script setup lang="ts">
import { mapLocalizeableValues, AppConfig } from '@golobe-demo/shared';
import { ApiEndpointPopularCitiesList, type IPopularCityDto } from './../../../server/api-definitions';
import { useCityGridLinksTabKeeper } from './../../../composables/city-grid-links-tab-keeper';
import range from 'lodash-es/range';
import CityOffersLinks from './city-offers-links.vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from './../../../helpers/service-accessors';

const logger = getCommonServices().getLogger();

const nuxtApp = useNuxtApp();

useCityGridLinksTabKeeper();

const { enabled } = usePreviewState();
const citiesListFetch = await useFetch(`/${ApiEndpointPopularCitiesList}`, {
    server: true,
    lazy: true,
    cache: (AppConfig.caching.intervalSeconds && !enabled) ? 'default' : 'no-cache',
    query: { drafts: enabled },
    transform: (response: IPopularCityDto[]) => {
      logger.verbose('(CityOffersList) received popular cities list response');
      if (!response) {
        logger.warn('(CityOffersList) popular cities list response is empty');
        return range(0, 20, 1).map(_ => null); // error should be logged by fetchEx
      }
      return response;
    },
    default: () => { return range(0, 20, 1).map(_ => null); },
    $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
  });

</script>

<template>
  <ErrorHelm :is-error="!!citiesListFetch.error.value">
    <ul class="p-2 sm:p-4 grid grid-flow-row grid-cols-citylinks grid-rows-5 md:grid-rows-3 auto-rows-[0px] overflow-clip -translate-y-[40px] justify-center">
      <li v-for="(city, idx) in citiesListFetch.data.value" :key="`popular-city-${idx}`" class="w-full city-offers-list-item">
        <CityOffersLinks
          :ctrl-key="`CityOffersLinks-${idx}`"
          search-kind="flight"
          :text="city ? mapLocalizeableValues((city: string, country: string) => `${city}, ${country}`, city.cityDisplayName, city.countryDisplayName) : undefined"
          :img-src="city ? { slug: city.imgSlug, timestamp: city.timestamp } : undefined"
          :city-slug="city ? city.slug : undefined"
          :num-stays="city ? city.numStays : undefined"
        />
      </li>
    </ul>
  </ErrorHelm>
</template>
<script setup lang="ts">

import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { getI18nResName3 } from './../../shared/i18n';
import { WorldMapCityLabelFlipX } from './../../shared/constants';

interface IProps {
  ctrlKey: string,
  slug: string,
  cityName: ILocalizableValue,
  countryName: ILocalizableValue,
  imgSrc: IImageEntitySrc,
  relativeCoord: { x: number, y: number }
};
const props = defineProps<IProps>();

const { locale } = useI18n();
const travelDetailsStore = useTravelDetailsStore();

const cityUrl = ref<string>(travelDetailsStore.buildTravelCityUrl(props.slug));
function updateCityUrl () {
  cityUrl.value = travelDetailsStore.buildTravelCityUrl(props.slug);
}

onMounted(() => {
  updateCityUrl();
  watch(locale, updateCityUrl);
});

</script>

<template>
  <div
    class="world-map-city-label p-xs-2 px brdr-2"
    :style="{
      position: 'relative',
      top: `${Math.round(props.relativeCoord.y * 100)}%`,
      left: `${Math.round(props.relativeCoord.x * 100)}%`,
      transform: `translate(${props.relativeCoord.x > WorldMapCityLabelFlipX ? '-110' : '10'}%, -105%)`
    }"
  >
    <StaticImage
      :ctrl-key="ctrlKey"
      :entity-src="{ slug: imgSrc.slug, timestamp: imgSrc.timestamp }"
      :category="ImageCategory.CityCard"
      sizes="xs:30vw sm:20vw md:10vw lg:10vw xl:10vw"
      class="world-map-city-label-img brdr-2"
      :alt-res-name="getI18nResName3('flightsPage', 'worldMap', 'cityImgAlt')"
      :show-stub="true"
    />
    <div class="world-map-city-info">
      <NuxtLink :external="false" :replace="true" :href="cityUrl" class="world-map-city-name brdr-1 no-hidden-parent-tabulation-check" :aria-label="$t(getI18nResName3('flightsPage', 'worldMap', 'cityTravelInfoAria'))">
        {{ (props.cityName as any)[locale] }}
      </NuxtLink>
      <div class="world-map-city-country">
        {{ (props.countryName as any)[locale] }}
      </div>
    </div>
  </div>
</template>

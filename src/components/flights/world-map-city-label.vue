<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { getI18nResName3, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { WorldMapCityLabelFlipX } from './../../helpers/constants';

interface IProps {
  ctrlKey: ControlKey,
  slug: string,
  cityName: ILocalizableValue,
  countryName: ILocalizableValue,
  imgSrc: IImageEntitySrc,
  relativeCoord: { x: number, y: number }
};
const { cityName, countryName, relativeCoord, slug } = defineProps<IProps>();

const { locale } = useI18n();
const travelDetailsStore = useTravelDetailsStore();

const cityUrl = ref<string>(travelDetailsStore.buildTravelCityUrl(slug));
function updateCityUrl () {
  cityUrl.value = travelDetailsStore.buildTravelCityUrl(slug);
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
      top: `${Math.round(relativeCoord.y * 100)}%`,
      left: `${Math.round(relativeCoord.x * 100)}%`,
      transform: `translate(${relativeCoord.x > WorldMapCityLabelFlipX ? '-110' : '10'}%, -105%)`
    }"
  >
    <StaticImage
      :ctrl-key="[...ctrlKey, 'StaticImg']"
      :src="{ slug: imgSrc.slug, timestamp: imgSrc.timestamp }"
      :category="ImageCategory.CityCard"
      sizes="xs:30vw sm:20vw md:10vw lg:10vw xl:10vw"
      class="world-map-city-label-img brdr-2"
      :alt="{ resName: getI18nResName3('flightsPage', 'worldMap', 'cityImgAlt') }"
      stub="default"
    />
    <div class="world-map-city-info">
      <NuxtLink :external="false" :replace="true" :href="cityUrl" class="world-map-city-name brdr-1 no-hidden-parent-tabulation-check" :aria-label="$t(getI18nResName3('flightsPage', 'worldMap', 'cityTravelInfoAria'))">
        {{ (cityName as any)[locale] }}
      </NuxtLink>
      <div class="world-map-city-country">
        {{ (countryName as any)[locale] }}
      </div>
    </div>
  </div>
</template>

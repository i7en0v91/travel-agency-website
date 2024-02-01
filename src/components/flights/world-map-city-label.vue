<script setup lang="ts">

import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { getI18nResName3 } from './../../shared/i18n';
import { WorldMapCityLabelFlipX } from './../../shared/constants';

interface IProps {
  ctrlKey: string,
  cityName: ILocalizableValue,
  countryName: ILocalizableValue,
  imgSrc: IImageEntitySrc,
  relativeCoord: { x: number, y: number }
};
const props = defineProps<IProps>();

const { locale } = useI18n();

const $emit = defineEmits(['click']);
function onClick () {
  $emit('click');
}

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
      sizes="sm:30vw md:20vw lg:10vw xl:10vw xxl:10vw"
      class="world-map-city-label-img brdr-2"
      :alt-res-name="getI18nResName3('flightsPage', 'worldMap', 'cityImgAlt')"
      :show-stub="true"
    />
    <div class="world-map-city-info">
      <button class="world-map-city-name brdr-1 no-hidden-parent-tabulation-check" type="button" :aria-label="$t(getI18nResName3('flightsPage', 'worldMap', 'cityTravelInfoAria'))" @click="onClick">
        {{ (props.cityName as any)[locale] }}
      </button>
      <div class="world-map-city-country">
        {{ (props.countryName as any)[locale] }}
      </div>
    </div>
  </div>
</template>

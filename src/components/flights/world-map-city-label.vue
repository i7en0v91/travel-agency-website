<script setup lang="ts">
import { getI18nResName3, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { WorldMapCityLabelFlipX } from './../../helpers/constants';

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
    class="flex flex-row flex-nowrap items-center gap-[8px] h-min w-fit max-w-[190px] md:max-w-[240px] p-2 rounded-md shadow-md bg-white dark:bg-gray-900 text-xs sm:text-sm"
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
      :ui="{ 
        wrapper: 'aspect-square rounded size-[40px] min-w-[40px] min-h-[40px] lg:size-[50px] lg:min-w-[50px] lg:min-h-[50px]',
        stub: 'rounded',
        img: 'rounded object-cover'
      }"
      :alt-res-name="getI18nResName3('flightsPage', 'worldMap', 'cityImgAlt')"
      :show-stub="true"
    />
    <div class="w-full h-auto">
      <ULink :external="false" :replace="true" :to="cityUrl" class="text-gray-400 dark:text-gray-500 font-semibold" :aria-label="$t(getI18nResName3('flightsPage', 'worldMap', 'cityTravelInfoAria'))">
        {{ (props.cityName as any)[locale] }}
      </ULink>
      <div class="text-gray-600 dark:text-gray-300 font-normal">
        {{ (props.countryName as any)[locale] }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Locale, AppPage, getI18nResName3, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import type { ControlKey } from './../../helpers/components';
import { WorldMapCityLabelFlipX, TravelDetailsHtmlAnchor } from './../../helpers/constants';
import { withQuery, encodeHash, stringifyParsedURL, type ParsedURL } from 'ufo';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  slug: string,
  cityName: ILocalizableValue,
  countryName: ILocalizableValue,
  imgSrc: IImageEntitySrc,
  relativeCoord: { x: number, y: number }
};
const { cityName, countryName, relativeCoord, slug } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'WorldMapCityLabel' });
const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

function buildTravelCityUrl (citySlug: string): string {
  logger.debug(`build city url`, { slug: citySlug });

  const url: Partial<ParsedURL> = {
    pathname: navLinkBuilder.buildPageLink(AppPage.Flights, locale.value as Locale),
    hash: encodeHash(`#${TravelDetailsHtmlAnchor}`)
  };
  const result = withQuery(stringifyParsedURL(url), { citySlug });

  logger.debug(`city url`, { slug: citySlug, url: result });
  return result;
}

const cityUrl = ref<string>(buildTravelCityUrl(slug));
function updateCityUrl () {
  cityUrl.value = buildTravelCityUrl(slug);
}

onMounted(() => {
  watch(locale, updateCityUrl, {
    immediate: true
  });
});

</script>

<template>
  <div
    class="flex flex-row flex-nowrap items-center gap-[8px] h-min w-fit max-w-[190px] md:max-w-[240px] p-2 rounded-md shadow-md bg-white dark:bg-gray-900 text-xs sm:text-sm"
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
      :ui="{ 
        wrapper: 'aspect-square rounded size-[40px] min-w-[40px] min-h-[40px] lg:size-[50px] lg:min-w-[50px] lg:min-h-[50px]',
        stub: 'rounded',
        img: 'rounded object-cover'
      }"
      :alt="{ resName: getI18nResName3('flightsPage', 'worldMap', 'cityImgAlt') }"
      stub="default"
    />
    <div class="w-full h-auto">
      <ULink :external="false" :replace="true" :to="cityUrl" class="text-gray-400 dark:text-gray-500 font-semibold" :aria-label="$t(getI18nResName3('flightsPage', 'worldMap', 'cityTravelInfoAria'))">
        {{ (cityName as any)[locale] }}
      </ULink>
      <div class="text-gray-600 dark:text-gray-300 font-normal">
        {{ (countryName as any)[locale] }}
      </div>
    </div>
  </div>
</template>

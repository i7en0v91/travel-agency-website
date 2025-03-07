<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppPage, type Locale, getI18nResName3, getI18nResName2, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  searchKind: 'flight' | 'stay',
  text?: ILocalizableValue,
  imgSrc?: IImageEntitySrc,
  citySlug?: string,
  numStays?: number
};
const { text } = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <li>
    <div class="popular-city-card brdr-3">
      <div class="popular-city-card-container p-xs-3 m-xs-5 brdr-3">
        <StaticImage
          :ctrl-key="ctrlKey"
          :src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
          :category="ImageCategory.CityCard"
          sizes="xs:40vw sm:20vw md:30vw lg:30vw xl:20vw"
          class="popular-city-card-img brdr-3"
          :alt="{ resName: getI18nResName3('indexPage', 'popularCity', 'imgAlt') }"
          stub="default"
        />
        <div class="popular-city-info">
          <div :class="`pl-xs-2 pt-xs-2 ${text ? 'popular-city-name' : 'data-loading-stub text-data-loading m-xs-2'} font-h5`">
            {{ text ? ((text as any)[locale]) : '&nbsp;' }}
          </div>
          <div v-if="searchKind === 'flight'" class="popular-city-links mt-xs-2 p-xs-2">
            <NuxtLink class="popular-city-link brdr-1 hidden-overflow-nontabbable" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'flights')) }}
            </NuxtLink>
            <NuxtLink class="popular-city-link brdr-1 hidden-overflow-nontabbable" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'stays')) }}
            </NuxtLink>
          </div>
          <div v-else class="popular-city-links mt-xs-2 p-xs-2">
            <NuxtLink v-if="numStays !== undefined" class="popular-city-link brdr-1 hidden-overflow-nontabbable" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName2('staysPage', 'cityPlacesCount'), numStays) }}
            </NuxtLink>
            <div v-else class="data-loading-stub text-data-loading" />
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

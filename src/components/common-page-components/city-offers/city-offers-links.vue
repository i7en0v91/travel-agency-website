<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppPage, type Locale, getI18nResName3, getI18nResName2, type ILocalizableValue, ImageCategory, type IImageEntitySrc } from '@golobe-demo/shared';
import { useNavLinkBuilder } from '../../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  searchKind: 'flight' | 'stay',
  text?: ILocalizableValue,
  imgSrc?: IImageEntitySrc,
  citySlug?: string,
  numStays?: number
};
defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <div class="block w-auto max-w-[100vw] h-auto mx-auto rounded-xl">
    <div class="dark:bg-gray-900 flex flex-row flex-nowrap items-center gap-[16px] w-auto h-full overflow-hidden shadow-md dark:shadow-lg dark:shadow-gray-800 p-4 m-8 rounded-xl">
      <StaticImage
        :ctrl-key="ctrlKey"
        :src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
        :category="ImageCategory.CityCard"
        :ui="{ wrapper: 'w-[90px] h-[90px] max-w-[90px] max-h-[90px] flex-grow flex-shrink-0 basis-auto rounded-xl', img: 'object-cover rounded-xl bg-cover' }"
        sizes="xs:40vw sm:20vw md:30vw lg:30vw xl:20vw"
        :alt="{ resName: getI18nResName3('indexPage', 'popularCity', 'imgAlt') }"
        stub="default"
      />
      <div class="w-fit h-max flex-grow-0 flex-shrink basis-auto">
        <div v-if="text" class="ml-1 text-gray-400 dark:text-gray-500 w-fit h-auto overflow-hidden line-clamp-2 whitespace-pre-wrap font-semibold">
          {{ (text as any)[locale] }}
        </div>
        <USkeleton v-else class="w-full h-3" />
        <div class="text-gray-700 dark:text-gray-200 font-normal w-fit h-auto overflow-hidden flex flex-row flex-wrap items-center gap-[8px] mt-2 pr-2">
          <div v-if="searchKind === 'flight'" class="contents">
            <ULink class="ring-inset m-1" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'flights')) }}
            </ULink>
            <ULink class="ring-inset m-1" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'stays')) }}
            </ULink>
          </div>
          <div v-else class="contents">
            <ULink v-if="numStays !== undefined" class="ring-inset m-1" :to="citySlug ? navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug }) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
              {{ $t(getI18nResName2('staysPage', 'cityPlacesCount'), numStays) }}
            </ULink>
            <USkeleton v-else class="w-32 max-w-[30vw] h-3" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

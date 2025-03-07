<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppPage, getI18nResName3, type IImageEntitySrc, type ILocalizableValue, ImageCategory, type Locale } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay',
  cityName?: ILocalizableValue,
  promoLine?: ILocalizableValue,
  promoPrice?: number,
  citySlug?: string,
  imgSrc?: IImageEntitySrc
};
const { cityName, promoLine, promoPrice } = defineProps<IProps>();

const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

const uiStyling = {
  base: 'w-full h-full flex flex-col flex-nowrap row-start-1 row-end-2 col-start-1 col-end-2 min-w-[296px] min-h-[420px] z-[3]',
  background: 'bg-transparent dark:bg-transparent',
  shadow: 'shadow-lg',
  rounded: 'rounded-2xl',
  divide: 'divide-none',
  header: {
    base: 'flex-grow-0 flex-shrink basis-auto'
  },
  body: {
    base: 'flex-1 flex flex-col flex-nowrap justify-end h-auto',
    padding: '!pb-0'
  },
  footer: {
    base: 'flex-grow-0 flex-shrink basis-auto',
    padding: '!pt-0'
  }
};


</script>

<template>
  <div class="text-white grid grid-rows-1 grid-cols-1 rounded-2xl w-full min-w-[296px] h-auto min-h-[420px]">
    <UCard as="div" :ui="uiStyling">
      <template #header>
        <h3 v-if="cityName" class="font-semibold text-2xl">
          {{ (cityName as any)[locale] }}            
        </h3>
        <USkeleton v-else class="w-full h-6 mb-[100%]" />
      </template>
      
      <div class="flex flex-row flex-nowrap items-end gap-[16px]">
        <div class="flex-1 w-min h-auto">          
          <div v-if="cityName" class="h-auto font-medium text-sm sm:text-base">
            {{ (promoLine as any)[locale] }}            
          </div>
          <USkeleton v-else class="w-1/2 h-3" />
        </div>

        <div v-if="promoPrice" class="flex-grow-0 flex-shrink basis-auto whitespace-nowrap w-auto h-auto min-w-[60px] font-semibold text-2xl">
          {{ `$ ${promoPrice}` }}            
        </div>
        <USkeleton v-else class="w-1/4 h-6" />
      </div>

      <template #footer>
        <UButton size="xl" class="w-full rounded mt-4 justify-center" variant="solid" color="green" :to="citySlug ? (bookKind === 'flight' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: citySlug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug })) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :external="false">
          {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
        </UButton>
      </template>
    </UCard>
    <div class="rounded-xl row-start-1 row-end-2 col-start-1 col-end-2 w-auto h-full z-[2] bg-gradient-to-t from-black to-gray-600 via-75% via-transparent opacity-40 " />
    <StaticImage
      :ctrl-key="[...ctrlKey, 'StaticImg', 'City']"
      :src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
      :category="ImageCategory.CityCard"
      sizes="xs:90vw sm:80vw md:60vw lg:50vw xl:50vw"
      :ui="{ 
        wrapper: 'rounded-xl w-auto h-full row-start-1 row-end-2 col-start-1 col-end-2 w-auto z-[1]',
        img: 'rounded-xl object-cover',
        stub: 'rounded-xl'
      }"
      :alt="{ resName: getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt') }"
      stub="default"
    />
  </div>
</template>

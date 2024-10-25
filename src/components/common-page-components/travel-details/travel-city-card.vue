<script setup lang="ts">
import { AppPage, getI18nResName3, type IImageEntitySrc, type ILocalizableValue, ImageCategory, type Locale } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay',
  cityName?: ILocalizableValue,
  promoLine?: ILocalizableValue,
  promoPrice?: number,
  citySlug?: string,
  imgSrc?: IImageEntitySrc
};
const props = defineProps<IProps>();

const navLinkBuilder = useNavLinkBuilder();
const { locale } = useI18n();

</script>

<template>
  <article class="travel-city-card">
    <div class="travel-city-card-dim brdr-3" />
    <div class="travel-city-card-details p-xs-4">
      <div class="travel-city-card-texts">
        <div class="travel-city-card-place-info">
          <h3 :class="`${props.cityName ? '' : 'data-loading-stub text-data-loading'} font-h4`">
            {{ props.cityName ? (props.cityName as any)[locale] : '&nbsp;' }}
          </h3>
          <div :class="props.promoLine ? '' : 'data-loading-stub text-data-loading mt-xs-1'">
            {{ props.promoLine ? (props.promoLine as any)[locale] : '&nbsp;' }}
          </div>
        </div>
        <div :class="props.promoPrice ? 'travel-city-card-price' : 'data-loading-stub text-data-loading travel-city-card-price'">
          {{ props.promoPrice ? `$ ${props.promoPrice}` : '&nbsp;' }}
        </div>
      </div>
      <NuxtLink class="btn btn-primary brdr-1 mt-xs-3 no-hidden-parent-tabulation-check" :to="citySlug ? (bookKind === 'flight' ? navLinkBuilder.buildPageLink(AppPage.FindFlights, locale as Locale, { fromCitySlug: citySlug }) : navLinkBuilder.buildPageLink(AppPage.FindStays, locale as Locale, { citySlug })) : navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)">
        {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
      </NuxtLink>
    </div>
    <StaticImage
      :ctrl-key="`${ctrlKey}-CityImage`"
      :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
      :category="ImageCategory.CityCard"
      sizes="xs:90vw sm:80vw md:60vw lg:50vw xl:50vw"
      :ui="{ wrapper: 'travel-city-card-img brdr-3' }"
      :alt-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt')"
      :show-stub="true"
    />
  </article>
</template>

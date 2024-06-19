<script setup lang="ts">

import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../../shared/interfaces';
import { getI18nResName3 } from './../../../shared/i18n';
import { HtmlPage, getHtmlPagePath } from './../../../shared/page-query-params';

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

const localePath = useLocalePath();
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
      <NuxtLink class="btn btn-primary brdr-1 mt-xs-3 no-hidden-parent-tabulation-check" :to="citySlug ? (bookKind === 'flight' ? localePath(`/${getHtmlPagePath(HtmlPage.FindFlights)}?fromCitySlug=${citySlug}`) : localePath(`/${getHtmlPagePath(HtmlPage.FindStays)}?citySlug=${citySlug}`)) : localePath(`/${getHtmlPagePath(HtmlPage.Index)}`)">
        {{ $t(getI18nResName3('travelCities', 'bookBtn', bookKind)) }}
      </NuxtLink>
    </div>
    <StaticImage
      :ctrl-key="`${ctrlKey}-CityImage`"
      :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
      :category="ImageCategory.CityCard"
      sizes="xs:90vw sm:80vw md:60vw lg:50vw xl:50vw"
      class="travel-city-card-img brdr-3"
      :alt-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt')"
      :show-stub="true"
    />
  </article>
</template>

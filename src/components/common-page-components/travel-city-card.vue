<script setup lang="ts">

import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  cityName?: ILocalizableValue,
  promoLine?: ILocalizableValue,
  promoPrice?: number,
  imgSrc?: IImageEntitySrc
};
const props = defineProps<IProps>();

const localePath = useLocalePath();
const { locale } = useI18n();

</script>

<template>
  <div class="travel-city-card">
    <div class="travel-city-card-dim brdr-3" />
    <div class="travel-city-card-details p-xs-4">
      <div class="travel-city-card-texts">
        <div class="travel-city-card-place-info">
          <h4 :class="props.cityName ? '' : 'data-loading-stub text-data-loading'">
            {{ props.cityName ? (props.cityName as any)[locale] : '&nbsp;' }}
          </h4>
          <div :class="props.promoLine ? '' : 'data-loading-stub text-data-loading mt-xs-1'">
            {{ props.promoLine ? (props.promoLine as any)[locale] : '&nbsp;' }}
          </div>
        </div>
        <div :class="props.promoPrice ? 'travel-city-card-price' : 'data-loading-stub text-data-loading travel-city-card-price'">
          {{ props.promoPrice ? `$ ${props.promoPrice}` : '&nbsp;' }}
        </div>
      </div>
      <NuxtLink class="btn btn-primary brdr-1 mt-xs-3 no-hidden-parent-tabulation-check" :to="props.cityName ? localePath('/') : localePath('/flights')">
        {{ $t(getI18nResName3('travelCities', 'card', 'btnBook')) }}
      </NuxtLink>
    </div>
    <StaticImage
      :ctrl-key="`${ctrlKey}-CityImage`"
      :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
      :category="ImageCategory.CityCard"
      sizes="sm:90vw md:80vw lg:60vw xl:50vw xxl:50vw"
      class="travel-city-card-img brdr-3"
      :alt-res-name="getI18nResName3('indexPage', 'companyReviewSection', 'imgAlt')"
      :show-stub="true"
    />
  </div>
</template>

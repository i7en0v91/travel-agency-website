<script setup lang="ts">

import { type ILocalizableValue, ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';
import { getI18nResName3 } from './../../shared/i18n';

interface IProps {
  ctrlKey: string,
  text?: ILocalizableValue,
  imgSrc?: IImageEntitySrc,
  citySlug?: string
};
const props = defineProps<IProps>();

const { locale } = useI18n();
const localePath = useLocalePath();

</script>

<template>
  <li>
    <div class="popular-city-card brdr-3">
      <div class="popular-city-card-container p-xs-3 m-xs-5 brdr-3">
        <StaticImage
          :ctrl-key="ctrlKey"
          :entity-src="imgSrc ? { slug: imgSrc.slug, timestamp: imgSrc.timestamp } : undefined"
          :category="ImageCategory.CityCard"
          sizes="xs:40vw sm:20vw md:30vw lg:30vw xl:20vw"
          class="popular-city-card-img brdr-3"
          :alt-res-name="getI18nResName3('indexPage', 'popularCity', 'imgAlt')"
          :show-stub="true"
        />
        <div class="popular-city-info">
          <h5 :class="`pl-xs-2 pt-xs-2 ${text ? 'popular-city-name' : 'data-loading-stub text-data-loading'}`">
            {{ props.text ? ((props.text as any)[locale]) : '&nbsp;' }}
          </h5>
          <div class="popular-city-links mt-xs-2 p-xs-2">
            <NuxtLink class="popular-city-link brdr-1 hidden-overflow-nontabbable" :to="citySlug ? localePath(`/find-flights?fromCitySlug=${citySlug}`) : localePath('/')">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'flights')) }}
            </NuxtLink>
            <NuxtLink class="popular-city-link brdr-1 hidden-overflow-nontabbable" :to="citySlug ? localePath(`/find-stays?citySlug=${citySlug}`) : localePath('/')">
              {{ $t(getI18nResName3('indexPage', 'popularCity', 'stays')) }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

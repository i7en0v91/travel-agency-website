<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';
import StaticImage from './../components/images/static-image.vue';
import SearchOffers from './search-offers.vue';
import { type ImageCategory, type IImageEntitySrc } from './../../shared/interfaces';

interface IProps {
  ctrlKey: string,
  imageEntitySrc: IImageEntitySrc,
  category: ImageCategory,
  imageAltResName: I18nResName,
  singleTab?: 'flights' | 'stays'
}
defineProps<IProps>();

</script>

<template>
  <section class="search-page-head">
    <StaticImage
      :ctrl-key="`${ctrlKey}-MainImage`"
      class="search-page-head-image"
      :entity-src="imageEntitySrc"
      :category="category"
      :is-high-priority="true"
      sizes=" sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw"
      :alt-res-name="imageAltResName"
      stub-style="custom-if-configured"
    />
    <div class="search-page-head-content">
      <slot />
    </div>
    <SearchOffers :ctrl-key="`${ctrlKey}-SearchOffers`" :single-tab="singleTab" />
  </section>
</template>

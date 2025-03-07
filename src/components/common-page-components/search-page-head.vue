<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { ImageCategory, IImageEntitySrc, I18nResName } from '@golobe-demo/shared';
import StaticImage from './../../components/images/static-image.vue';
import SearchOffers from './search-offers/search-offers.vue';

interface IProps {
  ctrlKey: ControlKey,
  imageEntitySrc: IImageEntitySrc,
  category: ImageCategory,
  imageAltResName: I18nResName,
  singleTab?: 'flights' | 'stays',
  overlayClass?: string
}
defineProps<IProps>();

</script>

<template>
  <div class="search-page-head">
    <div class="search-page-head-media">
      <StaticImage
        :ctrl-key="[...ctrlKey, 'StaticImg']"
        class="search-page-head-image"
        :src="imageEntitySrc"
        :category="category"
        :high-priority="true"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        :alt="{ resName: imageAltResName }"
        :ui="{ overlay: overlayClass }"
        stub="custom-if-configured"
      />
      <div class="search-page-head-content">
        <slot />
      </div>
    </div>
    <SearchOffers :ctrl-key="['SearchOffers']" :single-tab="singleTab" />
  </div>
</template>

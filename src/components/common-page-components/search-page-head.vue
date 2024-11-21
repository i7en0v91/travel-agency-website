<script setup lang="ts">
import { type ImageCategory, type IImageEntitySrc, type I18nResName } from '@golobe-demo/shared';
import StaticImage from './../../components/images/static-image.vue';
import SearchOffers from './search-offers/search-offers.vue';
import { type IStaticImageUiProps } from '../../types';

interface IProps {
  ctrlKey: string,
  imageEntitySrc: IImageEntitySrc,
  category: ImageCategory,
  imageAltResName: I18nResName,
  singleTab?: 'flights' | 'stays',
  ui?: {
    wrapper?: string,
    image?: IStaticImageUiProps,
    content?: string
  }
}
defineProps<IProps>();

</script>

<template>
  <div :class="`relative z-[2] block w-full h-auto ${ui?.wrapper ?? ''}`">
    <div class="w-full h-auto grid grid-cols-1 grid-rows-1">
      <StaticImage
        :ctrl-key="`${ctrlKey}-MainImage`"
        :ui="{ 
          ...(ui?.image ?? {  }), 
          wrapper: `self-start row-start-1 row-end-2 col-start-1 col-end-2 w-full z-[-1] ${ui?.image?.wrapper ?? ''}` 
        }"
        :entity-src="imageEntitySrc"
        :category="category"
        :is-high-priority="true"
        sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
        :alt-res-name="imageAltResName"
        stub-style="custom-if-configured"
      />
      <div :class="`row-start-1 row-end-2 col-start-1 col-end-2 overflow-hidden ${ui?.content ?? ''}`">
        <slot />
      </div>
    </div>
    <SearchOffers :ctrl-key="`${ctrlKey}-SearchOffers`" :single-tab="singleTab" :show-promo-btn="true" class="-translate-y-[10%] w-[95%] max-w-[1700px]"/>
  </div>
</template>

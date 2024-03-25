<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import { PagePath } from './../../shared/constants';

interface IProps {
  ctrlKey: string,
  page: 'flights' | 'stays'
}
const props = defineProps<IProps>();

const localePath = useLocalePath();

</script>

<template>
  <div class="search-page-image-link">
    <StaticImage
      :ctrl-key="ctrlKey"
      :asset-src="{ filename: `image-link-${$props.page}.webp`, width: 590, height: 550 }"
      sizes="xs:40vw sm:40vw md:40vw lg:40vw xl:40vw"
      class="image-link-img"
      :overlay-class="`search-${props.page}-page-link-overlay`"
      :alt-res-name="getI18nResName2('indexPage', 'imgLinkAlt')"
    />
    <div class="image-link-texting mb-xs-4">
      <h2>{{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'title')) }}</h2>
      <p class="mt-xs-2">
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'sub')) }}
      </p>
      <NuxtLink class="btn btn-primary btn-icon icon-paper-plane brdr-1 mt-xs-3" :to="localePath(`${page === 'flights' ? `/${PagePath.Flights}` : `/${PagePath.Stays}`}`)">
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'btn')) }}
      </NuxtLink>
    </div>
  </div>
</template>

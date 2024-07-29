<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import { type Locale } from './../../shared/constants';
import { AppPage } from './../../shared/page-query-params';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string,
  page: 'flights' | 'stays'
}
defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <div class="search-page-image-link">
    <StaticImage
      :ctrl-key="ctrlKey"
      :asset-src="{ filename: `image-link-${$props.page}.webp`, width: 590, height: 550 }"
      sizes="xs:40vw sm:40vw md:40vw lg:40vw xl:40vw"
      class="image-link-img"
      img-class="search-stays-page-link-img"
      :alt-res-name="getI18nResName2('indexPage', 'imgLinkAlt')"
    />
    <section class="image-link-texting mb-xs-4">
      <h3 class="font-h2">{{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'title')) }}</h3>
      <p class="mt-xs-2">
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'sub')) }}
      </p>
      <NuxtLink class="btn btn-primary btn-icon icon-paper-plane brdr-1 mt-xs-3" :to="page === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale as Locale)">
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'btn')) }}
      </NuxtLink>
    </section>
  </div>
</template>

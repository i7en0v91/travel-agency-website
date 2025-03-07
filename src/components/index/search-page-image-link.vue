<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AppPage, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  page: 'flights' | 'stays'
}
const { page } = defineProps<IProps>();

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <div class="search-page-image-link">
    <StaticImage
      :ctrl-key="ctrlKey"
      :src="{ filename: `image-link-${page}.webp`, width: 590, height: 550 }"
      sizes="xs:40vw sm:40vw md:40vw lg:40vw xl:40vw"
      class="image-link-img"
      :ui="{ img: 'search-stays-page-link-img' }"
      :alt="{ resName: getI18nResName2('indexPage', 'imgLinkAlt') }"
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

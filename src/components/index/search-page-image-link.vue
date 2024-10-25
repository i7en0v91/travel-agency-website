<script setup lang="ts">
import { AppPage, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
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
  <div class="w-full max-w-[450px] grid grid-rows-1 grid-cols-1 sm:max-w-[650px]">
    <StaticImage
      :ctrl-key="ctrlKey"
      :asset-src="{ filename: `image-link-${$props.page}.webp`, width: 590, height: 550 }"
      sizes="xs:40vw sm:40vw md:40vw lg:40vw xl:40vw"
      :ui="{ wrapper: 'col-start-1 col-end-2 row-start-1 row-end-2 aspect-square rounded-3xl', img: 'aspect-square rounded-3xl brightness-[0.8]', stub: 'rounded-3xl' }"
      :alt-res-name="getI18nResName2('indexPage', 'imgLinkAlt')"
    />
    <section class="text-white z-[2] col-start-1 col-end-2 row-start-1 row-end-2 mb-8 self-end justify-self-center flex flex-col flex-nowrap items-center max-w-[80%]">
      <h3 class="text-5xl break-words text-center font-semibold">{{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'title')) }}</h3>
      <p class="text-center mt-2">
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'sub')) }}
      </p>
      <UButton
        class="mt-4"
        size="lg"
        :to="page === 'flights' ? navLinkBuilder.buildPageLink(AppPage.Flights, locale as Locale) : navLinkBuilder.buildPageLink(AppPage.Stays, locale as Locale)"
        :aria-label="$t(getI18nResName3('indexPage', `${page}ImgLink`, 'btn'))"
        icon="i-ion-paper-plane"
        variant="solid"
        color="primary"
      >
        {{ $t(getI18nResName3('indexPage', `${page}ImgLink`, 'btn')) }}
      </UButton>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ArbitraryControlElementMarker, ControlKey } from './../../helpers/components';
import { AppConfig, getI18nResName1, HeaderAppVersion } from '@golobe-demo/shared';
import PhotoSlide from './../../components/account/photo-slide.vue';
import { type IImageDetailsDto, ApiEndpointAuthFormPhotos } from './../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import type { IStaticImageUiProps } from './../../types';
import type { Ref } from 'vue';
import { getCommonServices } from '../../helpers/service-accessors';
import type { UCarousel } from '../../.nuxt/components';
import { useCarouselPlayer } from '../../composables/carousel-player';

interface IProps {
  ctrlKey: ControlKey,
  ui?: {
    wrapper?: string,
    image?: IStaticImageUiProps
  }
}
defineProps<IProps>();

const isError = ref(false);
const logger = getCommonServices().getLogger().addContextProps({ component: 'FormPhotos' });

const { enabled } = usePreviewState();

const carouselRef = useTemplateRef('carousel');
useCarouselPlayer(carouselRef as any);

const authFormsImagesUrl = `/${ApiEndpointAuthFormPhotos}`;
const { error, data } = await useFetch(authFormsImagesUrl,
  {
    server: true,
    lazy: true,
    query: { drafts: enabled },
    headers: [[HeaderAppVersion, AppConfig.versioning.appVersion.toString()]],
    transform: (response: any) => {
      const dto = response as IImageDetailsDto[];
      if (!dto) {
        logger.warn('fetch request returned empty data');
        return;
      }
      const slugs = dto.map(x => x.slug);
      logger.verbose('received images details', slugs);
      isError.value = false;
      return slugs;
    }
  });
watch(error, () => {
  if (error.value) {
    logger.warn('fetch request failed (watch', error.value);
    isError.value = true;
  }
});
if (error.value) {
  logger.warn('fetch request failed (err value', error.value);
  isError.value = true;
}
const imageSlugs = data as Ref<string[] | undefined>;

watch(() => imageSlugs.value, () => {
  if (imageSlugs.value) {
    isError.value = false;
  }
});

</script>

<template>
  <div :class="`flex-initial hidden md:block w-[386px] min-w-[386px] lg:w-[486px] lg:min-w-[486px] rounded-4xl overflow-hidden ${ui?.wrapper ?? ''}`" role="figure">
    <ErrorHelm v-model:is-error="isError">
      <UCarousel
        v-if="imageSlugs?.length ?? 0 > 0" ref="carousel" v-slot="{ item: imgSlug }" 
        :items="imageSlugs" 
        :ui="{ 
          item: 'w-full snap-end',
          indicators: { 
            base: 'rounded-full h-2.5 w-2.5',
            wrapper: 'relative bottom-0 -translate-y-8 z-[2]', 
            active: 'w-8 bg-primary-300 dark:bg-primary-400', 
            inactive: 'bg-white dark:bg-white' 
          } 
        }" class="w-[386px] min-w-[386px] lg:w-[486px] lg:min-w-[486px]" indicators>
        <PhotoSlide :ctrl-key="[...ctrlKey, 'AuthPhoto', imgSlug as ArbitraryControlElementMarker]" :alt-res-name="getI18nResName1('authFormsPhotoAlt')" :img-slug="imgSlug" :ui=" { image: ui?.image, wrapper: `w-full h-full` }"/>
      </UCarousel>
    </ErrorHelm>
  </div>
</template>

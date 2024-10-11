<script setup lang="ts">
import { AppConfig, getI18nResName1, HeaderAppVersion } from '@golobe-demo/shared';
//import { Pagination, Autoplay } from 'swiper/modules';
import AuthFormsPhoto from './../../components/account/photo-slide.vue';
import { type IImageDetailsDto, ApiEndpointAuthFormPhotos } from './../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { type Ref } from 'vue';
import { getCommonServices } from '../../helpers/service-accessors';
import type { UCarousel } from '../../.nuxt/components';

interface IProps {
  ctrlKey: string,
  increasedHeight?: boolean
}
defineProps<IProps>();

const isError = ref(false);
const logger = getCommonServices().getLogger();

const { enabled } = usePreviewState();

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
        logger.warn('(account-forms-photos) fetch request returned empty data');
        return;
      }
      const slugs = dto.map(x => x.slug);
      logger.verbose(`(account-forms-photos) received images details: [${slugs.join(', ') ?? 'empty'}]`);
      isError.value = false;
      return slugs;
    }
  });
watch(error, () => {
  if (error.value) {
    logger.warn('(account-forms-photos) fetch request failed', error.value);
    isError.value = true;
  }
});
if (error.value) {
  logger.warn('(account-forms-photos) fetch request failed', error.value);
  isError.value = true;
}
const imageSlugs = data as Ref<string[] | undefined>;

watch(() => imageSlugs.value, () => {
  if (imageSlugs.value) {
    isError.value = false;
  }
});

const carouselRef = shallowRef<InstanceType<typeof UCarousel> | undefined>();
let autoplayTimerHandle: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (!carouselRef.value) {
    logger.warn('(account-forms-photos) failed to set autoplay timer, carousel is not initalized');  
    return;
  }

  logger.debug('(account-forms-photos) setting up autoplay timer');
  autoplayTimerHandle = setInterval(() => {
    if (carouselRef.value.page === carouselRef.value.pages) {
      return carouselRef.value.select(0);
    }

    carouselRef.value.next();
  }, AppConfig.sliderAutoplayPeriodMs);
});

onUnmounted(() => {
  if(autoplayTimerHandle) {
    logger.debug('(account-forms-photos) disposing autoplay timer');
    try {
      clearInterval(autoplayTimerHandle);
    } catch(err: any) {
      logger.warn('(account-forms-photos) failed to dispose autoplay timer', err);
    }
  }
});

</script>

<template>
  <div :class="`flex-grow-0 flex-shrink basis-auto hidden md:block w-[386px] lg:w-[486px] rounded-4xl ${increasedHeight ? 'h-[1054px]' : 'h-[812px]'}`" role="figure">
    <ErrorHelm :is-error="isError" class="rounded-4xl">
      <UCarousel
        v-if="imageSlugs?.length ?? 0 > 0" ref="carouselRef" v-slot="{ item: imgSlug }" :items="imageSlugs" 
        :ui="{ 
          item: 'snap-end', 
          indicators: { 
            base: 'rounded-full h-2.5 w-2.5',
            wrapper: 'relative bottom-0 -translate-y-8 z-[2]', 
            active: 'w-8 bg-primary-300 dark:bg-primary-400', 
            inactive: 'bg-white dark:bg-white' 
          } 
        }" class="w-[386px] lg:w-[486px]" indicators>
        <AuthFormsPhoto :ctrl-key="`${ctrlKey}-AuthPhoto-${imgSlug}`" :alt-res-name="getI18nResName1('authFormsPhotoAlt')" :img-slug="imgSlug" class="w-full h-full" :increased-height="increasedHeight"/>
      </UCarousel>
      <!--
      <Swiper
        v-if="imageSlugs?.length ?? 0 > 0"
        class="account-forms-photos-swiper brdr-6"
        :modules="[Pagination, Autoplay]"
        :slides-per-view="1"
        :pagination="{
          enabled: true,
          type: 'bullets',
          clickable: true
        }"
        :loop="false"
        :centered-slides="false"
        :allow-touch-move="true"
        :autoplay="{
          delay: 5000
        }"
      >
        <SwiperSlide
          v-for="(slug, index) in imageSlugs"
          :key="index"
        >
          <AuthFormsPhoto :ctrl-key="`${ctrlKey}-AuthPhoto-${index}`" :alt-res-name="getI18nResName1('authFormsPhotoAlt')" :img-slug="slug" />
        </SwiperSlide>
      </Swiper>
      -->
      
    </ErrorHelm>
  </div>
</template>

<script setup lang="ts">
import { AppConfig, getI18nResName1, HeaderAppVersion } from '@golobe-demo/shared';
import { Pagination, Autoplay } from 'swiper/modules';
import AuthFormsPhoto from './../../components/account/photo-slide.vue';
import { type IImageDetailsDto, ApiEndpointAuthFormPhotos } from './../../server/api-definitions';
import { usePreviewState } from './../../composables/preview-state';
import { type Ref } from 'vue';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: string
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

onMounted(() => {
});

</script>

<template>
  <div class="account-forms-photos brdr-6" role="figure">
    <ErrorHelm :is-error="isError">
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
    </ErrorHelm>
  </div>
</template>

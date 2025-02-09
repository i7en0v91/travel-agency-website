<script setup lang="ts">
import { ImageCategory, type Timestamp, getI18nResName2 } from '@golobe-demo/shared';
import type { TravelDetailsImageStatus } from './../../../types';
import { formatImageUrl } from './../../../helpers/dom';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  slug?: string,
  timestamp?: Timestamp,
  status?: TravelDetailsImageStatus
};
const { ctrlKey, timestamp, slug, status = 'loading' } = defineProps<IProps>();

const logger = getCommonServices().getLogger();

const systemConfigurationStore = useSystemConfigurationStore();
const { enabled } = usePreviewState();

const image = useTemplateRef('img-component');
const $emit = defineEmits<{(event: 'update:status', status?: TravelDetailsImageStatus): void}>();

function fireStatusChange (newStatus: TravelDetailsImageStatus) {
  if (!status || newStatus !== status) {
    logger.debug(`(TravelDetailsImageFrame) status changed: ctrlKey=${ctrlKey}, new status=${newStatus}, prev status=${status}`);
    $emit('update:status', newStatus);
  } else {
    logger.debug(`(TravelDetailsImageFrame) wont fire status change as it is still the same: ctrlKey=${ctrlKey}, status=${newStatus}`);
  }
}

function getImgUrl (slug?: string, timestamp?: Timestamp): string | undefined {
  if(!slug) {
    return undefined;
  }
  return formatImageUrl(slug!, ImageCategory.TravelBlock, timestamp, 1, enabled);
};
const imgUrl = computed(() => { return getImgUrl(slug, timestamp); });

const fadeIn = ref<boolean | undefined>(undefined);
const styleClass = computed(() => {
  if (!slug && !status) {
    return '';
  }
  if (!slug) {
    return 'z-[2]';
  }
  if (status === 'loading' || status === 'error') {
    return 'z-[2]';
  }
  return 'z-[3]';
});

function onLoad () {
  logger.debug(`(TravelDetailsImageFrame) image loaded, current url=${imgUrl.value}`);
  fireStatusChange('ready');
}

function onError (err: any) {
  logger.warn(`(TravelDetailsImageFrame) image load failed, current url=${imgUrl.value}`, err);
  fireStatusChange('error');
}

watch(() => slug, () => {
  const newUrl = getImgUrl(slug, timestamp);
  if (!newUrl || newUrl !== image.value?.src) {
    logger.debug(`(TravelDetailsImageFrame) image url changed, new url=${newUrl}, prev url=${image.value?.src}`);
    fadeIn.value = false;
    fireStatusChange('loading');
  }
});

const imageSize = await systemConfigurationStore.getImageSrcSize(ImageCategory.TravelBlock);

</script>

<template>
  <div :class="`w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 z-[1] rounded-2xl ${styleClass}`">
    <nuxt-img
      v-if="imgUrl"
      ref="img-component"
      :src="imgUrl"
      fit="cover"
      :width="imageSize.width"
      :height="imageSize.height"
      sizes="xs:100vw sm:50vw md:50vw lg:50vw xl:50vw"
      provider="entity"
      class="w-full h-full object-cover rounded-2xl"
      :modifiers="{ imgSrcSize: imageSize }"
      :alt="$t(getI18nResName2('travelDetails','travelImgAlt'))"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

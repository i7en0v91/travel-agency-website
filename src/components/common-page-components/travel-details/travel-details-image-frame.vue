<script setup lang="ts">
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, ImageCategory, type Timestamp, getI18nResName2 } from '@golobe-demo/shared';
import type { TravelDetailsImageStatus } from './../../../types';
import { ApiEndpointImage } from './../../../server/api-definitions';
import { usePreviewState } from './../../../composables/preview-state';
import { withQuery } from 'ufo';
import set from 'lodash-es/set';
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
  const query = {
    ...(timestamp ? { t: timestamp } : {}),
    ...(enabled ? set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue) : {}),
    slug, 
    category: ImageCategory.TravelBlock.valueOf(),
  };
  return withQuery(`/${ApiEndpointImage}`, query);
};
const imgUrl = computed(() => { return getImgUrl(slug, timestamp); });

const fadeIn = ref<boolean | undefined>(undefined);
const cssClass = computed(() => {
  if (!slug && !status) {
    return 'initializing';
  }
  if (!slug) {
    return 'initialized';
  }
  if (status === 'loading' || status === 'error') {
    return 'initialized';
  }
  return 'initialized loaded';
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
  <div :class="`travel-details-frame brdr-3 ${cssClass}`">
    <nuxt-img
      v-if="imgUrl"
      ref="img-component"
      :src="imgUrl"
      fit="cover"
      :width="imageSize.width"
      :height="imageSize.height"
      sizes="xs:100vw sm:50vw md:50vw lg:50vw xl:50vw"
      provider="entity"
      :modifiers="{ imgSrcSize: imageSize }"
      :alt="$t(getI18nResName2('travelDetails','travelImgAlt'))"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

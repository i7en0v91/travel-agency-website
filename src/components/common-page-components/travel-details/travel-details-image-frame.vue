<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { ImageCategory, type Timestamp, getI18nResName2 } from '@golobe-demo/shared';
import type { TravelDetailsImageStatus } from './../../../types';
import { formatImageUrl } from './../../../helpers/dom';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  slug?: string,
  timestamp?: Timestamp,
  status?: TravelDetailsImageStatus
};
const { ctrlKey, timestamp, slug, status = 'loading' } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelDetailsImageFrame' });

const systemConfigurationStore = useSystemConfigurationStore();
const { enabled } = usePreviewState();

const image = useTemplateRef('img-component');
const $emit = defineEmits<{(event: 'update:status', status?: TravelDetailsImageStatus): void}>();

function fireStatusChange (newStatus: TravelDetailsImageStatus) {
  if (!status || newStatus !== status) {
    logger.debug('status changed', { ctrlKey, newStatus, prevStatus: status });
    $emit('update:status', newStatus);
  } else {
    logger.debug('wont fire status change as it is still the same', { ctrlKey, status: newStatus });
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
  logger.debug('image loaded, current', { url: imgUrl.value });
  fireStatusChange('ready');
}

function onError (err: any) {
  logger.warn('image load failed, current', err, { url: imgUrl.value });
  fireStatusChange('error');
}

watch(() => slug, () => {
  const newUrl = getImgUrl(slug, timestamp);
  if (!newUrl || newUrl !== image.value?.src) {
    logger.debug('image url changed', { newUrl, prevUrl: image.value?.src });
    fadeIn.value = false;
    fireStatusChange('loading');
  }
});

const imageSize = systemConfigurationStore.imageCategories.find(x => x.kind === ImageCategory.TravelBlock)!;

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

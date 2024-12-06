<script setup lang="ts">
import { ImageCategory, type Timestamp, getI18nResName2 } from '@golobe-demo/shared';
import { type TravelDetailsImageStatus } from './../../../types';
import { formatImageUrl } from './../../../helpers/dom';
import { type ComponentInstance, type GlobalComponents } from 'vue';
import { usePreviewState } from './../../../composables/preview-state';
import { getCommonServices } from '../../../helpers/service-accessors';
type NuxtImg = GlobalComponents['NuxtImg'];

interface IProps {
  ctrlKey: string,
  slug?: string,
  timestamp?: Timestamp,
  status?: TravelDetailsImageStatus
};
const props = withDefaults(defineProps<IProps>(), {
  status: 'loading',
  slug: undefined,
  timestamp: undefined
});

const logger = getCommonServices().getLogger();

const systemConfigurationStore = useSystemConfigurationStore();
const { enabled } = usePreviewState();

const imgEl = shallowRef<ComponentInstance<NuxtImg>>();
const $emit = defineEmits<{(event: 'update:status', status?: TravelDetailsImageStatus): void}>();

function fireStatusChange (status: TravelDetailsImageStatus) {
  if (!props.status || status !== props.status) {
    logger.debug(`(TravelDetailsImageFrame) status changed: ctrlKey=${props.ctrlKey}, new status=${status}, prev status=${props.status}`);
    $emit('update:status', status);
  } else {
    logger.debug(`(TravelDetailsImageFrame) wont fire status change as it is still the same: ctrlKey=${props.ctrlKey}, status=${status}`);
  }
}

function getImgUrl (slug?: string, timestamp?: Timestamp): string | undefined {
  if(!slug) {
    return undefined;
  }
  return formatImageUrl(slug!, ImageCategory.TravelBlock, timestamp, 1, enabled);
};

const imgUrl = computed(() => { 
  return getImgUrl(props.slug, props.timestamp); 
});

const fadeIn = ref<boolean | undefined>(undefined);
const styleClass = computed(() => {
  if (!props.slug && !props.status) {
    return '';
  }
  if (!props.slug) {
    return 'z-[2]';
  }
  if (props.status === 'loading' || props.status === 'error') {
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

watch(() => props.slug, () => {
  const newUrl = getImgUrl(props.slug, props.timestamp);
  if (!newUrl || newUrl !== imgEl.value?.src) {
    logger.debug(`(TravelDetailsImageFrame) image url changed, new url=${newUrl}, prev url=${imgEl.value?.src}`);
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
      ref="imgEl"
      :src="imgUrl"
      fit="cover"
      :width="imageSize.width"
      :height="imageSize.height"
      sizes="xs:100vw sm:50vw md:50vw lg:50vw xl:50vw"
      provider="entity"
      class="w-full h-full rounded-2xl"
      :modifiers="{ imgSrcSize: imageSize }"
      :alt="$t(getI18nResName2('travelDetails','travelImgAlt'))"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

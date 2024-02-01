<script setup lang="ts">

import { ImageCategory, type TravelDetailsImageStatus, type Timestamp } from './../../shared/interfaces';
import { WebApiRoutes } from './../../shared/constants';
import { getI18nResName2 } from './../../shared/i18n';
import type { NuxtImg } from '#build/components';

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

const logger = CommonServicesLocator.getLogger();

const systemConfigurationStore = useSystemConfigurationStore();

const imgEl = ref<InstanceType<typeof NuxtImg>>();
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
  return slug ? `${WebApiRoutes.Image}?slug=${slug}&category=${ImageCategory.TravelBlock}${timestamp ? `&t=${timestamp}` : ''}` : undefined;
};
const imgUrl = computed(() => { return getImgUrl(props.slug, props.timestamp); });

const fadeIn = ref<boolean | undefined>(undefined);
const cssClass = computed(() => {
  if (!props.slug && !props.status) {
    return 'initializing';
  }
  if (!props.slug) {
    return 'initialized';
  }
  if (props.status === 'loading' || props.status === 'error') {
    return 'initialized';
  }
  if (props.status === 'ready') {
    if (fadeIn.value) {
      return 'initialized loaded fadein';
    } else {
      return 'initialized loaded';
    }
  }
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

function setFrame (isFront: boolean) {
  fadeIn.value = isFront;
}

defineExpose({
  setFrame
});

const imageSize = await systemConfigurationStore.getImageSrcSize(ImageCategory.TravelBlock);

</script>

<template>
  <div :class="`travel-details-frame brdr-3 ${cssClass}`">
    <nuxt-img
      v-if="imgUrl"
      ref="imgEl"
      :src="imgUrl"
      fit="cover"
      :width="imageSize.width"
      :height="imageSize.height"
      sizes="sm:100vw md:50vw lg:50vw xl:50vw xxl:50vw"
      provider="entity"
      :modifiers="{ imgSrcSize: imageSize }"
      :alt="$t(getI18nResName2('travelDetails','travelImgAlt'))"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

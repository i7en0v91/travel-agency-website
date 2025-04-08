<!-- eslint-disable @typescript-eslint/unified-signatures -->
<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { ImageCategory, getI18nResName2, type Timestamp, type EntityId } from '@golobe-demo/shared';
import type { ITravelDetailsData, TravelDetailsImageStatus } from './../../../types';
import type { WatchStopHandle } from 'vue';
import TravelDetailsImageFrame from './travel-details-image-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  imageIndex: number, // from 0 to 3
  currentStatus?: TravelDetailsImageStatus,
  upcomingStatus?: TravelDetailsImageStatus
};
const { ctrlKey, imageIndex, currentStatus, upcomingStatus } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelDetailsImage' });
const activeFrame = ref<'initial' | 'A' | 'B'>('initial');
const frameStatusA = ref<TravelDetailsImageStatus | undefined>();
const frameStatusB = ref<TravelDetailsImageStatus | undefined>();
const isError = ref(false);
const staticImageHidden = ref(false);
const framesActivated = ref(false);

const dataBufInitial = ref<{ slug: string, timestamp: Timestamp, cityId: EntityId } | undefined>();
const dataBuf1 = ref<{ slug: string, timestamp: Timestamp, cityId: EntityId } | undefined>();
const dataBuf2 = ref<{ slug: string, timestamp: Timestamp, cityId: EntityId } | undefined>();

const watches: WatchStopHandle[] = [];

 
const $emit = defineEmits<{
  (event: 'update:currentStatus', status?: TravelDetailsImageStatus): void,
  (event: 'update:upcomingStatus', status?: TravelDetailsImageStatus): void
}>();

function swapFrames () {
  logger.debug('swapping frames', { ctrlKey, activeFrame: activeFrame.value, statusA: frameStatusA.value, statusB: frameStatusB.value });
  switch (activeFrame.value) {
    case 'initial':
      activeFrame.value = 'A';
      nextTick(() => { framesActivated.value = true; });
      break;
    case 'A':
      activeFrame.value = 'B';
      break;
    case 'B':
      staticImageHidden.value = true;
      activeFrame.value = 'A';
      break;
  }
}

function getCurrentCityId () : EntityId | undefined {
  switch (activeFrame.value) {
    case 'initial':
      return dataBufInitial.value?.cityId;
    case 'A':
      return dataBuf2.value?.cityId;
    case 'B':
      return dataBuf1.value?.cityId;
  }
}

function getUpcomingCityId () : EntityId | undefined {
  switch (activeFrame.value) {
    case 'initial':
      return dataBuf2.value?.cityId;
    case 'A':
      return dataBuf1.value?.cityId;
    case 'B':
      return dataBuf2.value?.cityId;
  }
}

function isInitialFrame () : boolean {
  return activeFrame.value === 'initial';
}

defineExpose({
  swapFrames,
  getCurrentCityId,
  getUpcomingCityId,
  isInitialFrame
});

const travelDetailsStore = useTravelDetailsStore();

function fireStatusChange (kind: 'current' | 'upcoming', status: TravelDetailsImageStatus) {
  const propsStatus = kind === 'current' ? currentStatus : upcomingStatus;
  if (!propsStatus || status !== propsStatus) {
    logger.debug('status changed', { ctrlKey, kind, newStatus: status, prevStatus: propsStatus });
    if (kind === 'current') {
      $emit('update:currentStatus', status);
    } else {
      $emit('update:upcomingStatus', status);
    }
  } else {
    logger.debug('wont fire status change as it is still the same', { ctrlKey, kind, status });
  }
}

if (import.meta.client) {
  await startWatchingForDataChanges();
}

if (travelDetailsStore.current?.images && imageIndex < travelDetailsStore.current.images.length) {
  onInitialDataReady(travelDetailsStore.current);
} else if (import.meta.server) {
  isError.value = true;
  fireStatusChange('current', 'error');
}

function onImageFrameStatusChanged () {
  logger.debug('image frame status changed', { ctrlKey, activeFrame: activeFrame.value, statusA: frameStatusA.value, statusB: frameStatusB.value });
  switch (activeFrame.value) {
    case 'initial':
      fireStatusChange('upcoming', frameStatusA.value ?? 'loading');
      break;
    case 'A':
      fireStatusChange('current', frameStatusA.value ?? 'loading');
      fireStatusChange('upcoming', frameStatusB.value ?? 'loading');
      break;
    case 'B':
      fireStatusChange('current', frameStatusB.value ?? 'loading');
      fireStatusChange('upcoming', frameStatusA.value ?? 'loading');
      break;
  }
}

function onUpcomingDataChanged (data: Partial<ITravelDetailsData> | undefined) {
  logger.verbose('upcoming data changed', { ctrlKey, activeFrame: activeFrame.value, statusA: frameStatusA.value, statusB: frameStatusB.value, cityId: data?.cityId, numImages: data?.images?.length ?? 0 });
  if (data?.cityId && data?.images) {
    if (imageIndex < data.images.length) {
      const receivingBuf = activeFrame.value !== 'A' ? dataBuf2 : dataBuf1;
      if (receivingBuf.value?.cityId !== data.cityId) {
        receivingBuf.value = {
          cityId: data.cityId,
          slug: data.images[imageIndex].slug,
          timestamp: data.images[imageIndex].timestamp
        };
        fireStatusChange('upcoming', 'loading');
      } else {
        const upcomingStatus = activeFrame.value !== 'A' ? frameStatusA.value : frameStatusB.value;
        logger.debug('refiring upcoming status', { ctrlKey, upcomingStatus });
        $emit('update:upcomingStatus', upcomingStatus);
      }
    } else {
      logger.warn('image index exceeds number of images in received upcoming data', undefined, { ctrlKey, imgIdx: imageIndex, cityId: data.cityId });
      fireStatusChange('upcoming', 'error');
    }
  } else if (data?.cityId) {
    fireStatusChange('upcoming', 'loading');
  } else {
    fireStatusChange('upcoming', 'ready');
  }
}

function onInitialDataReady (data: ITravelDetailsData) {
  logger.verbose('initial data ready', { ctrlKey, activeFrame: activeFrame.value, statusA: frameStatusA.value, statusB: frameStatusB.value });
  if (activeFrame.value !== 'initial' || dataBufInitial.value) {
    logger.verbose('initial data has been already processed', { ctrlKey, activeFrame: activeFrame.value, statusA: frameStatusA.value, statusB: frameStatusB.value });
    return;
  }

  if (data.images) {
    if (imageIndex < data.images.length) {
      dataBufInitial.value = {
        cityId: data.cityId,
        slug: data.images[imageIndex].slug,
        timestamp: data.images[imageIndex].timestamp
      };
      fireStatusChange('current', 'loading');
    } else {
      logger.warn('image index exceeds number of images in received initial data', undefined, { ctrlKey, imgIdx: imageIndex, cityId: data.cityId });
      fireStatusChange('current', 'error');
    }
  }
}

async function startWatchingForDataChanges () : Promise<void> {
  logger.verbose('starting to watch for data changes', ctrlKey);

  watches.push(watch([() => travelDetailsStore.upcoming?.cityId, () => travelDetailsStore.upcoming?.images], () => {
    onUpcomingDataChanged(travelDetailsStore.upcoming);
  }));

  watches.push(watch([frameStatusA, frameStatusB], () => {
    onImageFrameStatusChanged();
  }));

  if (!travelDetailsStore.current?.cityId) {
    watches.push(watch([() => travelDetailsStore.current?.cityId], () => {
      onInitialDataReady(travelDetailsStore.current!);
    }));
  }
}

function stopWatchingForDataChanges () {
  logger.verbose('stopping to watch for data changes', ctrlKey);
  watches.forEach(sw => sw());
}

function onStaticImageReady () {
  logger.debug('static image ready', ctrlKey);
  if (activeFrame.value === 'initial') {
    fireStatusChange('current', 'ready');
  } else {
    logger.debug('static image ready fired when static image was not acitve', ctrlKey);
  }
}

function onStaticImageFailed () {
  if (activeFrame.value === 'initial') {
    logger.warn('static image failed', undefined, ctrlKey);
    fireStatusChange('current', 'error');
  } else {
    logger.debug('static image failed fired when static image was not acitve', ctrlKey);
  }
}

onBeforeUnmount(() => {
  stopWatchingForDataChanges();
});

</script>

<template>
  <div class="travel-details-image">
    <ErrorHelm :is-error="isError">
      <div class="travel-details-frame-container">
        <StaticImage
          v-if="!staticImageHidden"
          :ctrl-key="[...ctrlKey, 'TravelDetails', 'StaticImg', 1]"
          :src="dataBufInitial?.slug ? { slug: dataBufInitial!.slug, timestamp: dataBufInitial!.timestamp } : undefined"
          :category="ImageCategory.TravelBlock"
          sizes="xs:100vw sm:50vw md:50vw lg:50vw xl:50vw"
          class="travel-details-frame"
          :style="{ display: 'block' }"
          :alt="{ resName: getI18nResName2('travelDetails','travelImgAlt') }"
          stub="default"
          @image-ready="onStaticImageReady"
          @image-failed="onStaticImageFailed"
        />
        <Transition name="travel-details-fade">
          <TravelDetailsImageFrame
            v-show="activeFrame === 'A'"
            v-model:status="frameStatusA"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'StaticImg', 2]"
            :slug="dataBuf2?.slug"
            :timestamp="dataBuf2?.timestamp"
            :class="framesActivated ? 'frames-activated' : 'frames-not-activated'"
          />
        </Transition>
        <Transition name="travel-details-fade">
          <TravelDetailsImageFrame
            v-show="activeFrame === 'B'"
            v-model:status="frameStatusB"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'StaticImg', 3]"
            :slug="dataBuf1?.slug"
            :timestamp="dataBuf1?.timestamp"
          />
        </Transition>
      </div>
    </ErrorHelm>
  </div>
</template>

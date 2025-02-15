<!-- eslint-disable @typescript-eslint/unified-signatures -->
<script setup lang="ts">
import { ImageCategory, getI18nResName2, type Timestamp, type EntityId } from '@golobe-demo/shared';
import type { ITravelDetailsData, TravelDetailsImageStatus } from './../../../types';
import type { WatchStopHandle } from 'vue';
import TravelDetailsImageFrame from './travel-details-image-frame.vue';
import TravelDetailsFrameContainer from './travel-details-frame-container.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { TravelDetails } from '../../../client/vue-transitions';

interface IProps {
  ctrlKey: string,
  imageIndex: number, // from 0 to 3
  currentStatus?: TravelDetailsImageStatus,
  upcomingStatus?: TravelDetailsImageStatus
};
const { ctrlKey, imageIndex, currentStatus, upcomingStatus } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
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
  logger.debug(`(TravelDetailsImage) swapping frames: ctrlKey=${ctrlKey}, activeFrame=${activeFrame.value}, frameA status=${frameStatusA.value}, frameB status=${frameStatusB.value}`);
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
    logger.debug(`(TravelDetailsImage) ${kind} status changed: ctrlKey=${ctrlKey}, new status=${status}, prev status=${propsStatus}`);
    if (kind === 'current') {
      $emit('update:currentStatus', status);
    } else {
      $emit('update:upcomingStatus', status);
    }
  } else {
    logger.debug(`(TravelDetailsImage) wont fire ${kind} status change as it is still the same: ctrlKey=${ctrlKey}, status=${status}`);
  }
}

if (import.meta.client) {
  await startWatchingForDataChanges();
}

const storeInstance = await (travelDetailsStore.getInstance());
if (storeInstance.current?.images && imageIndex < storeInstance.current.images.length) {
  onInitialDataReady(storeInstance.current);
} else if (import.meta.server) {
  isError.value = true;
  fireStatusChange('current', 'error');
}

function onImageFrameStatusChanged () {
  logger.debug(`(TravelDetailsImage) image frame status changed: ctrlKey=${ctrlKey}, activeFrame=${activeFrame.value}, frameA status=${frameStatusA.value}, frameB status=${frameStatusB.value}`);
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

function onUpcomingDataChanged (data?: ITravelDetailsData | undefined) {
  logger.verbose(`(TravelDetailsImage) upcoming data changed: ctrlKey=${ctrlKey}, activeFrame=${activeFrame.value}, frameA status=${frameStatusA.value}, frameB status=${frameStatusB.value}, cityId=${data?.cityId}, numImages=${data?.images?.length ?? 0}`);
  if (data?.images) {
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
        logger.debug(`(TravelDetailsImage) refiring upcoming status: ctrlKey=${ctrlKey}, upcomingStatus=${upcomingStatus}`);
        $emit('update:upcomingStatus', upcomingStatus);
      }
    } else {
      logger.warn(`(TravelDetailsImage) image index exceeds number of images in received upcoming data: ctrlKey=${ctrlKey}, imgIdx=${imageIndex}, cityId=${data.cityId}`);
      fireStatusChange('upcoming', 'error');
    }
  } else if (data?.cityId) {
    fireStatusChange('upcoming', 'loading');
  } else {
    fireStatusChange('upcoming', 'ready');
  }
}

function onInitialDataReady (data: ITravelDetailsData) {
  logger.verbose(`(TravelDetailsImage) initial data ready: ctrlKey=${ctrlKey}, activeFrame=${activeFrame.value}, frameA status=${frameStatusA.value}, frameB status=${frameStatusB.value}`);
  if (activeFrame.value !== 'initial' || dataBufInitial.value) {
    logger.verbose(`(TravelDetailsImage) initial data has been already processed: ctrlKey=${ctrlKey}, activeFrame=${activeFrame.value}, frameA status=${frameStatusA.value}, frameB status=${frameStatusB.value}`);
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
      logger.warn(`(TravelDetailsImage) image index exceeds number of images in received initial data: ctrlKey=${ctrlKey}, imgIdx=${imageIndex}, cityId=${data.cityId}`);
      fireStatusChange('current', 'error');
    }
  }
}

async function startWatchingForDataChanges () : Promise<void> {
  logger.verbose(`(TravelDetailsImage) starting to watch for data changes: ctrlKey=${ctrlKey}`);

  const storeInstance = await (travelDetailsStore.getInstance());
  watches.push(watch([() => storeInstance.upcoming?.cityId, () => storeInstance.upcoming?.images], () => {
    onUpcomingDataChanged(storeInstance.upcoming);
  }));

  watches.push(watch([frameStatusA, frameStatusB], () => {
    onImageFrameStatusChanged();
  }));

  if (!storeInstance.current?.cityId) {
    watches.push(watch([() => storeInstance.current?.cityId], () => {
      onInitialDataReady(storeInstance.current!);
    }));
  }
}

function stopWatchingForDataChanges () {
  logger.verbose(`(TravelDetailsImage) stopping to watch for data changes: ctrlKey=${ctrlKey}`);
  watches.forEach(sw => sw());
}

function onStaticImageReady () {
  logger.debug(`(TravelDetailsImage) static image ready: ctrlKey=${ctrlKey}`);
  if (activeFrame.value === 'initial') {
    fireStatusChange('current', 'ready');
  } else {
    logger.debug(`(TravelDetailsImage) static image ready fired when static image was not acitve: ctrlKey=${ctrlKey}`);
  }
}

function onStaticImageFailed () {
  if (activeFrame.value === 'initial') {
    logger.warn(`(TravelDetailsImage) static image failed: ctrlKey=${ctrlKey}`);
    fireStatusChange('current', 'error');
  } else {
    logger.debug(`(TravelDetailsImage) static image failed fired when static image was not acitve: ctrlKey=${ctrlKey}`);
  }
}

onBeforeUnmount(() => {
  stopWatchingForDataChanges();
});

</script>

<template>
  <div class="w-full aspect-traveldetails rounded-2xl">
    <ErrorHelm v-model:is-error="isError">
      <TravelDetailsFrameContainer>
        <StaticImage
          v-if="!staticImageHidden"
          :ctrl-key="`${ctrlKey}-TravelDetailsImage-Initial`"
          :entity-src="dataBufInitial?.slug ? { slug: dataBufInitial!.slug, timestamp: dataBufInitial!.timestamp } : undefined"
          :category="ImageCategory.TravelBlock"
          sizes="xs:100vw sm:50vw md:50vw lg:50vw xl:50vw"
          :ui="{ 
            wrapper: 'block rounded-2xl w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 z-[1]', 
            stub: 'rounded-2xl',
            img: 'rounded-2xl object-cover' 
          }"
          :alt-res-name="getI18nResName2('travelDetails','travelImgAlt')"
          :show-stub="true"
          @image-ready="onStaticImageReady"
          @image-failed="onStaticImageFailed"
        />
        <Transition v-bind="TravelDetails">
          <TravelDetailsImageFrame
            v-show="activeFrame === 'A'"
            v-model:status="frameStatusA"
            :ctrl-key="`${ctrlKey}-TravelDetailsImage-FrameA`"
            :slug="dataBuf2?.slug"
            :timestamp="dataBuf2?.timestamp"
            :class="framesActivated ? '' : 'invisible'"
          />
        </Transition>
        <Transition v-bind="TravelDetails">
          <TravelDetailsImageFrame
            v-show="activeFrame === 'B'"
            v-model:status="frameStatusB"
            :ctrl-key="`${ctrlKey}-TravelDetailsImage-FrameB`"
            :slug="dataBuf1?.slug"
            :timestamp="dataBuf1?.timestamp"
          />
        </Transition>
      </TravelDetailsFrameContainer>
    </ErrorHelm>
  </div>
</template>

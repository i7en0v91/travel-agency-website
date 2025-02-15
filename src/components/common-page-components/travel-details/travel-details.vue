<script setup lang="ts">
import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import type { TravelDetailsImageStatus } from './../../../types';
import { defaultErrorHandler } from './../../../helpers/exceptions';
import type { WatchStopHandle, ComponentInstance } from 'vue';
import range from 'lodash-es/range';
import TravelDetailsTexting from './travel-details-texting.vue';
import TravelDetailsImage from './travel-details-image.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay'
};
const { ctrlKey, bookKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const travelDetailsStore = useTravelDetailsStore();
const isError = ref(false);

const textingComponent = useTemplateRef('texting-component');
const imageComponents = useTemplateRef<ComponentInstance<typeof TravelDetailsImage>[]>('image-components');
const imagesCurrentStatuses = range(0, 4).map((_: any) => ref<TravelDetailsImageStatus | undefined>());
const imagesUpcomingStatuses = range(0, 4).map((_: any) => ref<TravelDetailsImageStatus | undefined>());

let storeInstance : Awaited<ReturnType<typeof travelDetailsStore.getInstance>> | undefined;
try {
  storeInstance = await travelDetailsStore.getInstance();
  isError.value = storeInstance.isError;
} catch (err: any) {
  if(import.meta.server && AppException.isAppException(err) && err.code === AppExceptionCodeEnum.OBJECT_NOT_FOUND) {
    defaultErrorHandler(err);
  };
  logger.warn(`(TravelDetails) failed to obtain travel details store, ctrlKey=${ctrlKey}`, err);
  isError.value = true;
}

const watches: WatchStopHandle[] = [];

function processCurrentStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug(`(TravelDetails) processCurrentStatusChanges, ctrlKey=${ctrlKey}`);
  const allImagesReady = imagesCurrentStatuses.every((s: Ref<TravelDetailsImageStatus | undefined>) => { return s.value === 'ready' || s.value === 'error'; });
  const initialFrame = imageComponents.value?.length && imageComponents.value!.every(f => f.isInitialFrame());
  if (allImagesReady && initialFrame) {
    logger.info(`(TravelDetails) all inital images have been preRendered, ctrlKey=${ctrlKey}, current cityId=${storeInstance.current?.cityId}`);
    storeInstance.onPreRenderCompleted(storeInstance.current!.cityId);
  }
}

function processUpcomingStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug(`(TravelDetails) processUpcomingStatusChanges, ctrlKey=${ctrlKey}`);
  if (imagesUpcomingStatuses.every((s: Ref<TravelDetailsImageStatus | undefined>) => s.value === 'ready' || s.value === 'error')) {
    const frames = imageComponents.value!;
    const toBeDisplayedCityId = frames[0].getUpcomingCityId();
    if (toBeDisplayedCityId && toBeDisplayedCityId === storeInstance.upcoming?.cityId) {
      logger.info(`(TravelDetails) all upcoming images have been preRendered, ctrlKey=${ctrlKey}, upcoming cityId=${toBeDisplayedCityId}, current cityId=${storeInstance.current?.cityId}`);
      for (let i = 0; i < frames.length; i++) {
        const imageFrame = frames[i];
        if (imageFrame.getUpcomingCityId() === toBeDisplayedCityId) {
          imageFrame.swapFrames();
        } else {
          logger.warn(`(TravelDetails) image frame is out of sync, ctrlKey=${ctrlKey}, frame's upcoming cityId=${imageFrame.getUpcomingCityId()}, store's upcoming cityId=${toBeDisplayedCityId}`);
        }
      }
      textingComponent.value!.swapFrames();
      storeInstance.onPreRenderCompleted(toBeDisplayedCityId);
    } else if (toBeDisplayedCityId) {
      logger.debug(`(TravelDetails) processUpcomingStatusChanges, prerendered city is out of sync, ctrlKey=${ctrlKey}, preRendered cityId=${toBeDisplayedCityId}, store upcoming cityId=${storeInstance.upcoming?.cityId}`);
    }
  } else {
    logger.debug(`(TravelDetails) processUpcomingStatusChanges, not all of upcoming frames completed prerendering, ctrlKey=${ctrlKey}, statuses=${JSON.stringify(imagesUpcomingStatuses.map((s: { value: any; }) => s.value))}`);
  }
}

if (import.meta.client && storeInstance) {
  storeInstance.onComponentAttached();
  watches.push(watch(() => storeInstance!.isError, () => {
    isError.value = storeInstance!.isError;
  }));
}

onUnmounted(() => {
  watches.forEach(sw => sw());
  (async () => {
    const storeInstance = await travelDetailsStore.getInstance();
    storeInstance.onComponentDetached();
  })();
});

onMounted(() => {
  nextTick(() => {
    watches.push(watch(imagesUpcomingStatuses, () => {
      processUpcomingStatusChanges();
    }));
    processUpcomingStatusChanges();

    watches.push(watch(imagesCurrentStatuses, () => {
      processCurrentStatusChanges();
    }));
    processCurrentStatusChanges();
  });
});

</script>

<template>
  <article class="w-full h-full xl:h-traveldtlsh grid gap-6 items-stretch grid-rows-travelxs grid-cols-travelxs travelsmd:grid-rows-travelsmd travelsmd:grid-cols-travelsmd md:grid-rows-travelmd md:grid-cols-travelmd xl:grid-rows-travelxl xl:grid-cols-travelxl">
    <TravelDetailsTexting ref="texting-component" :ctrl-key="`${ctrlKey}-TravelDetailsTexting`" :book-kind="bookKind" />
    <TravelDetailsImage
      v-for="(idx) in range(0, 4).map((i: any) => i)"
      ref="image-components"
      :key="`${ctrlKey}-TravelDetailsImage-${idx}`"
      :ctrl-key="`${ctrlKey}-TravelDetailsImage-${idx}`"
      :image-index="idx"
      @update:current-status="(status?: TravelDetailsImageStatus) => imagesCurrentStatuses[idx].value = status"
      @update:upcoming-status="(status?: TravelDetailsImageStatus) => imagesUpcomingStatuses[idx].value = status"
    />
  </article>  
</template>

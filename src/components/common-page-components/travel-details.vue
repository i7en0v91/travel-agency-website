<script setup lang="ts">

import type { WatchStopHandle } from 'vue';
import range from 'lodash/range';
import PageSection from './page-section.vue';
import TravelDetailsTexting from './travel-details-texting.vue';
import TravelDetailsImage from './travel-details-image.vue';
import { getI18nResName2 } from './../../shared/i18n';
import { type TravelDetailsImageStatus } from './../../shared/interfaces';
import { useTravelDetailsStore } from './../../stores/travel-details-store';
import { updateTabIndices } from './../../shared/dom';
import { TabIndicesUpdateDefaultTimeout } from './../../shared/constants';

interface IProps {
  ctrlKey: string
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const travelDetailsStore = useTravelDetailsStore();
const isError = ref(false);

const textingComponent = ref<InstanceType<typeof TravelDetailsTexting>>();
const imageComponents = ref<InstanceType<typeof TravelDetailsImage>[]>();
const imagesCurrentStatuses = range(0, 4).map(_ => ref<TravelDetailsImageStatus | undefined>());
const imagesUpcomingStatuses = range(0, 4).map(_ => ref<TravelDetailsImageStatus | undefined>());

let storeInstance : Awaited<ReturnType<typeof travelDetailsStore.getInstance>> | undefined;
try {
  storeInstance = await travelDetailsStore.getInstance();
  isError.value = storeInstance.isError;
} catch (err: any) {
  logger.warn(`(TravelDetails) failed to obtain travel details store, ctrlKey=${props.ctrlKey}`, err);
  isError.value = true;
}

const watches: WatchStopHandle[] = [];

function processCurrentStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug(`(TravelDetails) processCurrentStatusChanges, ctrlKey=${props.ctrlKey}`);
  const allImagesReady = imagesCurrentStatuses.every(s => s.value === 'ready' || s.value === 'error');
  const initialFrame = imageComponents.value && imageComponents.value!.every(f => f.isInitialFrame());
  if (allImagesReady && initialFrame) {
    logger.info(`(TravelDetails) all inital images have been preRendered, ctrlKey=${props.ctrlKey}, current cityId=${storeInstance.current?.cityId}`);
    storeInstance.onPreRenderCompleted(storeInstance.current!.cityId);
  }
}

function processUpcomingStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug(`(TravelDetails) processUpcomingStatusChanges, ctrlKey=${props.ctrlKey}`);
  if (imagesUpcomingStatuses.every(s => s.value === 'ready' || s.value === 'error')) {
    const frames = imageComponents.value!;
    const toBeDisplayedCityId = frames[0].getUpcomingCityId();
    if (toBeDisplayedCityId && toBeDisplayedCityId === storeInstance.upcoming?.cityId) {
      logger.info(`(TravelDetails) all upcoming images have been preRendered, ctrlKey=${props.ctrlKey}, upcoming cityId=${toBeDisplayedCityId}, current cityId=${storeInstance.current?.cityId}`);
      for (let i = 0; i < frames.length; i++) {
        const imageFrame = frames[i];
        if (imageFrame.getUpcomingCityId() === toBeDisplayedCityId) {
          imageFrame.swapFrames();
        } else {
          logger.warn(`(TravelDetails) image frame is out of sync, ctrlKey=${props.ctrlKey}, frame's upcoming cityId=${imageFrame.getUpcomingCityId()}, store's upcoming cityId=${toBeDisplayedCityId}`);
        }
      }
      textingComponent.value!.swapFrames();
      storeInstance.onPreRenderCompleted(toBeDisplayedCityId);
      setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
    } else if (toBeDisplayedCityId) {
      logger.debug(`(TravelDetails) processUpcomingStatusChanges, prerendered city is out of sync, ctrlKey=${props.ctrlKey}, preRendered cityId=${toBeDisplayedCityId}, store upcoming cityId=${storeInstance.upcoming?.cityId}`);
    }
  } else {
    logger.debug(`(TravelDetails) processUpcomingStatusChanges, not all of upcoming frames completed prerendering, ctrlKey=${props.ctrlKey}, statuses=${JSON.stringify(imagesUpcomingStatuses.map(s => s.value))}`);
  }
}

if (process.client && storeInstance) {
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
  <PageSection
    :ctrl-key="`${ctrlKey}-TravelDetails`"
    :header-res-name="getI18nResName2('travelDetails', 'title')"
    :subtext-res-name="getI18nResName2('travelCities', 'subtext')"
    :btn-text-res-name="getI18nResName2('travelCities', 'btn')"
    :content-padded="true"
    :is-error="isError"
  >
    <div class="travel-details">
      <TravelDetailsTexting ref="textingComponent" :ctrl-key="`${ctrlKey}-TravelDetailsTexting`" />
      <TravelDetailsImage
        v-for="(idx) in range(0, 4).map(i => i)"
        ref="imageComponents"
        :key="`${ctrlKey}-TravelDetailsImage-${idx}`"
        :ctrl-key="`${ctrlKey}-TravelDetailsImage-${idx}`"
        :image-index="idx"
        @update:current-status="(status?: TravelDetailsImageStatus) => imagesCurrentStatuses[idx].value = status"
        @update:upcoming-status="(status?: TravelDetailsImageStatus) => imagesUpcomingStatuses[idx].value = status"
      />
    </div>
  </PageSection>
</template>

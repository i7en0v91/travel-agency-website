<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../../helpers/components';
import { AppException, AppExceptionCodeEnum, getI18nResName2 } from '@golobe-demo/shared';
import type { TravelDetailsImageStatus } from './../../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import { defaultErrorHandler } from './../../../helpers/exceptions';
import type { WatchStopHandle, ComponentInstance } from 'vue';
import range from 'lodash-es/range';
import PageSection from './../page-section.vue';
import TravelDetailsTexting from './travel-details-texting.vue';
import TravelDetailsImage from './travel-details-image.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay'
};
const { ctrlKey, bookKind } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelDetails' });
const userNotificationStore = useUserNotificationStore();
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
    defaultErrorHandler(err, { nuxtApp: useNuxtApp(), userNotificationStore });
  };
  logger.warn('failed to obtain travel details store', err, ctrlKey);
  isError.value = true;
}

const watches: WatchStopHandle[] = [];

function processCurrentStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug('processCurrentStatusChanges', ctrlKey);
  const allImagesReady = imagesCurrentStatuses.every((s: Ref<TravelDetailsImageStatus | undefined>) => { return s.value === 'ready' || s.value === 'error'; });
  const initialFrame = imageComponents.value?.length && imageComponents.value!.every(f => f.isInitialFrame());
  if (allImagesReady && initialFrame) {
    logger.info('all inital images have been preRendered', { ctrlKey, cityId: storeInstance.current?.cityId });
    storeInstance.onPreRenderCompleted(storeInstance.current!.cityId);
  }
}

function processUpcomingStatusChanges () {
  if (!storeInstance) {
    return;
  }

  logger.debug('processUpcomingStatusChanges', ctrlKey);
  if (imagesUpcomingStatuses.every((s: Ref<TravelDetailsImageStatus | undefined>) => s.value === 'ready' || s.value === 'error')) {
    const frames = imageComponents.value!;
    const toBeDisplayedCityId = frames[0].getUpcomingCityId();
    if (toBeDisplayedCityId && toBeDisplayedCityId === storeInstance.upcoming?.cityId) {
      logger.info('all upcoming images have been preRendered', { ctrlKey, upcomingCityId: toBeDisplayedCityId, currentCityId: storeInstance.current?.cityId });
      for (let i = 0; i < frames.length; i++) {
        const imageFrame = frames[i];
        if (imageFrame.getUpcomingCityId() === toBeDisplayedCityId) {
          imageFrame.swapFrames();
        } else {
          logger.warn('image frame is out of sync', undefined, { ctrlKey, frameCityId: imageFrame.getUpcomingCityId(), storeCityId: toBeDisplayedCityId });
        }
      }
      textingComponent.value!.swapFrames();
      storeInstance.onPreRenderCompleted(toBeDisplayedCityId);
      setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
    } else if (toBeDisplayedCityId) {
      logger.debug('processUpcomingStatusChanges, prerendered city is out of sync', { ctrlKey, cityId: toBeDisplayedCityId, upcomingCityId: storeInstance.upcoming?.cityId });
    }
  } else {
    const statuses = imagesUpcomingStatuses.map((s: { value: any; }) => s.value);
    logger.debug('processUpcomingStatusChanges, not all of upcoming frames completed prerendering', { ctrlKey, statuses });
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
  <PageSection
    :ctrl-key="[...ctrlKey, 'TravelDetails']"
    :header-res-name="getI18nResName2('travelDetails', 'title')"
    :subtext-res-name="getI18nResName2('travelCities', 'subtext')"
    :btn-text-res-name="getI18nResName2('travelCities', 'btn')"
    :content-padded="true"
    :is-error="isError"
  >
    <article class="travel-details">
      <TravelDetailsTexting ref="texting-component" :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting']" :book-kind="bookKind" />
      <TravelDetailsImage
        v-for="(idx) in range(0, 4).map((i: any) => i)"
        ref="image-components"
        :key="`${toShortForm(ctrlKey)}-TravelDetailsImage-${idx}`"
        :ctrl-key="[...ctrlKey, 'TravelDetails', 'StaticImg', idx]"
        :image-index="idx"
        @update:current-status="(status?: TravelDetailsImageStatus) => imagesCurrentStatuses[idx].value = status"
        @update:upcoming-status="(status?: TravelDetailsImageStatus) => imagesUpcomingStatuses[idx].value = status"
      />
    </article>
  </PageSection>
</template>

<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import type { ITravelDetailsData, ITravelDetailsTextingData } from './../../../types';
import type { WatchStopHandle } from 'vue';
import TravelDetailsFrameContainer from './travel-details-frame-container.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { TravelDetails } from '../../../client/vue-transitions';

interface IProps {
  ctrlKey: ControlKey,
  bookKind: 'flight' | 'stay'
};
const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TravelDetailsTexting' });
const activeFrame = ref<'initial' | 'A' | 'B'>('initial');
const isError = ref(false);
const initialFrameHidden = ref(false);
const clientFramesActivated = ref(false);

const dataBufInitial = ref<ITravelDetailsTextingData | undefined>();
const dataBuf1 = ref<ITravelDetailsTextingData | undefined>();
const dataBuf2 = ref<ITravelDetailsTextingData | undefined>();

const watches: WatchStopHandle[] = [];

function swapFrames () {
  logger.debug('swapping frames', { ctrlKey, activeFrame: activeFrame.value });
  switch (activeFrame.value) {
    case 'initial':
      activeFrame.value = 'A';
      nextTick(() => { clientFramesActivated.value = true; });
      break;
    case 'A':
      activeFrame.value = 'B';
      initialFrameHidden.value = true;
      break;
    case 'B':
      activeFrame.value = 'A';
      break;
  }
}

function isInitialFrame () : boolean {
  return activeFrame.value === 'initial';
}

defineExpose({
  swapFrames,
  isInitialFrame
});

const travelDetailsStore = useTravelDetailsStore();

if (import.meta.client) {
  startWatchingForDataChanges();
}

if (travelDetailsStore.current?.texting) {
  onInitialDataReady(travelDetailsStore.current);
} else if (import.meta.server) {
  isError.value = true;
}

function onUpcomingDataChanged (data: Partial<ITravelDetailsData> | undefined) {
  logger.verbose('upcoming data changed', { ctrlKey, activeFrame: activeFrame.value });
  if (data?.texting) {
    (activeFrame.value !== 'A' ? dataBuf2 : dataBuf1).value = data.texting;
  }
}

function onInitialDataReady (data: ITravelDetailsData) {
  logger.verbose('initial data ready', { ctrlKey, activeFrame: activeFrame.value });
  if (activeFrame.value !== 'initial' || dataBufInitial.value) {
    logger.verbose('initial data has been already processed', { ctrlKey, activeFrame: activeFrame.value });
    return;
  }

  if (data.texting) {
    dataBufInitial.value = data.texting;
  }
}
function startWatchingForDataChanges () {
  logger.verbose('starting to watch for data changes', ctrlKey);

  watches.push(watch([() => travelDetailsStore.upcoming?.cityId, () => travelDetailsStore.upcoming?.texting], () => {
    onUpcomingDataChanged(travelDetailsStore.upcoming);
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

onBeforeUnmount(() => {
  stopWatchingForDataChanges();
});

const GridLayoutClass = `
row-start-1 row-end-2 col-start-1 col-end-2 
travelsmd:row-start-1 travelsmd:row-end-5 travelsmd:col-start-1 travelsmd:col-end-2 
md:row-start-1 md:row-end-2 md:col-start-1 md:col-end-3 
xl:row-start-1 xl:row-end-3 xl:col-start-1 xl:col-end-2 
`.replaceAll(/[\n\r\t]/g, '');

</script>

<template>
  <div :class="`w-full h-full xl:h-traveldtlsh ${GridLayoutClass} bg-primary-200 dark:bg-gray-700 rounded-xl`" role="article">
    <ErrorHelm v-model:is-error="isError">
      <TravelDetailsFrameContainer>
        <Transition v-bind="TravelDetails">
          <LazyTravelDetailsTextingFrame
            v-show="activeFrame === 'initial'"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 1]"
            :texting="dataBufInitial"
            :book-kind="bookKind"
            :is-initial="activeFrame === 'initial'"
          />
        </Transition>
        <Transition v-bind="TravelDetails">
          <LazyTravelDetailsTextingFrame
            v-show="activeFrame === 'A'"
            :book-kind="bookKind"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 2]"
            :texting="dataBuf2"
            :class="clientFramesActivated ? '' : 'invisible'"
          />
        </Transition>
        <Transition v-bind="TravelDetails">
          <LazyTravelDetailsTextingFrame
            v-show="activeFrame === 'B'"
            :book-kind="bookKind"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 3]"
            :texting="dataBuf1"
            :class="(clientFramesActivated && initialFrameHidden) ? '' : 'invisible'"
          />
        </Transition>
      </TravelDetailsFrameContainer>
    </ErrorHelm>
  </div>
</template>

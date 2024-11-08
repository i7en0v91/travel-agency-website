<script setup lang="ts">
import { type ITravelDetailsData, type ITravelDetailsTextingData } from './../../../types';
import type { WatchStopHandle, ComponentInstance } from 'vue';
import TravelDetailsTextingFrame from './travel-details-texting-frame.vue';
import TravelDetailsFrameContainer from './travel-details-frame-container.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { TravelDetails } from '../../../client/vue-transitions';

interface IProps {
  ctrlKey: string,
  bookKind: 'flight' | 'stay'
};
const props = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const activeFrame = ref<'initial' | 'A' | 'B'>('initial');
const elFrameA = shallowRef<ComponentInstance<typeof TravelDetailsTextingFrame>>();
const elFrameB = shallowRef<ComponentInstance<typeof TravelDetailsTextingFrame>>();
const isError = ref(false);
const initialFrameHidden = ref(false);
const clientFramesActivated = ref(false);

const dataBufInitial = ref<ITravelDetailsTextingData | undefined>();
const dataBuf1 = ref<ITravelDetailsTextingData | undefined>();
const dataBuf2 = ref<ITravelDetailsTextingData | undefined>();

const watches: WatchStopHandle[] = [];

function swapFrames () {
  logger.debug(`(TravelDetailsTexting) swapping frames: ctrlKey=${props.ctrlKey}, activeFrame=${activeFrame.value}`);
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
  await startWatchingForDataChanges();
}

const storeInstance = await (travelDetailsStore.getInstance());
if (storeInstance.current?.texting) {
  onInitialDataReady(storeInstance.current);
} else if (import.meta.server) {
  isError.value = true;
}

function onUpcomingDataChanged (data?: ITravelDetailsData | undefined) {
  logger.verbose(`(TravelDetailsTexting) upcoming data changed: ctrlKey=${props.ctrlKey}, activeFrame=${activeFrame.value}`);
  if (data?.texting) {
    (activeFrame.value !== 'A' ? dataBuf2 : dataBuf1).value = data.texting;
  }
}

function onInitialDataReady (data: ITravelDetailsData) {
  logger.verbose(`(TravelDetailsTexting) initial data ready: ctrlKey=${props.ctrlKey}, activeFrame=${activeFrame.value}`);
  if (activeFrame.value !== 'initial' || dataBufInitial.value) {
    logger.verbose(`(TravelDetailsTexting) initial data has been already processed: ctrlKey=${props.ctrlKey}, activeFrame=${activeFrame.value}`);
    return;
  }

  if (data.texting) {
    dataBufInitial.value = data.texting;
  }
}

async function startWatchingForDataChanges () : Promise<void> {
  logger.verbose(`(TravelDetailsTexting) starting to watch for data changes: ctrlKey=${props.ctrlKey}`);

  const storeInstance = await (travelDetailsStore.getInstance());
  watches.push(watch([() => storeInstance.upcoming?.cityId, () => storeInstance.upcoming?.texting], () => {
    onUpcomingDataChanged(storeInstance.upcoming);
  }));

  if (!storeInstance.current?.cityId) {
    watches.push(watch([() => storeInstance.current?.cityId], () => {
      onInitialDataReady(storeInstance.current!);
    }));
  }
}

function stopWatchingForDataChanges () {
  logger.verbose(`(TravelDetailsTexting) stopping to watch for data changes: ctrlKey=${props.ctrlKey}`);
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
  <div :class="`w-full h-full ${GridLayoutClass} bg-primary-200 dark:bg-gray-700 rounded-xl`" role="article">
    <ErrorHelm :is-error="isError">
      <TravelDetailsFrameContainer>
        <Transition v-bind="TravelDetails">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'initial'"
            :ctrl-key="`${ctrlKey}-TravelDetailsTexting-Initial`"
            :texting="dataBufInitial"
            :book-kind="bookKind"
            :is-initial="activeFrame === 'initial'"
          />
        </Transition>
        <Transition v-bind="TravelDetails">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'A'"
            ref="elFrameA"
            :book-kind="bookKind"
            :ctrl-key="`${ctrlKey}-TravelDetailsTexting-FrameA`"
            :texting="dataBuf2"
            :class="clientFramesActivated ? '' : 'invisible'"
          />
        </Transition>
        <Transition v-bind="TravelDetails">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'B'"
            ref="elFrameB"
            :book-kind="bookKind"
            :ctrl-key="`${ctrlKey}-TravelDetailsTexting-FrameB`"
            :texting="dataBuf1"
            :class="(clientFramesActivated && initialFrameHidden) ? '' : 'invisible'"
          />
        </Transition>
      </TravelDetailsFrameContainer>
    </ErrorHelm>
  </div>
</template>

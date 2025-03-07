<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import type { ITravelDetailsData, ITravelDetailsTextingData } from './../../../types';
import type { WatchStopHandle } from 'vue';
import TravelDetailsTextingFrame from './travel-details-texting-frame.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

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
  await startWatchingForDataChanges();
}

const storeInstance = await (travelDetailsStore.getInstance());
if (storeInstance.current?.texting) {
  onInitialDataReady(storeInstance.current);
} else if (import.meta.server) {
  isError.value = true;
}

function onUpcomingDataChanged (data?: ITravelDetailsData | undefined) {
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

async function startWatchingForDataChanges () : Promise<void> {
  logger.verbose('starting to watch for data changes', ctrlKey);

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
  logger.verbose('stopping to watch for data changes', ctrlKey);
  watches.forEach(sw => sw());
}

onBeforeUnmount(() => {
  stopWatchingForDataChanges();
});

</script>

<template>
  <div class="travel-details-texting brdr-3" role="article">
    <ErrorHelm :is-error="isError">
      <div class="travel-details-frame-container">
        <Transition name="travel-details-fade">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'initial'"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 1]"
            :texting="dataBufInitial"
            :book-kind="bookKind"
            :is-initial="activeFrame === 'initial'"
            :style="{ display: 'flex' }"
          />
        </Transition>
        <Transition name="travel-details-fade">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'A'"
            :book-kind="bookKind"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 2]"
            :texting="dataBuf2"
            :class="clientFramesActivated ? 'frames-activated' : 'frames-not-activated'"
          />
        </Transition>
        <Transition name="travel-details-fade">
          <TravelDetailsTextingFrame
            v-show="activeFrame === 'B'"
            :book-kind="bookKind"
            :ctrl-key="[...ctrlKey, 'TravelDetails', 'Texting', 3]"
            :texting="dataBuf1"
            :class="(clientFramesActivated && initialFrameHidden) ? 'frames-activated' : 'frames-not-activated'"
          />
        </Transition>
      </div>
    </ErrorHelm>
  </div>
</template>

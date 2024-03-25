<script setup lang="ts">

import type { YMap } from '@yandex/ymaps3-types';
import ComponentWaiterIndicator from './../../component-waiting-indicator.vue';
import { type IMapControlProps } from './../../../shared/interfaces';

const DefaultZoomLevel = 14;

const props = withDefaults(defineProps<IMapControlProps>(), {
  webUrl: undefined,
  cssClass: undefined
});

const logger = CommonServicesLocator.getLogger();

const map = ref<YMap>();

function onMapCreated (instance: YMap | undefined) {
  if (!instance) {
    logger.warn(`(YandexMaps) undefined instance in created callback, ctrlKey=${props.ctrlKey}`);
    return;
  }

  if (map.value) {
    logger.warn(`(YandexMaps) received creation callback with already initialized instance, ctrlKey=${props.ctrlKey}`);
    return;
  }

  logger.info(`(YandexMaps) received creation callback, ctrlKey=${props.ctrlKey}`);
  map.value = instance;
}

function formatWebUrl (): string {
  return `https://yandex.ru/maps/?ll=${props.origin.lon.toFixed(6)}%2C${props.origin.lat.toFixed(6)}&z=${DefaultZoomLevel}`;
}

// eslint-disable-next-line func-call-spacing
const $emit = defineEmits<{
  (event: 'update:webUrl', value: string): void,
  (event: 'onerror', err: any): void
}>();

$emit('update:webUrl', formatWebUrl());

</script>

<template>
  <div class="yandex-maps" :style="{width: '100%', height: 'auto'}">
    <div v-if="!map">
      <ComponentWaiterIndicator ctrl-key="YandexMap-InitializationWaiter" class="interactive-map-waiting-indicator" />
    </div>
    <div :style="map ? {width: '100%', height: 'auto'} : {width: '100%', height: 0, maxHeight: 0, overflowY: 'hidden'}">
      <YandexMap :coordinates="[props.origin.lat, props.origin.lon]" :zoom="DefaultZoomLevel" :class="cssClass" @created="onMapCreated">
        <YandexMarker :coordinates="[props.origin.lat, props.origin.lon]" :marker-id="`${ctrlKey}-origin`" type="Point" />
      </YandexMap>
    </div>
  </div>
</template>

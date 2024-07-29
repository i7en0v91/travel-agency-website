<script setup lang="ts">

import type { YMap } from '@yandex/ymaps3-types';
import { YandexMapHint, YandexMapControlButton, VueYandexMaps, YandexMapControls, YandexMapZoomControl, YandexMap, YandexMapDefaultMarker, YandexMapDefaultSchemeLayer, YandexMapDefaultFeaturesLayer } from 'vue-yandex-maps';
import isString from 'lodash-es/isString';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { type IMapControlProps } from './../../../shared/interfaces';
import { AppException, AppExceptionCodeEnum } from './../../../shared/exceptions';
import { getI18nResName3 } from './../../../shared/i18n';

const DefaultZoomLevel = 14;

const props = withDefaults(defineProps<IMapControlProps>(), {
  webUrl: undefined,
  cssClass: undefined
});

const { t } = useI18n();

const theme = useThemeSettings();
const logger = CommonServicesLocator.getLogger();

const map = shallowRef<YMap>();

const isFullscreen = ref(false);

const toggleFullscreen = () => {
  logger.verbose(`(YandexMaps) toggling fullscreen, current fullscreen mode=${isFullscreen.value}, ctrlKey=${props.ctrlKey}`);
  try {
    if (isFullscreen.value) {
      document.exitFullscreen();
    } else {
      map.value!.container.requestFullscreen();
    }
    logger.verbose(`(YandexMaps) fullscreen toggled, current fullscreen mode=${isFullscreen.value}, ctrlKey=${props.ctrlKey}`);
  } catch (err: any) {
    logger.warn(`(YandexMaps) failed to toggle fullscreen, mode=${isFullscreen.value}, ctrlKey=${props.ctrlKey}`, err);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to toggle fullscreen mode', 'error-stub');
  }
};

function onMapStatusChanged () {
  try {
    const isLoaded = VueYandexMaps.isLoaded.value;
    const loadError = VueYandexMaps.loadError.value;
    const loadStatus = VueYandexMaps.loadStatus.value;
    logger.verbose(`(YandexMaps) map status changed, ctrlKey=${props.ctrlKey}, isLoaded=${isLoaded}, loadStatus=${loadStatus}, hasException=${!!loadError}`);
    if (loadStatus === 'error' || loadError) {
      const errMsg = isString(loadError) ? loadError : ((loadError as any)?.message ?? '');
      logger.warn(`(YandexMaps) exception occured, mode=${isFullscreen.value}, ctrlKey=${props.ctrlKey}, isLoaded=${isLoaded}, loadStatus=${loadStatus}, errMsg=${errMsg}`, !isString(loadError) ? loadError : undefined);
      $emit('onerror', loadError);
    }
  } catch (err: any) {
    logger.warn(`(YandexMaps) exception occured while processing map status chage, mode=${isFullscreen.value}, ctrlKey=${props.ctrlKey}`, err);
    $emit('onerror', err);
  }
}

function formatWebUrl (): string {
  return `https://yandex.ru/maps/?ll=${props.origin.lon.toFixed(6)}%2C${props.origin.lat.toFixed(6)}&theme=${theme.currentTheme.value}&z=${DefaultZoomLevel}`;
}

 
const $emit = defineEmits<{
  (event: 'update:webUrl', value: string): void,
  (event: 'onerror', err: any): void
}>();

$emit('update:webUrl', formatWebUrl());

onMounted(() => {
  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  });

  watch([VueYandexMaps.isLoaded, VueYandexMaps.loadError, VueYandexMaps.loadStatus], () => {
    onMapStatusChanged();
  });
});

</script>

<template>
  <div class="yandex-maps" :style="{width: '100%', height: 'auto'}">
    <div v-if="!map">
      <ComponentWaitingIndicator ctrl-key="YandexMap-InitializationWaiter" class="interactive-map-waiting-indicator" />
    </div>
    <div :style="map ? {width: '100%', height: 'auto'} : {width: '100%', height: 0, maxHeight: 0, overflowY: 'hidden'}">
      <YandexMap v-model="map" :settings="{ location: { center: [props.origin.lon, props.origin.lat], zoom: DefaultZoomLevel }, showScaleInCopyrights: true, theme: theme.currentTheme.value, className: cssClass }">
        <YandexMapDefaultFeaturesLayer />
        <YandexMapDefaultSchemeLayer :settings="{ theme: theme.currentTheme.value }" />

        <YandexMapControls :settings="{ position: 'right' }">
          <YandexMapZoomControl />
        </YandexMapControls>

        <YandexMapControls :settings="{ position: 'top right', orientation: 'vertical' }">
          <YandexMapControlButton :settings="{ onClick: toggleFullscreen }">
            <div class="fullscreen" :class="{ 'exit-fullscreen': isFullscreen }" />
          </YandexMapControlButton>
        </YandexMapControls>

        <YandexMapDefaultMarker :settings="{ coordinates: [props.origin.lon, props.origin.lat], id: `${ctrlKey}-origin`, properties: { hint: t(getI18nResName3('stayDetailsPage', 'location', 'demoMarker')) }, color: theme.currentTheme.value === 'light' ? 'red' : '#A259FF', draggable: false }" />
        <YandexMapHint hint-property="hint">
          <template #default="{ content }">
            <div class="v-popper--theme-default-tooltip" :style="{ position: 'absolute', borderRadius: '4px', width: '250px', maxWidth: '250px', transform: 'translate(7px, -100%)' }">
              <span class="v-popper__inner" :style="{ display: 'block', borderRadius: '4px', width: 'auto', maxWidth: 'inherit', whiteSpace: 'normal', wordBreak: 'break-word' }">{{ content }}</span>
            </div>
          </template>
        </YandexMapHint>
      </YandexMap>
    </div>
  </div>
</template>

<style scoped>
.fullscreen {
  width: 26px;
  height: 26px;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cg fill='%236B6B6B'%3E%3Cpath d='M16.14 7.86L14.27 6H20v5.7l-1.83-1.82L15.04 13 13 10.98l3.13-3.13zm0 0M9.86 18.14L11.73 20H6v-5.7l1.83 1.82L10.96 13 13 15.02l-3.13 3.13zm0 0'/%3E%3C/g%3E%3C/svg%3E");
}

.exit-fullscreen {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cg fill='%236B6B6B'%3E%3Cpath d='M8.14 15.86L6.27 14H12v5.7l-1.83-1.83-3.13 3.14L5 18.98l3.13-3.13zm0 0M17.86 10.14L19.73 12H14V6.3l1.83 1.83 3.13-3.14L21 7.02l-3.13 3.13zm0 0'/%3E%3C/g%3E%3C/svg%3E");
}
</style>

<script setup lang="ts">
import type { ArbitraryControlElementMarker, ControlKey } from './../../helpers/components';
import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { WorldMapCityLabelFlipX } from './../../helpers/constants';
import throttle from 'lodash-es/throttle';
import clamp from 'lodash-es/clamp';
import WorldMapCityLabel from './world-map-city-label.vue';
import { useWorldMap } from './../../composables/world-map';
import { getCommonServices } from '../../helpers/service-accessors';

const MapPointColor = { r: 255, g: 255, b: 255 };
const MapPointAlphaRange = { from: 0.3, to: 0.6 };
const CityPointAlpha = 1.0;
const MapCityPointerColor = { r: 0, g: 0, b: 0 };
const MapCityPointerHeadSize = 10;
const MapCityPointerCurveness = 20;
const MapCityPointerLength = 55;

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();

const drawingCanvas = useTemplateRef('drawing-canvas');
const logger = getCommonServices().getLogger().addContextProps({ component: 'WorldMap' });

const worldMap = await useWorldMap().getInstance();
const worldMapRenderError = ref(false);

function getPointFillStyle (intensity: number | 'cityLabel'): string {
  const alpha = intensity === 'cityLabel' ? CityPointAlpha : (MapPointAlphaRange.from + (MapPointAlphaRange.to - MapPointAlphaRange.from) * clamp(intensity, 0.0, 1.0));
  return `rgba(${MapPointColor.r}, ${MapPointColor.g}, ${MapPointColor.b}, ${alpha.toFixed(2)})`;
}

function renderCityLabelPointer (ctx: CanvasRenderingContext2D, from: { x: number, y: number }, to: { x: number, y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y - 2 * MapCityPointerCurveness;
  const angle = Math.atan2(dy, dx);

  const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  gradient.addColorStop(0, `rgba(${MapCityPointerColor.r}, ${MapCityPointerColor.g}, ${MapCityPointerColor.b}, 0.0)`);
  gradient.addColorStop(1, `rgba(${MapCityPointerColor.r}, ${MapCityPointerColor.g}, ${MapCityPointerColor.b}, 1.0)`);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 + MapCityPointerCurveness, to.x, to.y);
  ctx.lineTo(to.x - MapCityPointerHeadSize * Math.cos(angle - Math.PI / 6), to.y - MapCityPointerHeadSize * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - MapCityPointerHeadSize * Math.cos(angle + Math.PI / 6), to.y - MapCityPointerHeadSize * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
  ctx.closePath();
}

function renderMapFrameSafe () {
  try {
    doRenderMapFrame();
  } catch (err: any) {
    if (!worldMapRenderError.value) {
      logger.warn('exception occured while redering world map', err);
      worldMapRenderError.value = true;
    }
  }
}

function doRenderMapFrame () {
  logger.debug('redering new frame');
  if (worldMap.displayedObjects.points.length === 0 || !worldMap.viewport.value) {
    logger.debug('nothing to render, world map was not initialized');
    return;
  }

  const canvasClientRect = drawingCanvas.value?.getClientRects();
  if ((canvasClientRect?.length ?? 0) === 0) {
    logger.debug('nothing to render, canvas element empty');
    return;
  }

  const ctx = drawingCanvas.value?.getContext('2d');
  if (!ctx) {
    logger.error('cannot acquire 2D context', undefined, ctrlKey);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot acquire 2D context', 'error-stub');
  }

  const animationCmd = worldMap.onPrepareNewFrame();

  const canvasSize = worldMap.viewport.value;
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  // KB: reset must be present, but may be not and it is a bug (e.g. reproduced on GNOME web 45.2)
  if (ctx.reset) {
    ctx.reset();
  }

  const pointRadius = worldMap.cellRelativeSize! * canvasSize.width / 2;
  for (let i = 0; i < worldMap.displayedObjects.points.length; i++) {
    const point = worldMap.displayedObjects.points[i];
    if (!point.visible) {
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = getPointFillStyle(point.colorIntensity);
    ctx.arc(canvasSize.width * point.coord.x, canvasSize.height * point.coord.y, pointRadius, 0, 3 * Math.PI);
    ctx.fill();
  }

  if (worldMap.displayedObjects.citiesVisible) {
    for (let i = 0; i < worldMap.displayedObjects.cities.length; i++) {
      const city = worldMap.displayedObjects.cities[i];
      const point = city.nearestPoint;

      const cityPointAbs = { x: canvasSize.width * point.coord.x, y: canvasSize.height * point.coord.y };
      renderCityLabelPointer(ctx, cityPointAbs, { x: cityPointAbs.x + (point.coord.x > WorldMapCityLabelFlipX ? -MapCityPointerLength : MapCityPointerLength), y: cityPointAbs.y + 3 });

      ctx.beginPath();
      ctx.fillStyle = getPointFillStyle('cityLabel');
      ctx.arc(cityPointAbs.x, cityPointAbs.y, pointRadius, 0, 3 * Math.PI);
      ctx.fill();
    }
  }

  if (animationCmd === 'continue-animation') {
    renderMapFrame();
  }
}

function renderMapFrame () {
  window.requestAnimationFrame(renderMapFrameSafe);
}

const onWindowResize = () => setTimeout(throttle(function () {
  renderMapFrame();
}), 100);

function testCanvasIsInViewport () : boolean {
  if (!drawingCanvas.value || !worldMap) {
    logger.debug('canvas in viewport test - not initialized');
    return false;
  }

  const rect = drawingCanvas.value.getBoundingClientRect();
  const html = document.documentElement;
  const result = ((rect.top > 0 && rect.top < (window.innerHeight || html.clientHeight)) ||
      (rect.bottom > 0 && rect.bottom < (window.innerHeight || html.clientHeight)) ||
      (rect.top > 0 && rect.bottom < (window.innerHeight || html.clientHeight)));
  logger.debug('canvas in viewport test completed', { result, canvasRect: rect });
  return result;
}

function raiseWorldMapInViewportIfNeeded () {
  if (!drawingCanvas.value || !worldMap) {
    return;
  }

  if (!worldMapInViewportEventRaised && testCanvasIsInViewport()) {
    worldMap.onMapInViewport();
    logger.verbose('world map entered the viewport');
    worldMapInViewportEventRaised = true;
    window.removeEventListener('scroll', onWindowScroll);
    renderMapFrame();
  }
}

const isServer = import.meta.server ?? false;
const isMounted = ref(false);
const cityLabelsVisibilityClass = computed(() => {
  if (isServer) {
    return 'invisible';
  }

  if (!isMounted.value) {
    return 'invisible';
  }

  return (worldMap.displayedObjects.citiesVisible ?? false) ? '' : 'invisible';
});

let worldMapInViewportEventRaised = false;
const onWindowScroll = () => setTimeout(throttle(function () {
  raiseWorldMapInViewportIfNeeded();
}), 100);

onMounted(() => {
  setTimeout(() => {
    worldMap.onPageOpen();
    raiseWorldMapInViewportIfNeeded();
    renderMapFrame();
    isMounted.value = true;
  }, 0);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onWindowScroll);
  watch([worldMap.status, worldMap.viewport], () => {
    raiseWorldMapInViewportIfNeeded();
    renderMapFrame();
  }, { immediate: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  if (!worldMapInViewportEventRaised) {
    window.removeEventListener('scroll', onWindowScroll);
  }
  if (worldMap) {
    worldMap.onPageLeave();
  }
});

</script>

<template>
  <div class="w-full min-h-worldmaph bg-primary-300 dark:bg-mintgreen-600">
    <ErrorHelm :is-error="(worldMap.status.value === 'error') || worldMapRenderError" :ui="{ stub: 'min-h-worldmaph rounded-none' }">
      <div class="overflow-x-auto overflow-y-hidden w-full h-full">
        <div class="aspect-worldmap grid grid-rows-1 grid-cols-1 min-w-worldmapw max-w-worldmapw md:w-full md:max-w-full">
          <canvas 
            id="worldMapCanvas" 
            ref="drawing-canvas" 
            :width="worldMap.viewport.value?.width" 
            :height="worldMap.viewport.value?.height" class="w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 z-[1]" 
          />
          <WorldMapCityLabel
            v-for="(city) in (worldMap.displayedObjects.cities ?? [])"
            :key="`world-map-city-${city.slug}`"
            :class="`row-start-1 row-end-2 col-start-1 col-end-2 z-[2] ${cityLabelsVisibilityClass}`"
            :slug="city.slug"
            :ctrl-key="['WorldMap', 'CityLabel', city.slug as ArbitraryControlElementMarker]"
            :city-name="city.cityDisplayName"
            :country-name="city.countryDisplayName"
            :img-src="{ slug: city.imgSlug, timestamp: city.timestamp }"
            :relative-coord="city.nearestPoint.coord"
          />
        </div>
      </div>
    </ErrorHelm>
  </div>
</template>

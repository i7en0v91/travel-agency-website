<script setup lang="ts">
import { AppException, AppExceptionCodeEnum, isElectronBuild, QueryInternalRequestParam } from '@golobe-demo/shared';
import { type IBookingTicketFlightGfxProps } from './../../types';
import throttle from 'lodash-es/throttle';
import { useThemeSettings } from './../../composables/theme-settings';
import BookingTicketFlightLabel from './booking-ticket-flight-label.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import CheckpointHighlight from '~/public/img/flight-region-highlight.svg';

const props = defineProps<IBookingTicketFlightGfxProps>();

declare type RGBColor = { r: number, g: number, b: number };
const FlightRouteColorLight: RGBColor = { r: 141, g: 211, b: 187 };
const FlightRouteColorDark: RGBColor = { r: 48, g: 153, b: 124 };
const FlightRouteVertexSize = 5;
const FlightRouteVertexPosAdj = 136 * 0.5;
const FlightRouteCurvenessOffset = -100;

const logger = getCommonServices().getLogger();

const canvasEl = shallowRef<HTMLCanvasElement>();
const containerEl = shallowRef<HTMLElement>();

const themeSettings = useThemeSettings();

const canvasSize = ref<{ width: number, height: number } | undefined>();
const isOffscreenRendering = import.meta.client && isElectronBuild() && (useRoute().query ?? {})[QueryInternalRequestParam] === '1';

function renderFrameSafe () {
  try {
    doRenderFrame();
  } catch (err: any) {
    logger.warn(`(BookingTicketFlightGfx) exception occured while redering frame, ctrlKey=${props.ctrlKey}`, err);
  }
}

function renderPoint (coords: { x: number, y: number }, color: RGBColor, radius: number, ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.arc(coords.x, coords.y, radius, 0, 3 * Math.PI);
  ctx.fill();
}

function renderFlightRoute (from: { x: number, y: number }, to: { x: number, y: number }, color: RGBColor, ctx: CanvasRenderingContext2D) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const curvenessOffset = { dx: -FlightRouteCurvenessOffset * Math.sin(angle), dy: FlightRouteCurvenessOffset * Math.cos(angle) };

  ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.setLineDash([10, 5]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo((from.x + to.x) / 2 + curvenessOffset.dx, (from.y + to.y) / 2 + curvenessOffset.dy, to.x, to.y);
  ctx.stroke();
  ctx.closePath();
}

function doRenderFrame () {
  logger.debug('(BookingTicketFlightGfx) redering new frame');
  if (!canvasSize.value) {
    logger.debug('(BookingTicketFlightGfx) nothing to render, world map was not initialized');
    return;
  }

  const canvasElClientRect = canvasEl.value?.getClientRects();
  if ((canvasElClientRect?.length ?? 0) === 0) {
    logger.debug('(BookingTicketFlightGfx) nothing to render, canvas element empty');
    return;
  }

  const ctx = canvasEl.value?.getContext('2d');
  if (!ctx) {
    logger.error(`(BookingTicketFlightGfx) cannot acquire 2D context, ctrlKey=${props.ctrlKey}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot acquire 2D context', 'error-stub');
  }

  const { w, h } = { w: canvasSize.value.width, h: canvasSize.value.height };
  ctx.clearRect(0, 0, w, h);
  // KB: reset must be present, but may be not and it is a bug (e.g. reproduced on GNOME web 45.2)
  if (ctx.reset) {
    ctx.reset();
  }

  const color: RGBColor = themeSettings.currentTheme.value === 'light' ? FlightRouteColorLight : FlightRouteColorDark;

  const fromPoint = { x: w * 0.1 + FlightRouteVertexPosAdj - 10, y: h * 0.93 - FlightRouteVertexPosAdj - 10 };
  const toPoint = { x: w * 0.9 - FlightRouteVertexPosAdj, y: h * 0.07 + FlightRouteVertexPosAdj + 10 };
  renderPoint(fromPoint, color, FlightRouteVertexSize, ctx);
  renderPoint(toPoint, color, FlightRouteVertexSize, ctx);
  renderFlightRoute(fromPoint, toPoint, color, ctx);
}

function renderMapFrame () {
  window.requestAnimationFrame(renderFrameSafe);
}

function updateCanvasSize () {
  logger.debug(`(BookingTicketFlightGfx) updating canvas size, ctrlKey=${props.ctrlKey}`);
  if (containerEl.value!) {
    const containerRect = containerEl.value.getBoundingClientRect();
    canvasSize.value = {
      width: containerRect.width,
      height: containerRect.height
    };
    logger.debug(`(BookingTicketFlightGfx) using canvas size w=${canvasSize.value.width}, h=${canvasSize.value.height}, ctrlKey=${props.ctrlKey}`);
  } else {
    logger.warn(`(BookingTicketFlightGfx) cannot update canvas size - container is not initialized, ctrlKey=${props.ctrlKey}`);
  }
}

watch(themeSettings.currentTheme, () => {
  setTimeout(renderMapFrame, 0);
});

const onWindowResize = () => setTimeout(throttle(function () {
  setTimeout(() => {
    updateCanvasSize();
    setTimeout(renderMapFrame, 0);
  }, 0);
}), 100);

onMounted(() => {
  setTimeout(() => {
    updateCanvasSize();
    setTimeout(renderMapFrame, 0);
  }, 0);
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});

const radialHighlightStyle = computed(() => {
  // TODO: rewrite to bg-radial-* after moving to Tailwind 4
   return { 
    background: themeSettings.currentTheme.value === 'light' ?
       'radial-gradient(transparent 0%, #ffffff88 15%, #ffffffff 40%)' :
       'radial-gradient(transparent 0%, rgb(var(--color-primary-900) / 0.5) 15%, rgb(var(--color-gray-900) / 1.0) 40%)'
      };
});

</script>

<template>
  <div ref="containerEl" class="block w-auto h-full">
    <div class="w-full h-full grid grid-rows-1 grid-cols-1">
      <canvas ref="canvasEl" class="block w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 ticket-flight-gfx-canvas z-[3]" :width="canvasSize?.width ?? 1" :height="canvasSize?.height ?? 1" :style="{ width: `${canvasSize?.width ?? 1}px`, height: `${canvasSize?.height ?? 1}px` }" />
      <div v-if="canvasSize" class="block w-full h-full row-start-1 row-end-2 col-start-1 col-end-2 overflow-hidden absolute" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }">
        <BookingTicketFlightLabel
          v-if="canvasSize"
          :ctrl-key="`${ctrlKey}-FromLabel`"
          :user-name="userName"
          :style="{
            bottom: `${Math.round(0.1 * 100)}%`,
            left: `${Math.round(0.07 * 100)}%`,
            translate: '0 50%'
          }"
          :ui="{
            arrow: 'translate-x-[15%] translate-y-[-80%] left-[15%] top-0'
          }"
        />
        <BookingTicketFlightLabel
          v-if="canvasSize"
          :ctrl-key="`${ctrlKey}-ToLabel`"
          :user-name="userName"
          :style="{
            top: `${Math.round(0.1 * 100)}%`,
            right: `${Math.round(0.1 * 100)}%`,
            translate: '0 -50%'
          }"
          :ui="{
            arrow: '-scale-y-100 translate-y-[80%] bottom-0 right-[15%]'
          }"
        />
        <div 
          class="block absolute size-[136px] scale-150" 
          :style="{
            bottom: `${Math.round(0.1 * 100)}%`,
            left: `${Math.round(0.07 * 100)}%`
          }">
          <div v-if="!isOffscreenRendering" class="absolute left-0 right-0 top-0 bottom-0 z-[2]" :style="radialHighlightStyle" />
          <CheckpointHighlight class="!w-full !h-full z-[1] [&_*]:!fill-primary-300 dark:[&_*]:!fill-primary-500" />
        </div>

        <div 
          class="block absolute size-[136px] scale-150 z-[2]" 
          :style="{
            top: `${Math.round(0.1 * 100)}%`,
            right: `${Math.round(0.1 * 100)}%`
          }">
          <div v-if="!isOffscreenRendering" class="absolute left-0 right-0 top-0 bottom-0 z-[2] bg-white dark:bg-gray-900" :style="radialHighlightStyle" />
          <CheckpointHighlight class="!w-full !h-full z-[1] [&_*]:!fill-primary-300 dark:[&_*]:!fill-primary-500"/>
        </div>
      </div>
    </div>
  </div>
</template>

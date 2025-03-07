<script setup lang="ts">
import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import type { IBookingTicketFlightGfxProps } from './../../types';
import throttle from 'lodash-es/throttle';
import { useThemeSettings } from './../../composables/theme-settings';
import BookingTicketFlightLabel from './booking-ticket-flight-label.vue';
import { getCommonServices } from '../../helpers/service-accessors';
import { toShortForm } from './../../helpers/components';

const { ctrlKey, userName } = defineProps<IBookingTicketFlightGfxProps>();

declare type RGBColor = { r: number, g: number, b: number };
const FlightRouteColorLight: RGBColor = { r: 141, g: 211, b: 187 };
const FlightRouteColorDark: RGBColor = { r: 162, g: 89, b: 255 };
const FlightRouteVertexSize = 5;
const FlightRouteVertexPosAdj = 136 * 0.5;
const FlightRouteCurvenessOffset = -100;

const logger = getCommonServices().getLogger().addContextProps({ component: 'BookingTicketFlightGfx' });

const drawingCanvas = useTemplateRef<HTMLCanvasElement>('drawing-canvas');
const container = useTemplateRef<HTMLElement>('container');

const themeSettings = useThemeSettings();

const canvasSize = ref<{ width: number, height: number } | undefined>();

function renderFrameSafe () {
  try {
    doRenderFrame();
  } catch (err: any) {
    logger.warn('exception occured while redering frame', err, ctrlKey);
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
  logger.debug('redering new frame');
  if (!canvasSize.value) {
    logger.debug('nothing to render, world map was not initialized');
    return;
  }

  const canvasElClientRect = drawingCanvas.value?.getClientRects();
  if ((canvasElClientRect?.length ?? 0) === 0) {
    logger.debug('nothing to render, canvas element empty');
    return;
  }

  const ctx = drawingCanvas.value?.getContext('2d');
  if (!ctx) {
    logger.error('cannot acquire 2D context', undefined, ctrlKey);
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
  logger.debug('updating canvas size', ctrlKey);
  if (container.value!) {
    const containerRect = container.value.getBoundingClientRect();
    canvasSize.value = {
      width: containerRect.width,
      height: containerRect.height
    };
    logger.debug('using canvas size', { w: canvasSize.value.width, h: canvasSize.value.height, ctrlKey });
  } else {
    logger.warn('cannot update canvas size - container is not initialized', undefined, ctrlKey);
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

</script>

<template>
  <div ref="container" class="booking-ticket-flight-gfx">
    <div class="ticket-flight-gfx-container">
      <canvas ref="drawing-canvas" class="ticket-flight-gfx-canvas" :width="canvasSize?.width ?? 1" :height="canvasSize?.height ?? 1" :style="{ width: `${canvasSize?.width ?? 1}px`, height: `${canvasSize?.height ?? 1}px` }" />
      <div v-if="canvasSize" class="ticket-flight-gfx-controls" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }">
        <BookingTicketFlightLabel
          v-if="canvasSize"
          :ctrl-key="[...ctrlKey, 'From']"
          :user-name="userName"
          :style="{
            bottom: `${Math.round(0.1 * 100)}%`,
            left: `${Math.round(0.07 * 100)}%`,
            translate: '0 50%'
          }"
          arrow-class="arrow-top"
        />
        <BookingTicketFlightLabel
          v-if="canvasSize"
          :ctrl-key="[...ctrlKey, 'To']"
          :user-name="userName"
          :style="{
            top: `${Math.round(0.1 * 100)}%`,
            right: `${Math.round(0.1 * 100)}%`,
            translate: '0 -50%'
          }"
          arrow-class="arrow-bottom"
        />
        <div
          :key="`${toShortForm(ctrlKey)}-FromHighlight`"
          class="ticket-flight-gfx-highlight"
          :style="{
            bottom: `${Math.round(0.1 * 100)}%`,
            left: `${Math.round(0.07 * 100)}%`
          }"
        />
        <div
          :key="`${toShortForm(ctrlKey)}-ToHighlight`"
          class="ticket-flight-gfx-highlight"
          :style="{
            top: `${Math.round(0.1 * 100)}%`,
            right: `${Math.round(0.1 * 100)}%`
          }"
        />
      </div>
    </div>
  </div>
</template>

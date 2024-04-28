<script setup lang="ts">
import throttle from 'lodash-es/throttle';
import { useThemeSettings } from './../../composables/theme-settings';
import type { IBookingTicketFlightGfxProps } from './../../shared/interfaces';
import BookingTicketFlightLabel from './booking-ticket-flight-label.vue';
import { AppException, AppExceptionCodeEnum } from './../../shared/exceptions';

const props = defineProps<IBookingTicketFlightGfxProps>();

declare type RGBColor = { r: number, g: number, b: number };
const FlightRouteColorLight: RGBColor = { r: 141, g: 211, b: 187 };
const FlightRouteColorDark: RGBColor = { r: 162, g: 89, b: 255 };
const FlightRouteVertexSize = 5;
const FlightRouteVertexPosAdj = 136 * 0.5;
const FlightRouteCurvenessOffset = -100;

const logger = CommonServicesLocator.getLogger();

const canvasEl = shallowRef<HTMLCanvasElement>();
const containerEl = shallowRef<HTMLElement>();

const themeSettings = useThemeSettings();

const canvasSize = ref<{ width: number, height: number } | undefined>();

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

</script>

<template>
  <div ref="containerEl" class="booking-ticket-flight-gfx">
    <div class="ticket-flight-gfx-container">
      <canvas ref="canvasEl" class="ticket-flight-gfx-canvas" :width="canvasSize?.width ?? 1" :height="canvasSize?.height ?? 1" :style="{ width: `${canvasSize?.width ?? 1}px`, height: `${canvasSize?.height ?? 1}px` }" />
      <div v-if="canvasSize" class="ticket-flight-gfx-controls" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }">
        <BookingTicketFlightLabel
          v-if="canvasSize"
          :ctrl-key="`${ctrlKey}-FromLabel`"
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
          :ctrl-key="`${ctrlKey}-ToLabel`"
          :user-name="userName"
          :style="{
            top: `${Math.round(0.1 * 100)}%`,
            right: `${Math.round(0.1 * 100)}%`,
            translate: '0 -50%'
          }"
          arrow-class="arrow-bottom"
        />
        <div
          :key="`${ctrlKey}-FromHighlight`"
          class="ticket-flight-gfx-highlight"
          :style="{
            bottom: `${Math.round(0.1 * 100)}%`,
            left: `${Math.round(0.07 * 100)}%`
          }"
        />
        <div
          :key="`${ctrlKey}-ToHighlight`"
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

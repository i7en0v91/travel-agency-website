import { getCommonServices } from '../helpers/service-accessors';
import type { ComponentInstance, ShallowRef } from 'vue';
import type { UCarousel } from '../.nuxt/components';
import { AppConfig } from '@golobe-demo/shared';

export function useCarouselPlayer (carouselRef: ShallowRef<ComponentInstance<typeof UCarousel>>) {
  const logger = getCommonServices().getLogger();

  if(import.meta.server) {
    logger.debug('(carousel-player) not applicable on server');
    return;
  }

  let timerHandle: ReturnType<typeof startTimer> | undefined;

  function startTimer(instance: ComponentInstance<any>, intervalMs: number) {
    logger.verbose(`(carousel-player) starting player`);

    const handle = setInterval(() => {
      logger.debug(`(carousel-player) timer callback`);

      if (instance.page === instance.pages) {
        return instance.select(0);
      }
      instance.next();

    }, intervalMs);

    logger.verbose(`(carousel-player) player started`);
    return handle;
  }

  onMounted(() => {
    watch(carouselRef, () =>{ 
      if(!carouselRef.value) {
        logger.debug(`(carousel-player) carousel hasn't been initialized yet`);
        return;
      }

      try {
        timerHandle = startTimer(carouselRef.value, AppConfig.sliderAutoplayPeriodMs);
      } catch(err: any) {
        logger.warn(`(carousel-player) failed to start player`, err);
        return;
      }
    }, { immediate: true });
  });

  onUnmounted(() => {
    const logger = getCommonServices().getLogger();

    if(!timerHandle) {
      logger.debug(`(carousel-player) unmounting, but timer is not running`);
      return;
    }

    logger.debug(`(carousel-player) disposing timer`);
    try {
      clearInterval(timerHandle);
    } catch(err: any) {
      logger.warn(`(carousel-player) failed to dispose timer`, err);
    }
  });
}

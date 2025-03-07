import { getCommonServices } from '../helpers/service-accessors';
import type { ComponentInstance, ShallowRef } from 'vue';
import type { UCarousel } from '../.nuxt/components';
import { AppConfig } from '@golobe-demo/shared';

export function useCarouselPlayer (carouselRef: ShallowRef<ComponentInstance<typeof UCarousel>>) {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseCarouselPlayer' });

  if(import.meta.server) {
    logger.debug('not applicable on server');
    return;
  }

  let timerHandle: ReturnType<typeof startTimer> | undefined;

  function startTimer(instance: ComponentInstance<any>, intervalMs: number) {
    logger.verbose('starting player');

    const handle = setInterval(() => {
      logger.debug('timer callback');

      if (instance.page === instance.pages) {
        return instance.select(0);
      }
      instance.next();

    }, intervalMs);

    logger.verbose('player started');
    return handle;
  }

  onMounted(() => {
    watch(carouselRef, () =>{ 
      if(!carouselRef.value) {
        logger.debug('carousel hasn');
        return;
      }

      try {
        timerHandle = startTimer(carouselRef.value, AppConfig.sliderAutoplayPeriodMs);
      } catch(err: any) {
        logger.warn('failed to start player', err);
        return;
      }
    }, { immediate: true });
  });

  onUnmounted(() => {
    if(!timerHandle) {
      logger.debug('unmounting, but timer is not running');
      return;
    }

    logger.debug('disposing timer');
    try {
      clearInterval(timerHandle);
    } catch(err: any) {
      logger.warn('failed to dispose timer', err);
    }
  });
}

import { getCurrentDeviceSize } from './../helpers/dom';
import { getCommonServices } from '../helpers/service-accessors';
import { DeviceSizeEnum } from '../helpers/constants';

export interface IDeviceSize {
  current: ComputedRef<DeviceSizeEnum>
}

export function useDeviceSize (): IDeviceSize {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseDeviceSize' });

  if(import.meta.server) {
    logger.verbose('assuming desktop size for server side');
    return {
      current: computed(() => DeviceSizeEnum.XXL)
    };
  }

  const deviceSize = ref<DeviceSizeEnum>(getCurrentDeviceSize());
  logger.verbose('initializing', { size: deviceSize.value });

  const actualizeDeviceSize = () => 
    setTimeout(() => {
      const currentDeviceSize = getCurrentDeviceSize();
      if(deviceSize.value !== currentDeviceSize) {
        logger.verbose('device size changed', { new: currentDeviceSize, prev: deviceSize.value });
        deviceSize.value = currentDeviceSize;
      }
    }, 0);
  
  onMounted(() => {
    window.addEventListener('resize', actualizeDeviceSize);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', actualizeDeviceSize);
  });
  
  const exposedValue = computed(() => deviceSize.value);
  return {
    current: exposedValue
  };
}

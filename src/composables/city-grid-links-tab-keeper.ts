import { getCommonServices } from '../helpers/service-accessors';
import throttle from 'lodash-es/throttle';

export function useCityGridLinksTabKeeper () {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseCityGridLinksTabKeeper' });

  if(import.meta.server) {
    logger.verbose('not applicable on server');
    return;
  }

  function updateLinksTabAvailability() {
    logger.debug('updating links tab availability');
  
    try {
      const listItemsEl = document.querySelectorAll('li.city-offers-list-item');
      let availableCount = 0;
      for(const liEl of listItemsEl) {
        const liRect = liEl.getBoundingClientRect();
        const linksAvailable = liRect.height > 0;
        if(linksAvailable) {
          availableCount++;
        }
  
        liEl.querySelectorAll('a').forEach(aEl => {
          if(linksAvailable) {
            aEl.removeAttribute('disabled');
            aEl.removeAttribute('tabIndex');          
          } else {
            aEl.setAttribute('disabled', 'true');
            aEl.setAttribute('tabIndex', '-1');          
          }
        });
      }
  
      logger.debug('links tab availability updated', { total: availableCount, available: availableCount });
    } catch(err: any) {
      logger.warn('failed to update links tab availability', err);
    }
  }
  
  const onWindowResize = () => setTimeout(throttle(function () {
    setTimeout(() => {
      updateLinksTabAvailability();
    }, 0);
  }), 100);
  
  onMounted(() => {
    setTimeout(() => {
      updateLinksTabAvailability();
    }, 0);
    window.addEventListener('resize', onWindowResize);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
  });
}

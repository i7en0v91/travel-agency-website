import { getCommonServices } from '../helpers/service-accessors';
import throttle from 'lodash-es/throttle';

export function useCityGridLinksTabKeeper () {
  const logger = getCommonServices().getLogger();

  if(import.meta.server) {
    logger.verbose('(city-links-tab) not applicable on server');
    return;
  }

  function updateLinksTabAvailability() {
    logger.debug('(city-links-tab) updating links tab availability');
  
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
  
      logger.debug(`(city-links-tab) links tab availability updated, total=${availableCount}, available=${availableCount}`);
    } catch(err: any) {
      logger.warn('(city-links-tab) failed to update links tab availability', err);
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

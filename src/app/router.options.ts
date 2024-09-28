import type { RouterConfig } from '@nuxt/schema';
import { getClientServices } from '../helpers/service-accessors';

export default <RouterConfig> {
  scrollBehavior: (to, from, savedPosition) => {
    // also handles case of initial '/' navigation scroll jumping
    const isNavSamePage = from.path === to.path;

    // after app is initialized (not when moving to new page) it will try to update scroll position according to it's rules
    // for this one-time case in the beginning we need to force scroll position to where use has scrolled
    const scrollPositionMayReset = getClientServices().appMounted;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          left: savedPosition?.left || 0,
          top: (isNavSamePage || scrollPositionMayReset) ? window.scrollY : 0,
          behavior: 'instant'
        });
      }, 0);
    });
  }
};

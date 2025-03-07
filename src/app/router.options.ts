import type { RouterConfig  } from '@nuxt/schema';
import type { RouteLocationNormalizedGeneric } from 'vue-router';
import { getCommonServices } from '../helpers/service-accessors';
import { spinWait, type IAppLogger } from '@golobe-demo/shared';
import { HashNavigationPageTimeout as AnchorNavigationTimeout } from './../helpers/constants';

const CommonLogProps = { component: 'ScrollBehavior' };

async function positionToAnchor(to: RouteLocationNormalizedGeneric, from: RouteLocationNormalizedGeneric, logger: IAppLogger) {
  const elementReady = await spinWait(() => Promise.resolve(!!document.querySelector(to.hash)), AnchorNavigationTimeout, 50);
  if(!elementReady) {
    logger.warn('timeout while positioning to anchor', undefined, { from: from.fullPath, to: to.fullPath });
    return false;
  }
  
  logger.debug('positioning to anchor', { from: from.fullPath, to: to.fullPath });
  return {
    el: to.hash,
    behavior: 'instant'
  };
}

export default <RouterConfig> {
  scrollBehavior: (to, from, savedPosition) => {
    const logger = getCommonServices().getLogger().addContextProps(CommonLogProps);
    logger.verbose('enter', { from: from.fullPath, to: to.fullPath, savedTop: savedPosition?.top });

    if(to.hash?.length) {
      return positionToAnchor(to, from, logger);
    }

    // also handles case of initial '/' navigation scroll jumping
    const isNavSamePage = from.path === to.path;
    const nuxtApp = useNuxtApp();
    // after app is initialized (not when moving to new page) it will try to update scroll position according to it's rules
    // for this one-time case in the beginning we need to force scroll position to where use has scrolled
    const scrollPositionMayReset = !!nuxtApp.isHydrating;
    logger.debug('currrent settings', { from: from.fullPath, to: to.fullPath, scrollPositionMayReset, savedPosition });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          left: savedPosition?.left || 0,
          top: !to.hash?.length ? ((isNavSamePage || scrollPositionMayReset) ? window.scrollY : (savedPosition?.top ?? 0)) : 0,
          behavior: 'instant'
        });
      }, 0);
    });
  }
};

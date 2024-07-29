import isArray from 'lodash-es/isArray';
import isObject from 'lodash-es/isObject';
import { parseURL } from 'ufo';
import { OgImagePathSegment, isDevEnv } from './../../shared/constants';
import { type IAppLogger } from './../../shared/applogger';

function removeTwConfigRecusive (vnode: any) {
  if (!vnode) {
    return;
  }
  if (isObject(vnode)) {
    (vnode as any).tw = undefined;
  }
  if (vnode.props && isObject(vnode.props)) {
    (vnode.props as any).tw = undefined;
  }
  if (isArray(vnode.props?.children)) {
    for (const child of vnode.props.children) {
      removeTwConfigRecusive(child);
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
   
  nitroApp.hooks.hook('nuxt-og-image:satori:vnodes', async (vnode) => {
    if (vnode) {
      removeTwConfigRecusive(vnode);
    }
  });

  nitroApp.hooks.hook('request', (event) => {
    const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
    const fullUrl = event.node.req.url;
    const parsedUrl = parseURL(fullUrl);
    if (parsedUrl.pathname.includes(OgImagePathSegment)) {
      logger?.always(`(og-image) og image request received, url=${fullUrl}`);
    };
  });

  nitroApp.hooks.hook('afterResponse', (event) => {
    const logger = (globalThis as any)?.CommonServicesLocator?.getLogger() as IAppLogger;
    const fullUrl = event.node.req.url;
    const parsedUrl = parseURL(fullUrl);
    if (parsedUrl.pathname.includes(OgImagePathSegment)) {
      logger?.always(`(og-image) og image request completed, url=${fullUrl}`);
    };
  });

  // KB: temporary workaround for og-image in prod env
  // TODO: check with latest nuxt-og-image
  if(!isDevEnv()) {
    nitroApp.hooks.hook('render:island', (islandResponse, { islandContext }) => {
      const isOgImgComponent = ['ogbookingticket', 'ogoffersummary'].some(t => islandContext.name.replaceAll('-', '').toLowerCase().includes(t));
      if(!isOgImgComponent) {
        return;
      }
      islandResponse.head.link.push({ rel: 'stylesheet', href: `/_nuxt/components/${islandContext.name}`});
    });
  }
  
});

import isArray from 'lodash-es/isArray';
import isObject from 'lodash-es/isObject';

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
  // eslint-disable-next-line require-await
  nitroApp.hooks.hook('nuxt-og-image:satori:vnodes', async (vnode) => {
    if (vnode) {
      removeTwConfigRecusive(vnode);
    }
  });
});

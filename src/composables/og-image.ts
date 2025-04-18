import { AppConfig, getOgImageFileName, lookupPageByUrl, AppPage, EntityIdPages, SystemPage, type Locale } from '@golobe-demo/shared';
import { joinURL } from 'ufo';
import { getCommonServices } from '../helpers/service-accessors';

export function useOgImage (component?: { name: string, props: any}, skipCache: boolean = false) {
  const route = useRoute();
  const { locale } = useI18n();

  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseOgImage' });
  if (!AppConfig.ogImage.enabled) {
    logger.debug('skipping OG image metadata as disabled', { path: route.path });
    return;
  }

  const defaultImgUrl = joinURL('/img', 'og', getOgImageFileName(AppPage.Index, locale.value as Locale));

  const currentPage = lookupPageByUrl(route.path);
  if (currentPage === undefined) {
    logger.warn('failed to detect current page, using default', undefined, { path: route.path, url: defaultImgUrl });
    defineOgImage({
      url: defaultImgUrl
    });
    return;
  }

  if(currentPage === SystemPage.Drafts) {
    logger.debug('skipping OG image metadata for system page', { path: route.path });
    return;
  }

  const isDynamicOgImagePage = EntityIdPages.includes(currentPage!);
  if (isDynamicOgImagePage && !component) {
    logger.warn('page requires a component to generate image, using default', undefined, { path: route.path, page: currentPage, url: defaultImgUrl });
    defineOgImage({
      url: defaultImgUrl
    });
    return;
  }

  if (component) {
    logger.verbose('using component for og image', { path: route.path, page: currentPage, component: component.name, skipCache, props: component.props });
    defineOgImageComponent(component.name, component.props, {
      cacheMaxAgeSeconds: skipCache ? 0 : undefined
    });
    return;
  }

  const imgUrl = joinURL('/img', 'og', getOgImageFileName(currentPage, locale.value as Locale));
  logger.verbose('using prerendered screenshot for og image', { path: route.path, page: currentPage, url: imgUrl });
  defineOgImage({
    url: imgUrl
  });
}

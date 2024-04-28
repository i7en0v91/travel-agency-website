import { joinURL } from 'ufo';
import { PagePath, AllPagePaths, EntityIdPages, type Locale } from './../shared/constants';
import { getOgImageFileName, isLandingPageUrl } from './../shared/common';
import AppConfig from './../appconfig';

export function useOgImage (component?: { name: string, props: any}) {
  const route = useRoute();
  const { locale } = useI18n();

  const logger = CommonServicesLocator.getLogger();
  if (!AppConfig.ogImage.enabled) {
    logger.debug(`(og-image) skipping OG image metadata as disabled, path=${route.path}`);
    return;
  }

  const defaultImgUrl = joinURL('/img', 'og', getOgImageFileName(PagePath.Index, locale.value as Locale));

  const currentPage = isLandingPageUrl(route.path) ? PagePath.Index : AllPagePaths.find(pp => pp !== PagePath.Index && route.path.includes(`/${pp.valueOf()}`));
  if (currentPage === undefined) {
    logger.warn(`(og-image) failed to detect current page, using default, path=${route.path}, url=${defaultImgUrl}`);
    defineOgImage({
      url: defaultImgUrl
    });
    return;
  }

  const isDynamicOgImagePage = EntityIdPages.includes(currentPage!);
  if (isDynamicOgImagePage && !component) {
    logger.warn(`(og-image) page requires a component to generate image, using default, path=${route.path}, page=${currentPage}, url=${defaultImgUrl}`);
    defineOgImage({
      url: defaultImgUrl
    });
    return;
  }

  if (component) {
    logger.verbose(`(og-image) using component for og image, path=${route.path}, page=${currentPage}, component=${component.name}, props=${JSON.stringify(component.props)}`);
    defineOgImageComponent(component.name, component.props);
    return;
  }

  const imgUrl = joinURL('/img', 'og', getOgImageFileName(currentPage, locale.value as Locale));
  logger.verbose(`(og-image) using prerendered screenshot for og image, path=${route.path}, page=${currentPage}, url=${imgUrl}`);
  defineOgImage({
    url: imgUrl
  });
}

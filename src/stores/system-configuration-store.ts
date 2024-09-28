import { CachedResultsInAppServicesEnabled, lookupValueOrThrow, DataKeyImageSrcSizes, TemporaryEntityId, ImageCategory, type IImageCategoryInfo } from '@golobe-demo/shared';
import { getPayload, addPayload } from './../helpers/payload';
import { destr } from 'destr';
import { getCommonServices, getServerServices } from '../helpers/service-accessors';

type CategoryInfoPayload = [string, IImageCategoryInfo];

export interface ISystemConfigurationStore {
  initialize(): Promise<void>;
  getImageSrcSize(category: ImageCategory): Promise<IImageCategoryInfo>;
}

export const useSystemConfigurationStore = defineStore('systemConfigurationStore', () => {
  const logger = getCommonServices().getLogger();
  let initialized = false;
  let imageCategoryInfosMap: ReadonlyMap<ImageCategory, IImageCategoryInfo> | undefined;
  let imageCategoryInfosPayload: CategoryInfoPayload[] | undefined;

  async function buildImageCategoryInfoPayload (): Promise<CategoryInfoPayload[]> {
    try {
      logger.verbose('(systemConfigurationStore) building image category infos payload');
      const result: CategoryInfoPayload[] = [];

      const imageCategoryLogic = getServerServices()!.getImageCategoryLogic();
      const allCategoryInfos = [...(await imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).entries()];
      for (let i = 0; i < allCategoryInfos.length; i++) {
        const category = allCategoryInfos[i][0];
        const categoryInfo = allCategoryInfos[i][1];
        result.push([category, { width: categoryInfo.width, height: categoryInfo.height, id: categoryInfo.id, kind: categoryInfo.kind }]);
      }
      logger.verbose(`(systemConfigurationStore) image category infos payload built, size=${result.length}`);
      return result;
    } catch (err: any) {
      logger.warn('(systemConfigurationStore) exception while building image category infos payload', err);
      return [];
    }
  }

  function createImageCategoryInfosMap (payload: CategoryInfoPayload[]) : ReadonlyMap<ImageCategory, IImageCategoryInfo> {
    try {
      logger.verbose('(systemConfigurationStore) building image category infos map');
      const result = new Map<ImageCategory, IImageCategoryInfo>([]);// = new Map<ImageCategory, IImageCategoryInfo>(payload);
      for (let i = 0; i < payload.length; i++) {
        const category = lookupValueOrThrow(ImageCategory, payload[i][0]) as ImageCategory;
        const size = destr<IImageCategoryInfo>(payload[i][1]);
        result.set(category, size);
      }
      logger.verbose(`(systemConfigurationStore) image category infos  map build, size=${[...result.entries()].length}`);
      return result;
    } catch (err: any) {
      logger.warn('(systemConfigurationStore) failed to build image category infos map, fallback sizes will be used', err);
      return new Map<ImageCategory, IImageCategoryInfo>([]);
    }
  }

  async function initialize (): Promise<void> {
    if (!initialized) {
      logger.verbose('(systemConfigurationStore) initializing');

      if (!imageCategoryInfosPayload) {
        const nuxtApp = useNuxtApp();
        if (import.meta.client) {
          imageCategoryInfosPayload = getPayload<CategoryInfoPayload[]>(nuxtApp, DataKeyImageSrcSizes) ?? undefined;
        } else {
          imageCategoryInfosPayload = await buildImageCategoryInfoPayload();
          addPayload(nuxtApp, DataKeyImageSrcSizes, imageCategoryInfosPayload);
        }
      }

      if (!imageCategoryInfosMap) {
        imageCategoryInfosMap = createImageCategoryInfosMap(imageCategoryInfosPayload!);
      }

      initialized = true;
      logger.verbose('(systemConfigurationStore) initialization completed');
    }
  }

  async function getImageSrcSize (category: ImageCategory): Promise<IImageCategoryInfo> {
    logger.verbose(`(systemConfigurationStore) accessing image source size, category=${category}`);

    await initialize();

    let info = imageCategoryInfosMap!.get(category);
    if (!info) {
      logger.warn(`(systemConfigurationStore) unexpected category: ${category}, fallback size will be used`);
      info = { width: 1, height: 1, id: TemporaryEntityId, kind: category };
    }

    logger.verbose(`(systemConfigurationStore) image source size for category=${category} is {width: ${info.width}, height: ${info.height}}`);
    return info;
  };

  const istore: ISystemConfigurationStore = {
    getImageSrcSize,
    initialize
  };
  return istore;
});

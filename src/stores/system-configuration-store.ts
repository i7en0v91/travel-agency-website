import { destr } from 'destr';
import { ImageCategory, type IImageCategoryInfo } from '../shared/interfaces';
import { NuxtDataKeys } from '../shared/constants';

type CategoryInfoPayload = [string, IImageCategoryInfo];

export interface ISystemConfigurationStore {
  getImageSrcSize(category: ImageCategory): Promise<IImageCategoryInfo>;
}

export const useSystemConfigurationStore = defineStore('systemConfigurationStore', () => {
  const logger = CommonServicesLocator.getLogger();
  let imageCategoryInfosMap: ReadonlyMap<ImageCategory, IImageCategoryInfo> | undefined;
  let imageCategoryInfosPayload: CategoryInfoPayload[] | undefined;

  async function buildImageCategoryInfoPayload (): Promise<CategoryInfoPayload[]> {
    try {
      logger.verbose('(systemConfigurationStore) building image category infos payload');
      const result: CategoryInfoPayload[] = [];

      const imageCategoryLogic = ServerServicesLocator.getImageCategoryLogic();
      const allCategoryInfos = [...(await imageCategoryLogic.getImageCategoryInfos()).entries()];
      for (let i = 0; i < allCategoryInfos.length; i++) {
        const category = allCategoryInfos[i];
        result.push([category[0], { width: category[1].width, height: category[1].height, id: category[1].id }]);
      }
      logger.verbose(`(systemConfigurationStore) image category infos payload built, size=${result.length}`);
      return result;
    } catch (err: any) {
      logger.warn('(systemConfigurationStore) exception while building image category infos payload', err);
      return [];
    }
  }

  function buildImageCategoryInfosMap (payload: CategoryInfoPayload[]) : ReadonlyMap<ImageCategory, IImageCategoryInfo> {
    try {
      logger.verbose('(systemConfigurationStore) building image category infos map');
      const result = new Map<ImageCategory, IImageCategoryInfo>([]);// = new Map<ImageCategory, IImageCategoryInfo>(payload);
      for (let i = 0; i < payload.length; i++) {
        const category = payload[i][0] as ImageCategory;
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

  async function getImageSrcSize (category: ImageCategory): Promise<IImageCategoryInfo> {
    logger.verbose(`(systemConfigurationStore) accessing image source size, category=${category}`);

    if (!imageCategoryInfosPayload) {
      const nuxtApp = useNuxtApp();
      if (process.client) {
        imageCategoryInfosPayload = destr<CategoryInfoPayload[]>(nuxtApp.payload[NuxtDataKeys.ImageSrcSizes]);
      } else {
        imageCategoryInfosPayload = await buildImageCategoryInfoPayload();
        nuxtApp.payload[NuxtDataKeys.ImageSrcSizes] = imageCategoryInfosPayload;
      }
    }

    if (!imageCategoryInfosMap) {
      imageCategoryInfosMap = buildImageCategoryInfosMap(imageCategoryInfosPayload);
    }
    let info = imageCategoryInfosMap.get(category);
    if (!info) {
      logger.warn(`(systemConfigurationStore) unexpected category: ${category}, fallback size will be used`);
      info = { width: 1, height: 1, id: 0 };
    }

    logger.verbose(`(systemConfigurationStore) image source size for category=${category} is {width: ${info.width}, height: ${info.height}}`);
    return info;
  };

  const istore: ISystemConfigurationStore = {
    getImageSrcSize
  };
  return istore;
});

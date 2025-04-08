import { AppConfig, AvailableImageCategories, CachedResultsInAppServicesEnabled, TemporaryEntityId, type ImageCategory, type IImageCategoryInfo, type IAppLogger, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { StoreKindEnum } from './../helpers/constants';
import { getCommonServices, getServerServices } from '../helpers/service-accessors';
import { ApiEndpointImageCategories, type IImageCategoryDto } from '../server/api-definitions';
import { buildStoreDefinition, getStoreLoggingPrefix, type PublicStore } from './../helpers/stores/pinia';

type CategoryInfo = Omit<IImageCategoryInfo, 'createdUtc' | 'modifiedUtc'>;
type CategoryInfoArray = CategoryInfo[];

declare type State = {
  s_imagesConfig: CategoryInfo[]
};

const StoreId = StoreKindEnum.SystemConfiguration;
const CommonLogProps =  { component: getStoreLoggingPrefix(StoreId) };

async function buildImageCategoryInfos (logger: IAppLogger): Promise<CategoryInfoArray> {
  logger.verbose(`building image category infos`);

  const imageCategoryLogic = getServerServices()!.getImageCategoryLogic();
  const result: CategoryInfoArray = 
    Array.from((await imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).entries())
      .map(e => { 
        return { 
          id: e[1].id,
          width: e[1].width, 
          height: e[1].height, 
          kind: e[1].kind 
        }; 
      });

  logger.verbose(`image category infos built`, { size: result.length });
  return result;
}

function buildFallbackImageCategoriesConfig() {
  const result: CategoryInfo[] = [];
  for(const c of AvailableImageCategories) {
    result.push({ width: 1, height: 1, id: TemporaryEntityId, kind: c as ImageCategory });
  }
  return result;
}
const FallbackImageCategories = buildFallbackImageCategoriesConfig();

const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  (clientSideOptions) => { 
    return {
      fallbackImageCategories: FallbackImageCategories,
      imageCategoriesFetch:
        useFetch(`/${ApiEndpointImageCategories}`, {
          server: false,
          lazy: false,
          immediate: false,
          cache: AppConfig.caching.intervalSeconds ? 'default' : 'no-cache',
          dedupe: 'defer',
          default: () => [],
          transform: (response: IImageCategoryDto[]) => {
            const logger = getCommonServices()?.getLogger();
            logger?.verbose(`image categories fetched, transforming`, { ...CommonLogProps, response });
            
            const result: CategoryInfoArray = response?.map(item => {
              return {
                id: item.id,
                kind: item.kind,
                width: item.width,
                height: item.height
              };
            });
            
            logger?.verbose(`image categories transformed`, { ...CommonLogProps, response });
            return result;
          },
          $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-page' })
        })
      };
  },
  {
    state: (): State => {
      return { 
        s_imagesConfig: []
      };
    },
    getters: {
      /**
       * Properties of every image type available in system.
       * It is usually assumed to be initialized for any page component due to {@link loadImageCategories} called upon app startup
       */
      imageCategories(): CategoryInfo[] {
        if(!this.s_imagesConfig?.length) {
          const logger = getCommonServices()?.getLogger();
          logger?.warn(`access to uninitialized image categories field`, undefined, CommonLogProps);
          return FallbackImageCategories;
        }
        return this.s_imagesConfig!;
      }
    },
    actions: {
      /**
       * (Re-)loads image categories configuration using either fetch from server
       * @param ifNotLoaded do nothing if configuration has beed already loaded. 
       * True by default as the method is used only during app startup for setting initial values
       */
      async loadImageCategories(ifNotLoaded = true): Promise<void> {
        const logger = getCommonServices().getLogger();        
        if(this.s_imagesConfig?.length && ifNotLoaded) {
          logger.debug(`image categories already loaded`);
          return;
        }

        let categoryInfos: CategoryInfoArray | undefined;
        if(import.meta.client) {
          try {
            const imageCategoriesFetch = await this.clientSetupVariables().imageCategoriesFetch!;
            await imageCategoriesFetch!.refresh();
            categoryInfos = imageCategoriesFetch!.data.value;

            const err = imageCategoriesFetch.error.value;
            if(categoryInfos?.length && !err) {
              this.categoriesLoaded(categoryInfos);
            } else {
              this.categoriesLoadFailed(err);
            }
          } catch(err: any) {
            this.categoriesLoadFailed(err);
            return;
          }
        } else {
          try {
            categoryInfos = await buildImageCategoryInfos(logger);
            if(!categoryInfos?.length) {
              throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'image categories data empty', 'error-page');
            } 

            this.categoriesLoaded(categoryInfos);
          } catch (err: any) {
            this.categoriesLoadFailed(err);
            return;
          }
        }
      }
    },
    patches: {
      categoriesLoaded(categoryInfos: CategoryInfoArray): void {
        const values: CategoryInfo[] = categoryInfos;
        this.$patch({
          s_imagesConfig: values
        });
      },

      categoriesLoadFailed(err: any): void {
        const logger = getCommonServices()?.getLogger();
        if(import.meta.client) {
          logger?.warn(`failed to to load image categories`, err, CommonLogProps);
          if(this.s_imagesConfig?.length) {
            throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to load image categories', 'error-stub');
          } else {
            this.$patch({
              s_imagesConfig: FallbackImageCategories
            });
          }
        } else {
          logger?.error(`failed to initialize image categories`, err, CommonLogProps);
        }
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to initialize image categories', 'error-page');
      }
    }
  }
);
const StoreDef = storeDefBuilder();
const useSystemConfigurationStoreInternal = defineStore(StoreId, StoreDef);
export const useSystemConfigurationStore = useSystemConfigurationStoreInternal as PublicStore<typeof storeDefBuilder>;
export type SystemConfigurationStoreInternal = ReturnType<typeof useSystemConfigurationStoreInternal>;
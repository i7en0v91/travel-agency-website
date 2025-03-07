import { mapLocalizeableValues, AppException, AppExceptionCodeEnum, type GetEntityCacheItem, type PreviewMode, type IAppLogger, type CacheEntityType, type EntityId } from '@golobe-demo/shared';
import type { IEntityCacheLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class EntityCacheLogic implements IEntityCacheLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IEntityCacheLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['entityCacheLogicPrisma',  'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IEntityCacheLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'EntityCacheLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  get = async <TEntityType extends CacheEntityType>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType, previewMode: PreviewMode): Promise<GetEntityCacheItem<TEntityType>[]> => {
    this.logger.debug('find', { searchIds, searchSlugs, type, previewMode });

    let result: GetEntityCacheItem<TEntityType>[];
    if(previewMode) {
      if(type === 'City') {
        const cityIds = searchIds;

        if(searchSlugs.length > 0) {
          this.logger.debug('find cities - determining ids by', { slugs: searchSlugs, previewMode });
          const draftCityIds = (await this.dbRepository.acsysDraftsCity.findMany({
            where: {
              slug: {
                in: searchSlugs
              },
              isDeleted: false
            },
            select: {
              id: true
            }
          })).map(i => i.id);
          cityIds.push(...draftCityIds);

          if(draftCityIds.length < searchSlugs.length) {
            const publishedCityIds = (await this.dbRepository.city.findMany({
              where: {
                slug: {
                  in: searchSlugs
                },
                isDeleted: false
              },
              select: {
                id: true
              }
            })).map(i => i.id);
            cityIds.push(...publishedCityIds);
          }
        }

        if(cityIds.length) {
          const resolvedCities = await this.acsysDraftsEntitiesResolver.resolveCities({ idsFilter: cityIds });
          result = Array.from(resolvedCities.items.values()).map(e => {
            return <GetEntityCacheItem<TEntityType>>{
              id: e.id,
              type: 'City',
              slug: e.slug,
              displayName: mapLocalizeableValues((cityName: string, countryName: string) => { return `${cityName}, ${countryName}`; }, e.name, e.country.name)
            };
          });
        } else {
          result = [];
        }
      } else {
        this.logger.warn('unexpected entity type', undefined, { searchIds, searchSlugs, type });
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected entity type', 'error-stub');
      }
    } else {
      result = await this.prismaImplementation.get<TEntityType>(searchIds, searchSlugs, type, previewMode);
    }
    
    this.logger.debug('find', { searchIds, searchSlugs, type, previewMode, result });
    return result;
  };
}

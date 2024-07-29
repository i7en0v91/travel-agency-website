import { type GetEntityCacheItem, type PreviewMode, type IAppLogger, type IEntityCacheLogic, type CacheEntityType, type EntityId } from './../../backend/app-facade/interfaces';
import { mapLocalizeableValues, AppException, AppExceptionCodeEnum } from './../../backend/app-facade/implementation';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class EntityCacheLogic implements IEntityCacheLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IEntityCacheLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['entityCacheLogicPrisma',  'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IEntityCacheLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  get = async <TEntityType extends CacheEntityType>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType, previewMode: PreviewMode): Promise<GetEntityCacheItem<TEntityType>[]> => {
    this.logger.debug(`(EntityCacheLogic-Acsys) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}, previewMode=${previewMode}`);

    let result: GetEntityCacheItem<TEntityType>[];
    if(previewMode) {
      if(type === 'City') {
        const cityIds = searchIds;

        if(searchSlugs.length > 0) {
          this.logger.debug(`(EntityCacheLogic-Acsys) find cities - determining ids by slugs=[${searchSlugs.join('; ')}], previewMode=${previewMode}`);
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
          result = [...resolvedCities.items.values()].map(e => {
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
        this.logger.warn(`(EntityCacheLogic-Acsys) unexpected entity type: searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected entity type', 'error-stub');
      }
    } else {
      result = await this.prismaImplementation.get<TEntityType>(searchIds, searchSlugs, type, previewMode);
    }
    
    this.logger.debug(`(EntityCacheLogic-Acsys) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}, previewMode=${previewMode}, result=${result ? JSON.stringify(result) : 'none'}`);
    return result;
  };
}

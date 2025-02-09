import type { PrismaClient } from '@prisma/client';
import { AppException, AppExceptionCodeEnum, mapLocalizeableValues, type IAppLogger, type GetEntityCacheItem, type CacheEntityType, type IEntityCacheCityItem, type EntityId } from '@golobe-demo/shared';
import type { IEntityCacheLogic } from './../types';

export class EntityCacheLogic implements IEntityCacheLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  get = async <TEntityType extends CacheEntityType>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType): Promise<GetEntityCacheItem<TEntityType>[]> => {
    this.logger.verbose(`(EntityCacheLogic) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}`);
    if (searchIds.length === 0 && searchSlugs.length === 0) {
      this.logger.verbose(`(EntityCacheLogic) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}, result=[]`);
      return [];
    }

    let result: any;
    if (type === 'City') {
      const entities = await this.dbRepository.city.findMany({
        where: {
          id: searchIds.length > 0 ? { in: searchIds } : undefined,
          slug: searchSlugs.length > 0 ? { in: searchSlugs } : undefined,
          isDeleted: false
        },
        select: {
          nameStr: true,
          country: {
            select: {
              nameStr: true
            }
          },
          id: true,
          slug: true
        }
      });
      if (entities.length !== (searchIds.length + searchSlugs.length)) {
        this.logger.warn(`(EntityCacheLogic) not all requests cities have been found: expected searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, found=${JSON.stringify(entities.map((e) => { return { id: e.id, slug: e.slug }; }))}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'cities not found', 'error-stub');
      }

      result = entities.map((entity) => {
        return <IEntityCacheCityItem> {
          type,
          id: entity.id,
          slug: entity.slug,
          displayName: mapLocalizeableValues((cityName: string, countryName: string) => { return `${cityName}, ${countryName}`; }, entity.nameStr, entity.country.nameStr)
        };
      });
    } else {
      this.logger.warn(`(EntityCacheLogic) unexpected entity type: searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected entity type', 'error-stub');
    }

    this.logger.verbose(`(EntityCacheLogic) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}, result=${result ? JSON.stringify(result) : 'none'}`);
    return result;
  };
}

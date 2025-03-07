import type { PrismaClient } from '@prisma/client';
import { AppException, AppExceptionCodeEnum, mapLocalizeableValues, type IAppLogger, type GetEntityCacheItem, type CacheEntityType, type IEntityCacheCityItem, type EntityId } from '@golobe-demo/shared';
import type { IEntityCacheLogic } from './../types';

export class EntityCacheLogic implements IEntityCacheLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'EntityCacheLogic' });
    this.dbRepository = dbRepository;
  }

  get = async <TEntityType extends CacheEntityType>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType): Promise<GetEntityCacheItem<TEntityType>[]> => {
    this.logger.verbose('get', { searchIds, searchSlugs, type });
    if (searchIds.length === 0 && searchSlugs.length === 0) {
      this.logger.verbose('get', { searchIds, searchSlugs, type });
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
        const found = entities.map((e) => { return { id: e.id, slug: e.slug }; });
        this.logger.warn('not all requests cities have been found: expected', undefined, { searchIds, searchSlugs, found });
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'cities not found', 'error-stub');
      }

      result = entities.map((entity) => {
        return <IEntityCacheCityItem> {
          type,
          id: entity.id,
          slug: entity.slug,
          displayName: mapLocalizeableValues((cityName: string, countryName: string) => { return `${cityName}, ${countryName}`; }, entity.nameStr, entity.country.nameStr),
          expireAt: null
        };
      });
    } else {
      this.logger.warn('unexpected entity type', undefined, { searchIds, searchSlugs, type });
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected entity type', 'error-stub');
    }

    this.logger.verbose('get', { searchIds, searchSlugs, type, result });
    return result;
  };
}

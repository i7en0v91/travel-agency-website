import { PrismaClient } from '@prisma/client';
import isString from 'lodash-es/isString';
import { type IEntityCacheItem, type IEntityCacheLogic, type CacheEntityType, type IEntityCacheCityItem, type EntityId } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { AppException, AppExceptionCodeEnum } from '../shared/exceptions';
import { mapLocalizeableValues } from '~/shared/common';

export class EntityCacheLogic implements IEntityCacheLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  get = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType } & IEntityCacheItem>(idsOrSlugs: EntityId[] | string[], type: TEntityType): Promise<TCacheItem[]> => {
    this.logger.verbose(`(EntityCacheLogic) find, idsOrSlugs=${idsOrSlugs}, type=${type}`);
    if (idsOrSlugs.length === 0) {
      this.logger.verbose(`(EntityCacheLogic) find, idsOrSlugs=${idsOrSlugs}, type=${type}, result=[]`);
      return [];
    }

    let result: any;
    if (type === 'City') {
      const entities = await this.dbRepository.city.findMany({
        where: {
          id: !isString(idsOrSlugs[0]) ? { in: idsOrSlugs as number[] } : undefined,
          slug: isString(idsOrSlugs[0]) ? { in: idsOrSlugs as string[] } : undefined,
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
      if (entities.length !== idsOrSlugs.length) {
        this.logger.warn(`(EntityCacheLogic) not all requests cities have been found: expected idsOrSlugs=${idsOrSlugs}, found=${JSON.stringify(entities.map((e) => { return { id: e.id, slug: e.slug }; }))}`);
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
      this.logger.warn(`(EntityCacheLogic) unexpected entity type: idsOrSlugs=${idsOrSlugs}, type=${type}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unexpected entity type', 'error-stub');
    }

    this.logger.verbose(`(EntityCacheLogic) find, idsOrSlugs=${idsOrSlugs}, type=${type}, result=${result ? JSON.stringify(result) : 'none'}`);
    return result;
  };
}

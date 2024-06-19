import { type IAppLogger, type IEntityCacheItem, type IEntityCacheLogic, type CacheEntityType, type EntityId } from './../../backend/app-facade/interfaces';
import type { EntityCacheLogic as EntityCacheLogicPrisma } from '../services/entity-cache-logic';

export class EntityCacheLogic implements IEntityCacheLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: EntityCacheLogicPrisma;

  public static inject = ['entityCacheLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: EntityCacheLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  get = async <TEntityType extends CacheEntityType, TCacheItem extends { type: TEntityType } & IEntityCacheItem>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType): Promise<TCacheItem[]> => {
    this.logger.debug(`(EntityCacheLogic-Acsys) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}`);
    const result = await this.prismaImplementation.get<TEntityType, TCacheItem>(searchIds, searchSlugs, type);
    this.logger.debug(`(EntityCacheLogic-Acsys) find, searchIds=${JSON.stringify(searchIds)}, searchSlugs=${JSON.stringify(searchSlugs)}, type=${type}, result=${result ? JSON.stringify(result) : 'none'}`);
    return result;
  };
}

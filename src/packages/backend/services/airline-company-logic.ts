import { EntityChangeSubscribersOrder, CurrentUserGeoLocation, DbVersionInitial, calculateDistanceKm, newUniqueId, type IAppLogger, type IAirlineCompany, type EntityId, formatAppCacheKey } from '@golobe-demo/shared';
import type { PrismaClient } from '@prisma/client';
import type { EntityChangeNotificationCallbackArgs, EntityChangeNotificationCallback, EntityChangeNotificationSubscriberId, IEntityChangeNotificationTask, IAirlineCompanyLogic, IAirlineCompanyData } from './../types';
import { NearestAirlineCompanyCacheKey, AllAirlineCompaniesCacheKey } from './../helpers/utils';
import type { Storage, StorageValue } from 'unstorage';
import orderBy from 'lodash-es/orderBy';
import { AirlineCompanyInfoQuery, MapAirlineCompany } from './queries';
import { mapDbGeoCoord } from '../helpers/db';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly NearestCompanyCacheKey = formatAppCacheKey(NearestAirlineCompanyCacheKey);
  private readonly AllCompaniesCacheKey = formatAppCacheKey(AllAirlineCompaniesCacheKey);

  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly cache: Storage<StorageValue>;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['entityChangeNotifications', 'cache', 'dbRepository', 'logger'] as const;
  constructor (entityChangeNotifications: IEntityChangeNotificationTask, cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.cache = cache;
    this.logger = logger.addContextProps({ component: 'AirlineCompanyLogic' });
    this.dbRepository = dbRepository;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('subscribing for airline company entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'AirlineCompany',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.AirlineCompanyLogic
    }, this.entityChangeCallback);

    this.logger.verbose('subscribed for airline company entities changes', subscriberId);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('entities change callback');
    if(args.target === 'too-much' || (args.target.find(x => x.entity === 'AirlineCompany')?.ids.length ?? 0) > 0) {
      await this.clearResultsCache();
    }
    this.logger.debug('entities change callback completed');
  };

  private async clearResultsCache(): Promise<void> {
    this.logger.verbose('clearing results cache');
    await this.cache.removeItem(this.AllCompaniesCacheKey);
    await this.cache.removeItem(this.NearestCompanyCacheKey);
  }

  async deleteCompany(id: EntityId): Promise<void> {
    this.logger.verbose('deleting company', id);
    await this.dbRepository.airlineCompany.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    await this.clearResultsCache();
    this.logger.verbose('company deleted', id);
  };

  async getAllAirlineCompanies (allowCachedValue: boolean): Promise<IAirlineCompany[]> {
    this.logger.debug('get all airline companies', allowCachedValue);

    let result = allowCachedValue ? (await this.cache.getItem(this.AllCompaniesCacheKey) as IAirlineCompany[]) : undefined;
    if(!result) {
      result = (await this.dbRepository.airlineCompany.findMany({
        where: {
          isDeleted: false
        },
        select: AirlineCompanyInfoQuery.select
      })).map(MapAirlineCompany);
      await this.cache.setItem(this.AllCompaniesCacheKey, result);
    }

    this.logger.debug('get all airline companies', { count: result.length, allowCachedValue });
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData): Promise<EntityId> {
    this.logger.verbose('creating airline company');

    const companyId = (await this.dbRepository.airlineCompany.create({
      data: {
        id: newUniqueId(),
        nameStr: {
          create: { 
            id: newUniqueId(),
            version: DbVersionInitial,
            ...companyData.name
          }
        },
        city: {
          connect: {
            id: companyData.cityId
          }
        },
        logoImage: {
          connect: {
            id: companyData.logoImageId
          }
        },
        numReviews: companyData.reviewSummary.numReviews,
        reviewScore: companyData.reviewSummary.score.toFixed(1),
        version: DbVersionInitial
      },
      select: {
        id: true
      }
    })).id;
    await this.clearResultsCache();

    this.logger.verbose('creating airline company - completed', { id: companyId });
    return companyId;
  }

  async getNearestCompany (allowCachedValue: boolean) : Promise<IAirlineCompany> {
    this.logger.debug('get nearest company', allowCachedValue);

    let result = allowCachedValue ? (await this.cache.getItem(this.NearestCompanyCacheKey) as IAirlineCompany)  : undefined;
    if (!result) {
      const companiesGeo = await this.dbRepository.airlineCompany.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true,
          city: {
            select: {
              lat: true,
              lon: true
            }
          }
        },
        orderBy: {
          numReviews: 'desc'
        },
        take: 100
      });

      const companiesDist = companiesGeo.map((x) => { return { id: x.id, distance: calculateDistanceKm({ lon: mapDbGeoCoord(x.city.lon), lat: mapDbGeoCoord(x.city.lat) }, CurrentUserGeoLocation) }; });
      const nearestCompanyId = orderBy(companiesDist, ['distance'], ['asc'])[0].id;

      const entity = await this.dbRepository.airlineCompany.findFirst({
        where: {
          id: nearestCompanyId,
          isDeleted: false
        },
        ...AirlineCompanyInfoQuery
      });
      result = MapAirlineCompany(entity!);

      this.logger.verbose('nearest company calculated - updating cache', { id: result.id, name: result.name.en });
      await this.cache.setItem(this.NearestCompanyCacheKey, result);
    }

    this.logger.debug('nearest company', { id: result.id, name: result.name.en, allowCachedValue });
    return result;
  }
}

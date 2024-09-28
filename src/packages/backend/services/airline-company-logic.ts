import { EntityChangeSubscribersOrder, CurrentUserGeoLocation, DbVersionInitial, calculateDistanceKm, newUniqueId, type IAppLogger, type IAirlineCompany, type EntityId } from '@golobe-demo/shared';
import type { PrismaClient } from '@prisma/client';
import { type EntityChangeNotificationCallbackArgs, type EntityChangeNotificationCallback, type EntityChangeNotificationSubscriberId, type IEntityChangeNotificationTask, type IAirlineCompanyLogic, type IAirlineCompanyData } from './../types';
import { NearestAirlineCompanyCacheKey, AllAirlineCompaniesCacheKey } from './../helpers/utils';
import { type Storage, type StorageValue } from 'unstorage';
import orderBy from 'lodash-es/orderBy';
import { AirlineCompanyInfoQuery, MapAirlineCompany } from './queries';
import { mapDbGeoCoord } from '../helpers/db';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly cache: Storage<StorageValue>;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['entityChangeNotifications', 'cache', 'dbRepository', 'logger'] as const;
  constructor (entityChangeNotifications: IEntityChangeNotificationTask, cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.cache = cache;
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('(AirlineCompanyLogic) subscribing for airline company entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'AirlineCompany',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.AirlineCompanyLogic
    }, this.entityChangeCallback);

    this.logger.verbose(`(AirlineCompanyLogic) subscribed for airline company entities changes, subscriberId=${subscriberId}`);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('(AirlineCompanyLogic) entities change callback');
    if(args.target === 'too-much' || (args.target.find(x => x.entity === 'AirlineCompany')?.ids.length ?? 0) > 0) {
      await this.clearResultsCache();
    }
    this.logger.debug('(AirlineCompanyLogic) entities change callback completed');
  };

  private async clearResultsCache(): Promise<void> {
    this.logger.verbose('(AirlineCompanyLogic) clearing results cache');
    await this.cache.removeItem(AllAirlineCompaniesCacheKey);
    await this.cache.removeItem(NearestAirlineCompanyCacheKey);
  }

  async deleteCompany(id: EntityId): Promise<void> {
    this.logger.verbose(`(AirlineCompanyLogic) deleting company: id=${id}`);
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
    this.logger.verbose(`(AirlineCompanyLogic) company deleted: id=${id}`);
  };

  async getAllAirlineCompanies (allowCachedValue: boolean): Promise<IAirlineCompany[]> {
    this.logger.debug(`(AirlineCompanyLogic) get all airline companies, allowCachedValue=${allowCachedValue}`);

    let result = allowCachedValue ? (await this.cache.getItem(AllAirlineCompaniesCacheKey) as IAirlineCompany[]) : undefined;
    if(!result) {
      result = (await this.dbRepository.airlineCompany.findMany({
        where: {
          isDeleted: false
        },
        select: AirlineCompanyInfoQuery.select
      })).map(MapAirlineCompany);
      await this.cache.setItem(AllAirlineCompaniesCacheKey, result);
    }

    this.logger.debug(`(AirlineCompanyLogic) get all airline companies, count=${result.length}, allowCachedValue=${allowCachedValue}`);
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData): Promise<EntityId> {
    this.logger.verbose('(AirlineCompanyLogic) creating airline company');

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

    this.logger.verbose(`(AirlineCompanyLogic) creating airline company - completed, id=${companyId}`);
    return companyId;
  }

  async getNearestCompany (allowCachedValue: boolean) : Promise<IAirlineCompany> {
    this.logger.debug(`(AirlineCompanyLogic) get nearest company, allowCachedValue=${allowCachedValue}`);

    let result = allowCachedValue ? (await this.cache.getItem(NearestAirlineCompanyCacheKey) as IAirlineCompany)  : undefined;
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

      this.logger.verbose(`(AirlineCompanyLogic) nearest company calculated - updating cache, id=${result.id}, name=${result.name.en}`);
      await this.cache.setItem(NearestAirlineCompanyCacheKey, result);
    }

    this.logger.debug(`(AirlineCompanyLogic) nearest company, id=${result.id}, name=${result.name.en}, allowCachedValue=${allowCachedValue}`);
    return result;
  }
}

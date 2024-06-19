import type { PrismaClient } from '@prisma/client';
import { type Storage, type StorageValue } from 'unstorage';
import orderBy from 'lodash-es/orderBy';
import { destr } from 'destr';
import { type IAppLogger, type IAirlineCompanyLogic, type IAirlineCompany, type IAirlineCompanyData, type EntityId } from './../../backend/app-facade/interfaces';
import { CurrentUserGeoLocation, DbVersionInitial, calculateDistanceKm, newUniqueId } from './../../backend/app-facade/implementation';
import { AirlineCompanyInfoQuery, MapAirlineCompany } from './queries';
import { mapDbGeoCoord } from './db';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.cache = cache;
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  deleteCompany =  async (id: EntityId): Promise<void> => {
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
    this.logger.verbose(`(AirlineCompanyLogic) company deleted: id=${id}`);
  };

  async getAllAirlineCompanies (): Promise<IAirlineCompany[]> {
    this.logger.debug('(AirlineCompanyLogic) get all airline companies');

    const result = (await this.dbRepository.airlineCompany.findMany({
      where: {
        isDeleted: false
      },
      select: AirlineCompanyInfoQuery.select
    })).map(MapAirlineCompany);

    this.logger.debug(`(AirlineCompanyLogic) get all airline companies, count=${result.length}`);
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
        numReviews: companyData.numReviews,
        reviewScore: companyData.reviewScore.toFixed(1),
        version: DbVersionInitial
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose(`(AirlineCompanyLogic) creating airline company - completed, id=${companyId}`);
    return companyId;
  }

  async getNearestCompany () : Promise<IAirlineCompany> {
    this.logger.debug('(AirlineCompanyLogic) get nearest company');

    const cacheKey = 'UserNearestAirlineCompany';
    const cached = await this.cache.getItem(cacheKey);
    if (!cached) {
      this.logger.verbose('(AirlineCompanyLogic) get nearest company, cache miss');

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
      const result = MapAirlineCompany(entity!);

      await this.cache.setItem(cacheKey, JSON.stringify(result));
      this.logger.verbose(`(AirlineCompanyLogic) nearest company calculated, id=${result.id}, name=${result.name.en}`);
      return result;
    }

    const result = destr<IAirlineCompany>(cached);
    this.logger.debug(`(AirlineCompanyLogic) nearest company, id=${result.id}, name=${result.name.en}`);
    return result;
  }
}

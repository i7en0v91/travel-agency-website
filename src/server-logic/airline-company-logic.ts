import { PrismaClient } from '@prisma/client';
import { type Storage, type StorageValue } from 'unstorage';
import orderBy from 'lodash-es/orderBy';
import { destr } from 'destr';
import { type IAirlineCompanyLogic, type IAirlineCompany, type IAirlineCompanyData, type EntityId } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { calculateDistanceKm } from '../shared/common';
import { CurrentUserGeoLocation, DbConcurrencyVersions } from '../shared/constants';
import { Queries, Mappers } from './queries';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly AllCompaniesCacheKey = 'AllAirlineCompanies';

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.cache = cache;
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async getAllAirlineCompanies (): Promise<IAirlineCompany[]> {
    this.logger.debug('(AirlineCompanyLogic) get all airline companies');

    let result = await this.cache.getItem(this.AllCompaniesCacheKey) as IAirlineCompany[];
    if (!result) {
      this.logger.verbose('(AirlineCompanyLogic) get all airline companies, cache miss');
      result = (await this.dbRepository.airlineCompany.findMany({
        where: {
          isDeleted: false
        },
        select: Queries.AirlineCompanyInfoQuery.select
      })).map(Mappers.MapAirlineCompany);
      await this.cache.setItem(this.AllCompaniesCacheKey, result);
    }

    this.logger.debug(`(AirlineCompanyLogic) get all airline companies, count=${result.length}`);
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData): Promise<EntityId> {
    this.logger.verbose('(AirlineCompanyLogic) creating airline company');

    const companyId = (await this.dbRepository.airlineCompany.create({
      data: {
        nameStr: {
          create: companyData.name
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
        reviewScore: companyData.reviewScore,
        version: DbConcurrencyVersions.InitialVersion
      },
      select: {
        id: true
      }
    })).id;
    this.logger.debug('(AirlineCompanyLogic) resetting all airline companies cache');
    await this.cache.removeItem(this.AllCompaniesCacheKey);

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

      const companiesDist = companiesGeo.map((x) => { return { id: x.id, distance: calculateDistanceKm({ lon: x.city.lon.toNumber(), lat: x.city.lat.toNumber() }, CurrentUserGeoLocation) }; });
      const nearestCompanyId = orderBy(companiesDist, ['distance'], ['asc'])[0].id;

      const entity = await this.dbRepository.airlineCompany.findFirst({
        where: {
          id: nearestCompanyId
        },
        ...Queries.AirlineCompanyInfoQuery
      });
      const result = Mappers.MapAirlineCompany(entity!);

      await this.cache.setItem(cacheKey, JSON.stringify(result));
      this.logger.verbose(`(AirlineCompanyLogic) nearest company calculated, id=${result.id}, name=${result.name.en}`);
      return result;
    }

    const result = destr<IAirlineCompany>(cached);
    this.logger.debug(`(AirlineCompanyLogic) nearest company, id=${result.id}, name=${result.name.en}`);
    return result;
  }
}

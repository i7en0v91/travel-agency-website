import { type Storage, type StorageValue } from 'unstorage';
import type { PrismaClient } from '@prisma/client';
import { type ICityShort, type ICityData, type ICountry, type ICountryData, type IGeoLogic, type EntityId, type GeoPoint, type DistanceUnitKm } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbVersionInitial, CurrentUserGeoLocation } from '../shared/constants';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';
import { calculateDistanceKm } from './../shared/common';

export class GeoLogic implements IGeoLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.cache = cache;
  }

  getAverageDistanceCacheKey = (cityId: EntityId): string => {
    return `AvgCityDistance-${cityId}`;
  };

  async getAverageDistance (cityId: EntityId): Promise<DistanceUnitKm> {
    this.logger.debug(`(GeoLogic) get average distance, cityId=${cityId}`);

    const cacheKey = this.getAverageDistanceCacheKey(cityId);
    let result: number | null = (await this.cache.getItem(cacheKey));
    if (result === null) {
      this.logger.verbose(`(GeoLogic) average distance, cache miss, cityId=${cityId}`);
      const entity = await this.dbRepository.city.findFirst({
        where: {
          id: cityId,
          isDeleted: false
        },
        select: {
          id: true,
          lon: true,
          lat: true
        }
      });
      if (!entity) {
        this.logger.warn(`(GeoLogic) cannot calculate average distance, city not found, cityId=${cityId}`);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'city not found', 'error-stub');
      }

      const cityLocation: GeoPoint = {
        lon: entity.lon.toNumber(),
        lat: entity.lat.toNumber()
      };
      result = calculateDistanceKm(CurrentUserGeoLocation, cityLocation);
      await this.cache.setItem(cacheKey, result);
      this.logger.verbose(`(GeoLogic) average distance calculated, cityId=${cityId}, distance=${result.toFixed(3)}`);
    }

    this.logger.debug(`(GeoLogic) average distance, cityId=${cityId}, distance=${result.toFixed(3)}`);
    return result;
  }

  async createCountry (data: ICountryData): Promise<EntityId> {
    this.logger.verbose(`(GeoLogic) creating country, name=${data.name.en}`);

    const countryId = (await this.dbRepository.country.create({
      data: {
        version: DbVersionInitial,
        isDeleted: false,
        nameStr: {
          create: data.name
        }
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose(`(GeoLogic) country created, name=${data.name.en}, id=${countryId}`);
    return countryId;
  }

  async createCity (data: ICityData): Promise<EntityId> {
    this.logger.verbose(`(GeoLogic) creating city, name=${data.name.en}, countryId=${data.countryId}`);

    const textForSearch = `${data.name.en} ${data.name.ru} ${data.name.fr}`.toLowerCase();
    const cityId = (await this.dbRepository.city.create({
      data: {
        version: DbVersionInitial,
        slug: data.slug,
        isDeleted: false,
        lat: data.geo.lat!,
        lon: data.geo.lon!,
        utcOffsetMin: data.utcOffsetMin,
        population: data.population,
        nameStr: {
          create: data.name
        },
        textForSearch,
        country: {
          connect: {
            id: data.countryId
          }
        }
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose(`(GeoLogic) city created, name=${data.name.en}, countryId=${data.countryId}, id=${cityId}`);
    return cityId;
  }

  async getAllCountries (): Promise<ICountry[]> {
    this.logger.verbose('(GeoLogic) obtaining list of all countries');

    const countryEntities = await this.dbRepository.country.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        createdUtc: true,
        modifiedUtc: true,
        nameStr: true
      }
    });
    const result: ICountry[] = countryEntities.map(c => <ICountry>{
      createdUtc: c.createdUtc,
      modifiedUtc: c.modifiedUtc,
      id: c.id,
      isDeleted: false,
      name: c.nameStr
    });

    this.logger.verbose(`(GeoLogic) list of all countries obtained, size=${result.length}`);
    return result;
  }

  async getAllCities (): Promise<ICityShort[]> {
    this.logger.verbose('(GeoLogic) obtaining list of all cities');

    const cityEntities = await this.dbRepository.city.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        createdUtc: true,
        modifiedUtc: true,
        nameStr: true,
        lon: true,
        lat: true,
        slug: true
      }
    });
    const result = cityEntities.map(c => <ICityShort>{
      id: c.id,
      createdUtc: c.createdUtc,
      modifiedUtc: c.modifiedUtc,
      isDeleted: false,
      name: c.nameStr,
      slug: c.slug,
      geo: {
        lat: c.lat.toNumber(),
        lon: c.lon.toNumber()
      }
    });

    this.logger.verbose(`(GeoLogic) list of all cities obtained, size=${result.length}`);
    return result;
  }
}

import { calculateDistanceKm, AppException, AppExceptionCodeEnum, DbVersionInitial, CurrentUserGeoLocation, newUniqueId, type IAppLogger, type ICountry, type EntityId, type GeoPoint, type DistanceUnitKm, formatAppCacheKey } from '@golobe-demo/shared';
import type { ICityShort, ICityData, ICountryData, IGeoLogic } from './../types';
import type { Storage, StorageValue } from 'unstorage';
import { AverageCityDistanceCacheKey } from './../helpers/utils';
import type { PrismaClient } from '@prisma/client';
import { mapDbGeoCoord, mapGeoCoord } from '../helpers/db';
import isNumber from 'lodash-es/isNumber';

export class GeoLogic implements IGeoLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'GeoLogic' });
    this.dbRepository = dbRepository;
    this.cache = cache;
  }

  async deleteCountry(id: EntityId): Promise<void> {
    this.logger.verbose('deleting country', id);
    await this.dbRepository.country.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('country deleted', id);
  };

  getAverageDistanceCacheKey = (cityId: EntityId): string => {
    return formatAppCacheKey(AverageCityDistanceCacheKey, cityId.toString());
  };

  async getAverageDistance (cityId: EntityId): Promise<DistanceUnitKm> {
    this.logger.debug('get average distance', cityId);

    const cacheKey = this.getAverageDistanceCacheKey(cityId);
    let result: StorageValue | null = (await this.cache.getItem(cacheKey));
    if (result === null || !isNumber(result)) {
      this.logger.verbose('average distance, cache miss', cityId);
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
        this.logger.warn('cannot calculate average distance, city not found', undefined, cityId);
        throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'city not found', 'error-stub');
      }

      const cityLocation: GeoPoint = {
        lon: mapDbGeoCoord(entity.lon),
        lat: mapDbGeoCoord(entity.lat)
      };
      result = calculateDistanceKm(CurrentUserGeoLocation, cityLocation);
      await this.cache.setItem(cacheKey, result);
      this.logger.verbose('average distance calculated', { cityId, distance: result.toFixed(3) });
    }

    this.logger.debug('average distance', { cityId, distance: result.toFixed(3) });
    return result;
  }

  async createCountry (data: ICountryData): Promise<EntityId> {
    this.logger.verbose('creating country', { name: data.name.en });

    const countryId = (await this.dbRepository.country.create({
      data: {
        id: newUniqueId(),
        version: DbVersionInitial,
        isDeleted: false,
        nameStr: {
          create: { 
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.name
          }
        }
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose('country created', { name: data.name.en, id: countryId });
    return countryId;
  }

  async createCity (data: ICityData): Promise<EntityId> {
    this.logger.verbose('creating city', { name: data.name.en, countryId: data.countryId });

    const textForSearch = `${data.name.en} ${data.name.ru} ${data.name.fr}`.toLowerCase();
    const cityId = (await this.dbRepository.city.create({
      data: {
        id: newUniqueId(),
        version: DbVersionInitial,
        slug: data.slug,
        isDeleted: false,
        lat: mapGeoCoord(data.geo.lat!),
        lon: mapGeoCoord(data.geo.lon!),
        utcOffsetMin: data.utcOffsetMin,
        population: data.population,
        nameStr: {
          create: { 
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.name
          }
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

    this.logger.verbose('city created', { name: data.name.en, countryId: data.countryId, id: cityId });
    return cityId;
  }

  async getAllCountries (): Promise<ICountry[]> {
    this.logger.verbose('obtaining list of all countries');

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

    this.logger.verbose('list of all countries obtained', { size: result.length });
    return result;
  }

  async getAllCities (): Promise<ICityShort[]> {
    this.logger.verbose('obtaining list of all cities');

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
        lat: mapDbGeoCoord(c.lat),
        lon: mapDbGeoCoord(c.lon)
      }
    });

    this.logger.verbose('list of all cities obtained', { size: result.length });
    return result;
  }
}

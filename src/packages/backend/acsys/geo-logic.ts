import { newUniqueId, DbVersionInitial, type PreviewMode, type IAppLogger, type ICountry, type EntityId, type DistanceUnitKm } from '@golobe-demo/shared';
import type { ICityShort, ICityData, ICountryData, IGeoLogic } from './../types';
import { mapGeoCoord, executeInTransaction } from './../helpers/db';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class GeoLogic implements IGeoLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly prismaImplementation: IGeoLogic;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['geoLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IGeoLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteCountry(id: EntityId): Promise<void> {
    this.logger.debug(`(GeoLogic-Acsys) deleting country: id=${id}`);
    await this.prismaImplementation.deleteCountry(id);
    this.logger.debug(`(GeoLogic-Acsys) country deleted: id=${id}`);
  };

  async getAverageDistance (cityId: EntityId, allowCachedValue: boolean, previewMode: PreviewMode): Promise<DistanceUnitKm> {
    this.logger.debug(`(GeoLogic-Acsys) get average distance, cityId=${cityId}, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}`);

    let result: DistanceUnitKm;
    if(previewMode) {
      result = 1000;
    } else {
      result = await this.prismaImplementation.getAverageDistance(cityId, allowCachedValue, previewMode);
    }
    
    this.logger.debug(`(GeoLogic-Acsys) average distance, cityId=${cityId}, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}, distance=${result.toFixed(3)}`);
    return result;
  }

  async createCountry (data: ICountryData): Promise<EntityId> {
    this.logger.debug(`(GeoLogic-Acsys) creating country, name=${data.name.en}`);
    const countryId = await this.prismaImplementation.createCountry(data);
    this.logger.debug(`(GeoLogic-Acsys) country created, name=${data.name.en}, id=${countryId}`);
    return countryId;
  }

  async createCity (data: ICityData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(GeoLogic-Acsys) creating city, name=${data.name.en}, countryId=${data.countryId}, previewMode=${previewMode}`);

    let cityId: EntityId | undefined;
    if(previewMode) {
      cityId = await executeInTransaction(async () => {
        const nameStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.name
          },
          select: {
            id: true
          }
        })).id;

        return (await this.dbRepository.acsysDraftsCity.create({
          data: {
            id: newUniqueId(),
            nameStrId,
            countryId: data.countryId,
            lat: mapGeoCoord(data.geo.lat),
            lon: mapGeoCoord(data.geo.lon),
            population: data.population,
            slug: data.slug,
            utcOffsetMin: data.utcOffsetMin,
            textForSearch: `${data.name.en} ${data.name.ru} ${data.name.fr}`.toLowerCase(),
            version: DbVersionInitial
          },
          select: {
            id: true
          }
        })).id;
      }, this.dbRepository);
    } else {
      cityId = await this.prismaImplementation.createCity(data, previewMode);
    }
    
    this.logger.debug(`(GeoLogic-Acsys) city created, name=${data.name.en}, countryId=${data.countryId}, id=${cityId}, previewMode=${previewMode}`);
    return cityId;
  }

  async getAllCountries (): Promise<ICountry[]> {
    this.logger.debug(`(GeoLogic-Acsys) obtaining list of all countries`);
    const result = await this.prismaImplementation.getAllCountries();
    this.logger.debug(`(GeoLogic-Acsys) list of all countries obtained, size=${result.length}`);
    return result;
  }

  async getAllCities (previewMode: PreviewMode): Promise<ICityShort[]> {
    this.logger.debug(`(GeoLogic-Acsys) obtaining list of all cities, previewMode=${previewMode}`);
    let result: ICityShort[];
    if(previewMode) {
      const resolvedCities = await this.acsysDraftsEntitiesResolver.resolveCities({});
      result = Array.from(resolvedCities.items.values()).map(city => {
        return <ICityShort>{
          createdUtc: city.createdUtc,
          geo: city.geo,
          id: city.id,
          isDeleted: city.isDeleted,
          modifiedUtc: city.modifiedUtc,
          name: city.name,
          slug: city.slug,
          previewMode: city.previewMode
        };
      });
    } else {
      result = await this.prismaImplementation.getAllCities(previewMode);
    }
    
    this.logger.debug(`(GeoLogic-Acsys) list of all cities obtained, size=${result.length}`);
    return result;
  }
}

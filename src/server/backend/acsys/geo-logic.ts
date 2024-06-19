import { type IAppLogger, type ICityShort, type ICityData, type ICountry, type ICountryData, type IGeoLogic, type EntityId, type DistanceUnitKm } from './../app-facade/interfaces';
import type { GeoLogic as GeoLogicPrisma } from '../services/geo-logic';

export class GeoLogic implements IGeoLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: GeoLogicPrisma;

  public static inject = ['geoLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: GeoLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteCountry(id: EntityId): Promise<void> {
    this.logger.debug(`(GeoLogic-Acsys) deleting country: id=${id}`);
    await this.prismaImplementation.deleteCountry(id);
    this.logger.debug(`(GeoLogic-Acsys) country deleted: id=${id}`);
  };

  async getAverageDistance (cityId: EntityId): Promise<DistanceUnitKm> {
    this.logger.debug(`(GeoLogic-Acsys) get average distance, cityId=${cityId}`);
    const result = await this.prismaImplementation.getAverageDistance(cityId);
    this.logger.debug(`(GeoLogic-Acsys) average distance, cityId=${cityId}, distance=${result.toFixed(3)}`);
    return result;
  }

  async createCountry (data: ICountryData): Promise<EntityId> {
    this.logger.debug(`(GeoLogic-Acsys) creating country, name=${data.name.en}`);
    const countryId = await this.prismaImplementation.createCountry(data);
    this.logger.debug(`(GeoLogic-Acsys) country created, name=${data.name.en}, id=${countryId}`);
    return countryId;
  }

  async createCity (data: ICityData): Promise<EntityId> {
    this.logger.debug(`(GeoLogic-Acsys) creating city, name=${data.name.en}, countryId=${data.countryId}`);
    const cityId = await this.prismaImplementation.createCity(data);
    this.logger.debug(`(GeoLogic-Acsys) city created, name=${data.name.en}, countryId=${data.countryId}, id=${cityId}`);
    return cityId;
  }

  async getAllCountries (): Promise<ICountry[]> {
    this.logger.debug('(GeoLogic-Acsys) obtaining list of all countries');
    const result = await this.prismaImplementation.getAllCountries();
    this.logger.debug(`(GeoLogic-Acsys) list of all countries obtained, size=${result.length}`);
    return result;
  }

  async getAllCities (): Promise<ICityShort[]> {
    this.logger.debug('(GeoLogic-Acsys) obtaining list of all cities');
    const result = await this.prismaImplementation.getAllCities();
    this.logger.debug(`(GeoLogic-Acsys) list of all cities obtained, size=${result.length}`);
    return result;
  }
}

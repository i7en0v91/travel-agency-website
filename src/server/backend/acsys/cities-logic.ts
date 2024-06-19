import { type ICitiesSearchQuery, type IAppLogger, type EntityId, type ICitiesLogic, type ICitySearchItem, type ICity, type IPopularCityData, type IPopularCityItem, type ITravelDetails } from './../../backend/app-facade/interfaces';
import type { CitiesLogic as CitiesLogicPrisma } from '../services/cities-logic';

export class CitiesLogic implements ICitiesLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: CitiesLogicPrisma;
  
  public static inject = ['citiesLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: CitiesLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteCity (id: EntityId): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) deleting city: id=${id}`);
    await this.prismaImplementation.deleteCity(id);
    this.logger.debug(`(CitiesLogic-Acsys) city deleted: id=${id}`);
  };

  async getCity (slug: string): Promise<ICity> {
    this.logger.debug(`(CitiesLogic-Acsys) loading city, slug=${slug}`);
    const result = await this.prismaImplementation.getCity(slug);
    this.logger.debug(`(CitiesLogic-Acsys) city loaded, slug=${slug}, id=${result.id}`);
    return result;
  }

  async makeCityPopular (data: IPopularCityData): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) adding popular city data, cityId=${data.cityId}`);
    await this.prismaImplementation.makeCityPopular(data);
    this.logger.debug(`(CitiesLogic-Acsys) popular city data added, cityId=${data.cityId}`);
  }

  async getTravelDetails (cityId: EntityId): Promise<Omit<ITravelDetails, 'price'>> {
    this.logger.debug(`(CitiesLogic-Acsys) city travel details requested, cityId=${cityId}`);
    const result = await this.prismaImplementation.getTravelDetails(cityId);
    this.logger.debug(`(CitiesLogic-Acsys) city travel details loaded, cityId=${cityId}, numImages=${result.images.length}, lastModified=${result.city.modifiedUtc}`);
    return result;
  }

  async setPopularCityImages (id: EntityId, images: { id: EntityId, order: number }[]): Promise<void> {
    this.logger.debug(`(CitiesLogic-Acsys) setting popular city images, cityId=${id}, images=${JSON.stringify(images)}`);
    const result = await this.prismaImplementation.setPopularCityImages(id, images);
    this.logger.debug(`(CitiesLogic-Acsys) popular city images have been set, id=${id}, images=${JSON.stringify(images)}`);
    return result;
  }

  async getPopularCities (): Promise<IPopularCityItem[]> {
    this.logger.debug('(CitiesLogic-Acsys) obtaining list of popular cities');
    const result = await this.prismaImplementation.getPopularCities();
    this.logger.debug(`(CitiesLogic-Acsys) list of popular cities obtained, count=${result.length}`);
    return result;
  }

  async search (query: ICitiesSearchQuery): Promise<ICitySearchItem[]> {
    this.logger.debug(`(CitiesLogic-Acsys) searching cities: locale=${query.locale}, size=${query.size}, term=${query.searchTerm}, includeCountry=${query.includeCountry}`);
    const result = await this.prismaImplementation.search(query);
    this.logger.debug(`(CitiesLogic-Acsys) search cities completed: locale=${query.locale}, size=${query.size}, term=${query.searchTerm}, includeCountry=${query.includeCountry}, count=${result.length}`);
    return result;
  }
}

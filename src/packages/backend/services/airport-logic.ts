import { AppException, AppExceptionCodeEnum, DbVersionInitial, newUniqueId, type IAppLogger, type EntityId, type IAirport, type EntityDataAttrsOnly } from '@golobe-demo/shared';
import type { PrismaClient } from '@prisma/client';
import type { IAirportLogic, IAirportShort, IAirportData, ICitiesLogic } from './../types';
import uniq from 'lodash-es/uniq';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';
import { AirportInfoQuery, MapAirport } from './queries';
import { mapGeoCoord } from '../helpers/db';

export class AirportLogic implements IAirportLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private citiesLogic: ICitiesLogic;

  public static inject = ['citiesLogic', 'logger', 'dbRepository'] as const;
  constructor (citiesLogic: ICitiesLogic, logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'AirportLogic' });
    this.dbRepository = dbRepository;
    this.citiesLogic = citiesLogic;
  }

  async deleteAirport(id: EntityId): Promise<void> {
    this.logger.verbose('deleting airport', id);
    await this.dbRepository.airport.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('airport deleted', id);
  };

  async getAirportsForSearch (citySlugs: string[], addPopular: boolean): Promise<EntityDataAttrsOnly<IAirport>[]> {
    this.logger.debug('get airports for search, city', { slugs: citySlugs, addPopular });

    if (addPopular) {
      const popularCities = await this.citiesLogic.getPopularCities(false);
      citySlugs.push(...popularCities.map(c => c.slug));
      citySlugs = uniq(citySlugs);
    }

    if (citySlugs.length === 0) {
      this.logger.debug('get airports for search, empty city slug list');
      return [];
    }

    const allAirportsInCities = (await this.dbRepository.airport.findMany({
      where: {
        city: {
          slug: {
            in: citySlugs
          },
          isDeleted: false
        },
        isDeleted: false
      },
      select: AirportInfoQuery.select
    })).map(MapAirport);

    // take only one first airport in each city in case it has more than 1 airport
    const result = values(groupBy(allAirportsInCities, (a: IAirport) => a.city.slug)).map(g => g[0]);

    this.logger.debug('get airports for search, city', { slugs: citySlugs, addPopular, count: result.length });
    return result;
  }

  async getAirport (id: EntityId): Promise<IAirport> {
    this.logger.debug('get', { airportId: id });

    const entity = await this.dbRepository.airport.findFirst({
      where: {
        id,
        isDeleted: false
      },
      select: AirportInfoQuery.select
    });
    if (!entity) {
      this.logger.warn('airport not found', undefined, { airportId: id });
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'airport not found', 'error-stub');
    }

    const result = MapAirport(entity);

    this.logger.debug('get', { airportId: id, result: result.name.en });
    return result;
  }

  async getAllAirportsShort (): Promise<IAirportShort[]> {
    this.logger.verbose('listing all airports (short');

    const airports = await this.dbRepository.airport.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        nameStr: true
      }
    });
    const result = airports.map(a => <IAirportShort>{ id: a.id, name: a.nameStr });

    this.logger.verbose('all airports listed (short', { result: result.length });
    return result;
  }

  async createAirport (data: IAirportData): Promise<EntityId> {
    this.logger.verbose('creating airport', { name: data.name.en });

    const airportId = (await this.dbRepository.airport.create({
      data: {
        id: newUniqueId(),
        version: DbVersionInitial,
        isDeleted: false,
        lat: mapGeoCoord(data.geo.lat!),
        lon: mapGeoCoord(data.geo.lon!),
        nameStr: {
          create: { 
            id: newUniqueId(),  
            version: DbVersionInitial,
            ...data.name 
          }
        },
        city: {
          connect: {
            id: data.cityId
          }
        }
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose('airport created', { name: data.name.en, id: airportId });
    return airportId;
  }
}

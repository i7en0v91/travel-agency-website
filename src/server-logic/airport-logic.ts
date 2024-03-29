import { PrismaClient } from '@prisma/client';
import uniq from 'lodash-es/uniq';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';
import { type IAirportLogic, type IAirportShort, type IAirportData, type EntityId, type IAirport, type MakeSearchResultEntity, type ICitiesLogic } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';
import { Queries, Mappers } from './queries';

export class AirportLogic implements IAirportLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private citiesLogic: ICitiesLogic;

  public static inject = ['citiesLogic', 'logger', 'dbRepository'] as const;
  constructor (citiesLogic: ICitiesLogic, logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.citiesLogic = citiesLogic;
  }

  async getAirportsForSearch (citySlugs: string[], addPopular: boolean): Promise<MakeSearchResultEntity<IAirport>[]> {
    this.logger.debug(`(AirportLogic) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}`);

    if (addPopular) {
      const popularCities = await this.citiesLogic.getPopularCities();
      citySlugs.push(...popularCities.map(c => c.slug));
      citySlugs = uniq(citySlugs);
    }

    if (citySlugs.length === 0) {
      this.logger.debug('(AirportLogic) get airports for search, empty city slug list');
      return [];
    }

    const allAirportsInCities = (await this.dbRepository.airport.findMany({
      where: {
        city: {
          slug: {
            in: citySlugs
          }
        },
        isDeleted: false
      },
      select: Queries.AirportInfoQuery.select
    })).map(Mappers.MapAirport);

    // take only one first airport in each city in case it has more than 1 airport
    const result = values(groupBy(allAirportsInCities, (a: IAirport) => a.city.slug)).map(g => g[0]);

    this.logger.debug(`(AirportLogic) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}, count=${result.length}`);
    return result;
  }

  async getAirport (id: EntityId): Promise<IAirport> {
    this.logger.debug(`(AirportLogic) get, airportId=${id}`);

    const entity = await this.dbRepository.airport.findFirst({
      where: {
        id,
        isDeleted: false
      },
      select: Queries.AirportInfoQuery.select
    });
    if (!entity) {
      this.logger.warn(`(AirportLogic) airport not found, airportId=${id}`);
      throw new AppException(AppExceptionCodeEnum.OBJECT_NOT_FOUND, 'airport not found', 'error-stub');
    }

    const result = Mappers.MapAirport(entity);

    this.logger.debug(`(AirportLogic) get, airportId=${id}, result=${result.name.en}`);
    return result;
  }

  async getAllAirportsShort (): Promise<IAirportShort[]> {
    this.logger.verbose('(AirportLogic) listing all airports (short)');

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

    this.logger.verbose(`(AirportLogic) all airports listed (short), result=${result.length}`);
    return result;
  }

  async createAirport (data: IAirportData): Promise<EntityId> {
    this.logger.verbose(`(AirportLogic) creating airport, name=${data.name.en}`);

    const airportId = (await this.dbRepository.airport.create({
      data: {
        version: DbConcurrencyVersions.InitialVersion,
        isDeleted: false,
        lat: data.geo.lat!,
        lon: data.geo.lon!,
        nameStr: {
          create: data.name
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

    this.logger.verbose(`(AirportLogic) airport created, name=${data.name.en}, id=${airportId}`);
    return airportId;
  }
}

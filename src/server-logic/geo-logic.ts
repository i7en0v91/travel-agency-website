import { PrismaClient } from '@prisma/client';
import { type ICityShort, type ICityData, type ICountry, type ICountryData, type IGeoLogic, type EntityId } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';

export class GeoLogic implements IGeoLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async createCountry (data: ICountryData): Promise<EntityId> {
    this.logger.verbose(`(GeoLogic) creating country, name=${data.name.en}`);

    const countryId = (await this.dbRepository.country.create({
      data: {
        version: DbConcurrencyVersions.InitialVersion,
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
        version: DbConcurrencyVersions.InitialVersion,
        slug: data.slug,
        isDeleted: false,
        lat: data.geo.lat!,
        lon: data.geo.lon!,
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

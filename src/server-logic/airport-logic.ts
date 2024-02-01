import { PrismaClient } from '@prisma/client';
import { type IAirportLogic, type IAirportShort, type IAirportData, type EntityId } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';

export class AirportLogic implements IAirportLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async getAllAirports (): Promise<IAirportShort[]> {
    this.logger.verbose('(AirportLogic) listing all airports');

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

    this.logger.verbose(`(AirportLogic) all airports listed, result=${result.length}`);
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

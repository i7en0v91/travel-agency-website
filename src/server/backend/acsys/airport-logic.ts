import { type IAppLogger, type IAirportLogic, type IAirportShort, type IAirportData, type EntityId, type IAirport, type EntityDataAttrsOnly } from './../../backend/app-facade/interfaces';
import type { AirportLogic as AirportLogicPrisma  } from '../services/airport-logic';

export class AirportLogic implements IAirportLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: AirportLogicPrisma;

  public static inject = ['airportLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: AirportLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }
  
  deleteAirport =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(AirportLogic-Acsys) deleting airport: id=${id}`);
    await this.prismaImplementation.deleteAirport(id);
    this.logger.debug(`(AirportLogic-Acsys) airport deleted: id=${id}`);
  };

  async getAirportsForSearch (citySlugs: string[], addPopular: boolean): Promise<EntityDataAttrsOnly<IAirport>[]> {
    this.logger.debug(`(AirportLogic-Acsys) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}`);
    const result = await this.prismaImplementation.getAirportsForSearch(citySlugs, addPopular);
    this.logger.debug(`(AirportLogic-Acsys) get airports for search, city slugs=[${citySlugs.join(', ')}], addPopular=${addPopular}, count=${result.length}`);
    return result;
  }

  async getAirport (id: EntityId): Promise<IAirport> {
    this.logger.debug(`(AirportLogic-Acsys) get, airportId=${id}`);
    const result = await this.prismaImplementation.getAirport(id);
    this.logger.debug(`(AirportLogic-Acsys) get, airportId=${id}, result=${result.name.en}`);
    return result;
  }

  async getAllAirportsShort (): Promise<IAirportShort[]> {
    this.logger.debug('(AirportLogic-Acsys) listing all airports (short)');
    const result = await this.prismaImplementation.getAllAirportsShort();
    this.logger.debug(`(AirportLogic-Acsys) all airports listed (short), result=${result.length}`);
    return result;
  }

  async createAirport (data: IAirportData): Promise<EntityId> {
    this.logger.debug(`(AirportLogic-Acsys) creating airport, name=${data.name.en}`);
    const airportId = await this.prismaImplementation.createAirport(data);
    this.logger.debug(`(AirportLogic-Acsys) airport created, name=${data.name.en}, id=${airportId}`);
    return airportId;
  }
}

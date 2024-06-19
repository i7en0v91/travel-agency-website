import { type IAppLogger, type IAirplane, type EntityId, type IAirplaneLogic, type IAirplaneData } from './../../backend/app-facade/interfaces';
import type { AirplaneLogic as AirplaneLogicPrisma } from '../services/airplane-logic';

export class AirplaneLogic implements IAirplaneLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: AirplaneLogicPrisma;

  public static inject = ['airplaneLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: AirplaneLogicPrisma, logger: IAppLogger) {
    this.prismaImplementation = prismaImplementation;
    this.logger = logger;
  }

  async deleteAirplane (id: EntityId): Promise<void> {
    this.logger.debug(`(AirplaneLogic-Acsys) deleting airplane: id=${id}`);
    await this.prismaImplementation.deleteAirplane(id);
    this.logger.debug(`(AirplaneLogic-Acsys) airplane deleted: id=${id}`);
  };

  async getAllAirplanes (): Promise<IAirplane[]> {
    this.logger.debug('(AirplaneLogic-Acsys) get all airplanes');
    const result = await this.prismaImplementation.getAllAirplanes();
    this.logger.debug(`(AirplaneLogic-Acsys) get all airplanes, count=${result.length}`);
    return result;
  }

  async createAirplane (data: IAirplaneData): Promise<EntityId> {
    this.logger.debug('(AirplaneLogic) creating airplane');
    const airplaneId = await this.prismaImplementation.createAirplane(data);
    this.logger.debug(`(AirplaneLogic) creating airplane - completed, id=${airplaneId}`);
    return airplaneId;
  }
}

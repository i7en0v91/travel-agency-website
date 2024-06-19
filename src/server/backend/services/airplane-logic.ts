import type { PrismaClient } from '@prisma/client';
import { type IAppLogger, type IAirplane, type EntityId, type IAirplaneLogic, type IAirplaneData } from './../../backend/app-facade/interfaces';
import { DbVersionInitial, newUniqueId } from './../../backend/app-facade/implementation';
import { AirplaneInfoQuery, MapAirplane } from './queries';

export class AirplaneLogic implements IAirplaneLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async deleteAirplane(id: EntityId): Promise<void> {
    this.logger.verbose(`(AirplaneLogic) deleting airplane: id=${id}`);
    await this.dbRepository.$transaction(async () => {
      await this.dbRepository.airplaneImage.updateMany({
        where: {
          airplane: {
            id
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.airplane.update({
        where: {
          id,
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
    });
    this.logger.verbose(`(AirplaneLogic) airplane deleted: id=${id}`);
  };

  async getAllAirplanes (): Promise<IAirplane[]> {
    this.logger.debug('(AirplaneLogic) get all airplanes');

    const result = (await this.dbRepository.airplane.findMany({
      where: {
        isDeleted: false
      },
      select: AirplaneInfoQuery.select
    })).map(MapAirplane);

    this.logger.debug(`(AirplaneLogic) get all airplanes, count=${result.length}`);
    return result;
  }

  async createAirplane (data: IAirplaneData): Promise<EntityId> {
    this.logger.verbose('(AirplaneLogic) creating airplane');

    const airplaneId = await this.dbRepository.$transaction(async () => {
      const entityId = (await this.dbRepository.airplane.create({
        data: {
          id: newUniqueId(),
          nameStr: {
            create: { 
              id: newUniqueId(),
              version: DbVersionInitial,
              ...data.name
            }
          },
          isDeleted: false,
          version: DbVersionInitial
        },
        select: {
          id: true
        }
      })).id;

      for (let i = 0; i < data.images.length; i++) {
        const imageData = data.images[i];
        await this.dbRepository.airplaneImage.create({
          data: {
            id: newUniqueId(),
            airplaneId: entityId,
            imageId: imageData.imageId,
            kind: imageData.kind,
            orderNum: imageData.order,
            isDeleted: false,
            version: DbVersionInitial
          }
        });
      }

      return entityId;
    });

    this.logger.verbose(`(AirplaneLogic) creating airplane - completed, id=${airplaneId}`);
    return airplaneId;
  }
}

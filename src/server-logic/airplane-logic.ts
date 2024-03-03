import { PrismaClient } from '@prisma/client';
import { type Storage, type StorageValue } from 'unstorage';
import { type IAirplane, type EntityId, type IAirplaneLogic, type IAirplaneData } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';
import { Queries, Mappers } from './queries';

export class AirplaneLogic implements IAirplaneLogic {
  private readonly AllAirplanesCacheKey = 'AllAirplanes';

  private logger: IAppLogger;
  private dbRepository: PrismaClient;
  private cache: Storage<StorageValue>;

  public static inject = ['cache', 'dbRepository', 'logger'] as const;
  constructor (cache: Storage<StorageValue>, dbRepository: PrismaClient, logger: IAppLogger) {
    this.cache = cache;
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async getAllAirplanes (): Promise<IAirplane[]> {
    this.logger.debug('(AirplaneLogic) get all airplanes');

    let result = await this.cache.getItem(this.AllAirplanesCacheKey) as IAirplane[];
    if (!result) {
      this.logger.verbose('(AirplaneLogic) get all airplanes, cache miss');
      result = (await this.dbRepository.airplane.findMany({
        where: {
          isDeleted: false
        },
        select: Queries.AirplaneInfoQuery.select
      })).map(Mappers.MapAirplane);
      await this.cache.setItem(this.AllAirplanesCacheKey, result);
    }

    this.logger.debug(`(AirplaneLogic) get all airplanes, count=${result.length}`);
    return result;
  }

  async createAirplane (data: IAirplaneData): Promise<EntityId> {
    this.logger.verbose('(AirplaneLogic) creating airplane');

    const airplaneId = await this.dbRepository.$transaction(async () => {
      const entityId = (await this.dbRepository.airplane.create({
        data: {
          nameStr: {
            create: data.name
          },
          isDeleted: false,
          version: DbConcurrencyVersions.InitialVersion
        },
        select: {
          id: true
        }
      })).id;

      for (let i = 0; i < data.images.length; i++) {
        const imageData = data.images[i];
        await this.dbRepository.airplaneImage.create({
          data: {
            airplaneId: entityId,
            imageId: imageData.imageId,
            kind: imageData.kind,
            order: imageData.order,
            isDeleted: false,
            version: DbConcurrencyVersions.InitialVersion
          }
        });
      }

      return entityId;
    });

    this.logger.debug('(AirplaneLogic) resetting all airplanes cache');
    await this.cache.removeItem(this.AllAirplanesCacheKey);

    this.logger.verbose(`(AirplaneLogic) creating airplane - completed, id=${airplaneId}`);
    return airplaneId;
  }
}

import { type IAirplaneData, EntityChangeSubscribersOrder, DbVersionInitial, newUniqueId, type IAppLogger, type IAirplane, type EntityId, formatAppCacheKey } from '@golobe-demo/shared';
import type { EntityChangeNotificationCallbackArgs, EntityChangeNotificationCallback, EntityChangeNotificationSubscriberId, IEntityChangeNotificationTask, IAirplaneLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import { AllAirplanesCacheKey } from './../helpers/utils';
import type { Storage, StorageValue } from 'unstorage';
import { AirplaneInfoQuery, MapAirplane } from './queries';
import { executeInTransaction } from './../helpers/db';

export class AirplaneLogic implements IAirplaneLogic {
  private readonly AirplanesCacheKey = formatAppCacheKey(AllAirplanesCacheKey);

  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly cache: Storage<StorageValue>;
  private readonly entityChangeNotifications: IEntityChangeNotificationTask;

  public static inject = ['dbRepository', 'entityChangeNotifications', 'cache', 'logger'] as const;
  constructor (dbRepository: PrismaClient, entityChangeNotifications: IEntityChangeNotificationTask, cache: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'AirplaneLogic' });
    this.dbRepository = dbRepository;
    this.cache = cache;
    this.entityChangeNotifications = entityChangeNotifications;
  }

  async initialize(): Promise<void> {
    this.subscribeForEntityChanges();
  }

  subscribeForEntityChanges = () => {
    this.logger.verbose('subscribing for airplane entities changes');

    const subscriberId = this.entityChangeNotifications.subscribeForChanges({
      target: [{
        entity: 'Airplane',
        ids: 'all'
      }],
      order: EntityChangeSubscribersOrder.AirplaneLogic
    }, this.entityChangeCallback);

    this.logger.verbose('subscribed for airplane entities changes', subscriberId);
  };

  entityChangeCallback: EntityChangeNotificationCallback = async (_: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs): Promise<void> => {
    this.logger.debug('entities change callback');
    if(args.target === 'too-much' || (args.target.find(x => x.entity === 'Airplane')?.ids.length ?? 0) > 0) {
      await this.clearAirplanesCache();
    }
    this.logger.debug('entities change callback completed');
  };

  async deleteAirplane(id: EntityId): Promise<void> {
    this.logger.verbose('deleting airplane', id);
    await executeInTransaction(async () => {
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
    }, this.dbRepository);
    await this.clearAirplanesCache();
    this.logger.verbose('airplane deleted', id);
  };

  async getAllAirplanes (allowCachedValue: boolean): Promise<IAirplane[]> {
    this.logger.debug('get all airplanes');

    let entries = allowCachedValue ? (await this.cache.getItem(this.AirplanesCacheKey) as IAirplane[]) : undefined;
    if(!entries) {
      entries = (await this.dbRepository.airplane.findMany({
        where: {
          isDeleted: false
        },
        select: AirplaneInfoQuery.select
      })).map(MapAirplane);

      this.logger.debug('airplanes loaded - updating cache', { count: entries.length, allowCachedValue });
      await this.cache.setItem(this.AirplanesCacheKey, entries);
    }

    this.logger.debug('get all airplanes', { count: entries.length });
    return entries;
  }

  async createAirplane (data: IAirplaneData): Promise<EntityId> {
    this.logger.verbose('creating airplane');

    const airplaneId = await executeInTransaction(async () => {
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
    }, this.dbRepository);
    await this.clearAirplanesCache();

    this.logger.verbose('creating airplane - completed', { id: airplaneId });
    return airplaneId;
  }

  async clearAirplanesCache(): Promise<void> {
    this.logger.verbose('clearing airplanes cache');
    await this.cache.removeItem(this.AirplanesCacheKey);
  }
}

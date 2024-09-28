import { type IAirplaneData, DbVersionInitial, newUniqueId, type PreviewMode, type IAppLogger, type IAirplane, type EntityId } from '@golobe-demo/shared';
import { type IAirplaneLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class AirplaneLogic implements IAirplaneLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IAirplaneLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['airplaneLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IAirplaneLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.prismaImplementation = prismaImplementation;
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async initialize(): Promise<void> {
    this.logger.debug('(AirplaneLogic-Acsys) initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('(AirplaneLogic-Acsys) initialized');
  };

  async deleteAirplane (id: EntityId): Promise<void> {
    this.logger.debug(`(AirplaneLogic-Acsys) deleting airplane: id=${id}`);

    const deleted = (await this.dbRepository.acsysDraftsAirplane.updateMany({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    })).count > 0;
    if(!deleted) {
      this.logger.debug(`(AirlineCompanyLogic-Acsys) no airplanes have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteAirplane(id);
    }
    
    this.logger.debug(`(AirplaneLogic-Acsys) airplane deleted: id=${id}`);
  };

  async getAllAirplanes (allowCachedValue: boolean, previewMode: PreviewMode): Promise<IAirplane[]> {
    this.logger.debug(`(AirplaneLogic-Acsys) get all airplanes, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}`);
    let result: IAirplane[];
    if(previewMode) {
      const resolvedAirplanes = (await this.acsysDraftsEntitiesResolver.resolveAirplanes({}));
      result = Array.from(resolvedAirplanes.items.values());
    } else {
      result = await this.prismaImplementation.getAllAirplanes(allowCachedValue, previewMode);
    }
    this.logger.debug(`(AirplaneLogic-Acsys) get all airplanes, count=${result.length}, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}`);
    return result;
  }

  async createAirplane (data: IAirplaneData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(AirplaneLogic-Acsys) creating airplane, previewMode=${previewMode}`);

    let airplaneId: EntityId;
    if(previewMode) {
      airplaneId = await this.dbRepository.$transaction(async () => {
        const nameStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.name
          },
          select: {
            id: true
          }
        })).id;

        const draftAirplaneId = (await this.dbRepository.acsysDraftsAirplane.create({
          data: {
            id: newUniqueId(),
            nameStrId,
            version: DbVersionInitial
          },
          select: {
            id: true
          }
        })).id;

        for(let i = 0; i < data.images.length; i++) {
          const imageData = data.images[i];
          await this.dbRepository.acsysDraftsAirplaneImage.create({
            data: {
              id: newUniqueId(),
              airplaneId: draftAirplaneId,
              imageId: imageData.imageId,
              kind: imageData.kind.valueOf(),
              orderNum: imageData.order,
              version: DbVersionInitial
            },
            select: {
              id: true
            }
          });
        }

        return draftAirplaneId;
      });
    } else {
      airplaneId = await this.prismaImplementation.createAirplane(data, previewMode);
    }

    this.logger.debug(`(AirplaneLogic-Acsys) creating airplane - completed, id=${airplaneId}, previewMode=${previewMode}`);
    return airplaneId;
  }
}

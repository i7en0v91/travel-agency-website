import { type IImageData, ImageCategory, newUniqueId, DbVersionInitial, type PreviewMode, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import { type IImageLogic, type IAuthFormImageLogic, type AuthFormImageData, type IAuthFormImageInfo } from './../types';
import { type EventHandlerRequest, type H3Event } from 'h3';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import type { PrismaClient } from '@prisma/client';
import isString from 'lodash-es/isString';
import { executeInTransaction } from './../helpers/db';

export class AuthFormImageLogic implements IAuthFormImageLogic {
  private readonly logger: IAppLogger;
  private readonly imageLogic: IImageLogic;
  private readonly prismaImplementation: IAuthFormImageLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['authFormImageLogicPrisma', 'imageLogic', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IAuthFormImageLogic, imageLogic: IImageLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.imageLogic = imageLogic;
    this.prismaImplementation = prismaImplementation;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
    this.dbRepository = dbRepository;
  }

  private async createWithImageId(imageId: EntityId, order: number, previewMode: PreviewMode): Promise<string> {
    let resultId: EntityId;
    if(previewMode) {
      this.logger.debug(`(AuthFormImageLogic-Acsys) saving auth form image entity, imageId=${imageId}`);
      resultId = (await this.dbRepository.acsysDraftsAuthFormImage.create({
        data: {
          id: newUniqueId(),
          orderNum: order,
          version: DbVersionInitial,
          isDeleted: false,
          imageId
        },
        select: {
          id: true
        }
      })).id;
    } else {
      resultId = await this.prismaImplementation.createImage(imageId, order, previewMode);
    }
    return resultId;
  };

  private async createFromImageData(imageData: AuthFormImageData, order: number, previewMode: PreviewMode): Promise<string> {
    let resultId: EntityId;
    if(previewMode) {
      resultId = await executeInTransaction(async () => {
        const imgParams: IImageData = {
          bytes: imageData.bytes,
          category: ImageCategory.AuthFormsImage,
          invertForDarkTheme: false,
          mimeType: imageData.mimeType,
          slug: imageData.slug,
          stubCssStyle: undefined,
          originalName: imageData.originalName,
          ownerId: undefined
        };
        const image = (await this.imageLogic.createImage(imgParams, undefined, previewMode));
    
        this.logger.debug(`(AuthFormImageLogic-Acsys) saving auth form image entity, i${resultId}`, imageData);
        resultId = newUniqueId();
        await this.dbRepository.acsysDraftsAuthFormImage.create({
          data: {
            id: resultId,
            orderNum: order,
            version: DbVersionInitial,
            isDeleted: false,
            imageId: image.id
          }
        });

        return resultId;
      }, this.dbRepository);
    } else {
      resultId = await this.prismaImplementation.createImage(imageData, order, previewMode);
    }
    return resultId;
  };

  async createImage(imageData: EntityId | AuthFormImageData, order: number, previewMode: PreviewMode): Promise<string> {
    this.logger.debug(`(AuthFormImageLogic-Acsys) creating auth form image, order=${order}, previewMode=${previewMode}`, imageData);
    const resultId = isString(imageData) ? this.createWithImageId(imageData, order, previewMode) : this.createFromImageData(imageData, order, previewMode);
    this.logger.debug(`(AuthFormImageLogic-Acsys) auth form image created, id=${resultId}, order=${order}, previewMode=${previewMode}`, imageData);
    return resultId;
  };

  async getAllImages(event: H3Event<EventHandlerRequest>, previewMode: PreviewMode): Promise<IAuthFormImageInfo[]> {
    this.logger.debug(`(AuthFormImageLogic-Acsys) get all auth form images, previewMode=${previewMode}`);

    let result: IAuthFormImageInfo[];
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveAuthFormImages({ });
      result = Array.from(resolveResult.items.values());
    } else {
      result = await this.prismaImplementation.getAllImages(event, previewMode);
    }
    
    this.logger.debug(`(AuthFormImageLogic-Acsys) returning all auth form images, count=${result.length}, previewMode=${previewMode}`);
    return result;
  };

  async deleteImage(id: EntityId): Promise<void> {
    this.logger.debug(`(AuthFormImageLogic-Acsys) deleting auth form image, id=${id}`);

    const deleted = (await this.dbRepository.acsysDraftsAuthFormImage.updateMany({
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
      this.logger.debug(`(AuthFormImageLogic-Acsys) no auth form images have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteImage(id);
    }

    this.logger.debug(`(AuthFormImageLogic-Acsys) auth form image deleted, id=${id}`);
  };
}

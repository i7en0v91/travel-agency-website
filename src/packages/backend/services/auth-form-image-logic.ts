import { type IImageData, DbVersionInitial, ImageCategory, newUniqueId, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import type { IAuthFormImageLogic, IAuthFormImageInfo, AuthFormImageData, IImageLogic } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { H3Event } from 'h3';
import isString from 'lodash-es/isString';
import orderBy from 'lodash-es/orderBy';
import { executeInTransaction } from './../helpers/db';

export class AuthFormImageLogic implements IAuthFormImageLogic {
  private readonly logger: IAppLogger;
  private readonly imageLogic: IImageLogic;
  private readonly dbRepository: PrismaClient;
  
  public static inject = ['imageLogic', 'dbRepository', 'logger'] as const;
  constructor (imageLogic: IImageLogic, dbRepository: PrismaClient, logger: IAppLogger) {
    this.imageLogic = imageLogic;
    this.logger = logger.addContextProps({ component: 'AuthFormImageLogic' });
    this.dbRepository = dbRepository;
  }

  async createImage(imageData: AuthFormImageData | EntityId, order: number): Promise<EntityId> {
    this.logger.verbose('creating auth form image', order);

    const resultId = newUniqueId();
    let imgId: EntityId;
    if(isString(imageData)) {
      imgId = imageData;
      this.logger.debug('saving auth form image entity', { imageId: imgId });
      await this.dbRepository.authFormImage.create({
        data: {
          id: resultId,
          orderNum: order,
          version: DbVersionInitial,
          isDeleted: false,
          image: {
            connect: {
              id: imgId
            }
          }
        }
      });
    } else {
      await executeInTransaction(async () => {
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
        const image = (await this.imageLogic.createImage(imgParams, undefined, false));
        imgId = image.id;
    
        this.logger.debug('saving auth form image entity', { id: resultId });
        await this.dbRepository.authFormImage.create({
          data: {
            id: resultId,
            orderNum: order,
            version: DbVersionInitial,
            isDeleted: false,
            image: {
              connect: {
                id: image.id
              }
            }
          }
        });
      }, this.dbRepository);
    }
    
    this.logger.verbose('auth form image created', { id: resultId, order, imageId: imgId! });
    return resultId;
  };

  async getAllImages(event: H3Event): Promise<IAuthFormImageInfo[]> {
    this.logger.debug('get all auth form images');

    const authFormImageInfoMap = new Map<EntityId, IAuthFormImageInfo>((await this.dbRepository.authFormImage.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        image: {
          select: {
            id: true
          }
        },
        orderNum: true,
        createdUtc: true,
        modifiedUtc: true
      }
    })).map(x => [x.image.id, <IAuthFormImageInfo>{ 
      id: x.id, 
      isDeleted: false,
      order: x.orderNum,
      createdUtc: x.createdUtc,
      modifiedUtc: x.modifiedUtc
    }]));

    const allAuthFormImageInfos = await this.imageLogic.getAllImagesByCategory(ImageCategory.AuthFormsImage, false, false);
    const allAuthFormImages = await this.imageLogic.resolveImageFiles(allAuthFormImageInfos, event, false);

    this.logger.debug('mapping images info', { count: allAuthFormImages.length });
    const result: IAuthFormImageInfo[] = orderBy(allAuthFormImages.filter(i => authFormImageInfoMap.has(i.id)).map(e => {
      const authImageInfo = authFormImageInfoMap.get(e.id)!;
      return {
        ...authImageInfo,
        image: {
          slug: e.slug,
          timestamp: e.file.modifiedUtc.getTime()
        }
      };
    }), i => i.order, ['asc']);

    this.logger.debug('returning all auth form images', { count: result.length });
    return result;
  };

  async deleteImage(id: EntityId): Promise<void> {
    this.logger.verbose('deleting auth form image', id);

    await executeInTransaction(async () => {
      await this.dbRepository.image.updateMany({
        where: {
          authFormImage: {
            id
          },
          isDeleted: false
        },
        data: {
          isDeleted: true,
          version: { increment: 1 }
        }
      });
      await this.dbRepository.authFormImage.update({
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

    this.logger.verbose('auth form image deleted', id);
  }
}

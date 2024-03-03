import { Prisma, PrismaClient } from '@prisma/client';
import isString from 'lodash-es/isString';
import Mime from 'mime';
import { type IAppLogger } from '../../shared/applogger';
import { type IImageBytes, type EntityId, ImageCategory, type IImageInfo, type IImageLogic, type ImageCheckAccessResult, ImageAuthRequiredCategories, ImagePublicSlugs, type IImageData, type IFileLogic, type Timestamp, type IImageCategoryLogic } from '../../shared/interfaces';
import { Queries, Mappers } from '../queries';
import { AppException, AppExceptionCodeEnum } from '../../shared/exceptions';
import { mapEnumValue } from './../helpers/db';

export class ImageLogic implements IImageLogic {
  private readonly logger: IAppLogger;
  private readonly fileLogic: IFileLogic;
  private readonly dbRepository: PrismaClient;
  private readonly imageCategoryLogic: IImageCategoryLogic;

  public static inject = ['dbRepository', 'fileLogic', 'imageCategoryLogic', 'logger'] as const;
  constructor (dbRepository: PrismaClient, fileLogic: IFileLogic, imageCategoryLogic: IImageCategoryLogic, logger: IAppLogger) {
    this.logger = logger;
    this.fileLogic = fileLogic;
    this.dbRepository = dbRepository;
    this.imageCategoryLogic = imageCategoryLogic;
  }

  getIdQueryFilter (idOrSlug: EntityId | string, category: ImageCategory, userId?: EntityId): Prisma.ImageWhereUniqueInput {
    if (isString(idOrSlug)) {
      return { slug: idOrSlug, category: { kind: mapEnumValue(category) }, file: { isDeleted: false, ownerId: userId } };
    } else {
      return { id: idOrSlug, category: { kind: mapEnumValue(category) }, file: { isDeleted: false, ownerId: userId } };
    }
  }

  async createImage (data: IImageData): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.verbose(`(ImageLogic) creating image, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, fileName=${data.originalName}, length=${data.bytes.length}`);

    if (data.originalName && !data.mimeType) {
      data.mimeType = Mime.getType(data.originalName) ?? undefined;
    }
    const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos()).get(data.category)!.id;
    const result = await this.dbRepository.$transaction(async () => {
      const fileCreationResult = await this.fileLogic.createFile(data);
      const imageEntity = await this.dbRepository.image.create({
        data: {
          slug: data.slug,
          categoryId,
          stubCssStyle: data.stubCssStyle ? JSON.stringify(data.stubCssStyle) : undefined,
          invertForDarkTheme: data.invertForDarkTheme ?? false,
          fileId: fileCreationResult.id
        },
        select: {
          id: true
        }
      });
      return { id: imageEntity.id, timestamp: fileCreationResult.timestamp };
    });

    this.logger.verbose(`(ImageLogic) image created, id=${result.id}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, fileName=${data.originalName}, length=${data.bytes.length}`);
    return result;
  }

  /**
   *
   * @param imageId Id of image to update
   * @param data Attributes of imaeg to update
   * @param imageFileId Optional, if provided, used for optimization to skip additional DB request for obtaining image file ID
   */
  async updateImage (imageId: EntityId, data: Partial<IImageData>, imageFileId?: EntityId): Promise<{ timestamp: Timestamp }> {
    this.logger.verbose(`(ImageLogic) updating image, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);

    if (!imageFileId) {
      const fileInfo = await this.dbRepository.image.findFirst({
        where: {
          id: imageId
        },
        include: {
          file: {
            select: {
              id: true
            }
          }
        }
      });
      if (!fileInfo || !fileInfo.file) {
        this.logger.warn(`(ImageLogic) cannot update image because it is not found: imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
        throw new AppException(
          AppExceptionCodeEnum.OBJECT_NOT_FOUND,
          'Cannot update image as it is not found',
          'error-stub');
      }
      imageFileId = fileInfo.file.id;
    }

    if (data.originalName && !data.mimeType) {
      data.mimeType = Mime.getType(data.originalName) ?? undefined;
    }
    const categoryId = data.category ? (await this.imageCategoryLogic.getImageCategoryInfos()).get(data.category)!.id : undefined;
    let timestamp: Timestamp = 0;
    await this.dbRepository.$transaction(async () => {
      timestamp = (await this.fileLogic.updateFile(imageFileId!, data, true)).timestamp;
      await this.dbRepository.image.updateMany({
        where: {
          id: imageId
        },
        data: {
          slug: data.slug,
          categoryId,
          stubCssStyle: undefined,
          ...(data.invertForDarkTheme !== undefined ? { invertForDarkTheme: data.invertForDarkTheme } : {})
        }
      });
    });

    this.logger.verbose(`(ImageLogic) image updated, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
    return { timestamp };
  }

  async checkAccess (idOrSlug: string | number, category: ImageCategory, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug(`(ImageLogic) checking access, id=${idOrSlug}, category=${category}, userId=${userId}`);
    if (!ImageAuthRequiredCategories.includes(category)) {
      this.logger.debug(`(ImageLogic) access granted, category is unprotected, id=${idOrSlug}, category=${category}, userId=${userId}`);
      return 'unprotected';
    }
    if (ImagePublicSlugs.includes(idOrSlug.toString())) {
      this.logger.debug(`(ImageLogic) access granted, public slug, id=${idOrSlug}, category=${category}, userId=${userId}`);
      return 'unprotected';
    }

    if (!userId) {
      this.logger.warn(`(ImageLogic) image can be accessed only by authorized users-owners, id=${idOrSlug}, category=${category}`);
      return 'denied';
    }

    const isOwner = await this.dbRepository.image.count({
      where: this.getIdQueryFilter(idOrSlug, category, userId)
    }) > 0;
    if (!isOwner) { // generally not an expected situation
      const exists = await this.dbRepository.image.count({
        where: this.getIdQueryFilter(idOrSlug, category, undefined)
      }) > 0;
      if (!exists) {
        this.logger.warn(`(ImageLogic) image was not found, id=${idOrSlug}, category=${category}, userId=${userId}`);
        return undefined;
      }
    }

    this.logger.debug(`(ImageLogic) access ${isOwner ? 'granted' : 'denied'}, id=${idOrSlug}, category=${category}, userId=${userId}`);
    return isOwner ? 'granted' : 'denied';
  }

  async findImage (idOrSlug: EntityId | string, category: ImageCategory): Promise<IImageInfo | undefined> {
    this.logger.verbose(`(ImageLogic) loading image info, id=${idOrSlug}, category=${category}`);
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(idOrSlug, category, undefined),
      select: Queries.ImageInfoQuery.select
    });
    if (!queryResult) {
      this.logger.warn(`(ImageLogic) cannot found image, id=${idOrSlug}`);
      return undefined;
    }
    const result = Mappers.MapImageInfo(queryResult);
    this.logger.verbose(`(ImageLogic) image bytes loaded, id=${idOrSlug}`);
    return result;
  }

  async getImageBytes (idOrSlug: EntityId | string, category: ImageCategory): Promise<IImageBytes | undefined> {
    this.logger.verbose(`(ImageLogic) loading image bytes, id=${idOrSlug}, category=${category}`);
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(idOrSlug, category, undefined),
      select: { file: { select: { bytes: true, mime: true, modifiedUtc: true } } }
    });
    if (!queryResult) {
      this.logger.warn(`(ImageLogic) cannot found image, id=${idOrSlug}`);
      return undefined;
    }
    const result: IImageBytes = { bytes: queryResult.file.bytes, mimeType: queryResult.file.mime ?? undefined, modifiedUtc: queryResult.file.modifiedUtc! };
    this.logger.verbose(`(ImageLogic) image bytes loaded, id=${idOrSlug}, mime=${result.mimeType}, size=${result.bytes.byteLength}`);
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory): Promise<IImageInfo[]> {
    this.logger.debug(`(ImageLogic) accessing all images by category=${category}`);

    if (ImageAuthRequiredCategories.includes(category)) {
      throw new AppException(
        AppExceptionCodeEnum.BAD_REQUEST,
        `Access all images by [${category}] category failed, category requires authorization checks`,
        'error-stub');
    }

    const queryResult = await this.dbRepository.image.findMany({
      where: { category: { kind: mapEnumValue(category) }, file: { isDeleted: false } },
      select: Queries.ImageInfoQuery.select,
      orderBy: { id: 'desc' }
    });
    const result = queryResult.map(Mappers.MapImageInfo);

    this.logger.debug(`(ImageLogic) images by category: category=${category}, count=${result.length}`);
    return result;
  }
}

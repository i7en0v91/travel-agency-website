import type { Prisma, PrismaClient } from '@prisma/client';
import type { IImageFileInfoUnresolved, IAppLogger, ImageCategory, IImageBytes, EntityId, IImageInfo, IImageLogic, IImageData, IFileLogic, Timestamp, IImageCategoryLogic , ImageCheckAccessResult, PreviewMode } from '../app-facade/interfaces';
import { CachedResultsInAppServicesEnabled, AppException, AppExceptionCodeEnum, ImageAuthRequiredCategories, ImagePublicSlugs, newUniqueId, DbVersionInitial } from '../app-facade/implementation';
import { ImageInfoQuery, MapImageInfo } from './queries';
import { mapEnumValue } from '../helpers/db';
import { type H3Event } from 'h3';

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

  deleteImage =  async (id: EntityId): Promise<void> => {
    this.logger.verbose(`(ImageLogic) deleting image: id=${id}`);
    await this.dbRepository.image.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose(`(ImageLogic) image deleted: id=${id}`);
  };

  getIdQueryFilter (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, userId?: EntityId): Prisma.ImageWhereUniqueInput {
    if (slug) {
      return { slug, category: { kind: mapEnumValue(category) }, ownerId: userId, isDeleted: false };
    } else {
      return { id, category: { kind: mapEnumValue(category) }, ownerId: userId, isDeleted: false };
    }
  }

  async createImage (data: IImageData, userId: EntityId | undefined, event: H3Event): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.verbose(`(ImageLogic) creating image, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}`);

    const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id;
    const result = await this.dbRepository.$transaction(async () => {
      const fileCreationResult = await this.fileLogic.createFile(data, userId, event);
      const imageEntity = await this.dbRepository.image.create({
        data: {
          id: newUniqueId(),
          slug: data.slug,
          categoryId,
          stubCssStyle: data.stubCssStyle ? JSON.stringify(data.stubCssStyle) : undefined,
          invertForDarkTheme: data.invertForDarkTheme ?? false,
          fileId: fileCreationResult.id,
          ownerId: data.ownerId,
          version: DbVersionInitial
        },
        select: {
          id: true
        }
      });
      return { id: imageEntity.id, timestamp: fileCreationResult.timestamp };
    });

    this.logger.verbose(`(ImageLogic) image created, id=${result.id}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}`);
    return result;
  }

  /**
   *
   * @param imageId Id of image to update
   * @param data Attributes of imaeg to update
   * @param imageFileId Optional, if provided, used for optimization to skip additional DB request for obtaining image file ID
   */
  async updateImage (imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event): Promise<{ timestamp: Timestamp }> {
    this.logger.verbose(`(ImageLogic) updating image, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);

    if (!imageFileId) {
      const fileInfo = await this.dbRepository.image.findFirst({
        where: {
          id: imageId,
          isDeleted: false
        },
        select: {
          fileId: true
        }
      });
      if (!fileInfo || !fileInfo.fileId) {
        this.logger.warn(`(ImageLogic) cannot update image because it is not found: imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
        throw new AppException(
          AppExceptionCodeEnum.OBJECT_NOT_FOUND,
          'Cannot update image as it is not found',
          'error-stub');
      }
      imageFileId = fileInfo.fileId;
    }

    const categoryId = data.category ? (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id : undefined;
    let timestamp: Timestamp = 0;
    await this.dbRepository.$transaction(async () => {
      const updateResult = (await this.fileLogic.updateFile(imageFileId!, data, userId, true, event));
      timestamp = updateResult.timestamp;
      await this.dbRepository.image.updateMany({
        where: {
          id: imageId,
          isDeleted: false
        },
        data: {
          fileId: updateResult.id,
          slug: data.slug,
          categoryId,
          stubCssStyle: undefined,
          ownerId: data.ownerId,
          version: { increment: 1 },
          ...(data.invertForDarkTheme !== undefined ? { invertForDarkTheme: data.invertForDarkTheme } : {})
        }
      });
    });

    this.logger.verbose(`(ImageLogic) image updated, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
    return { timestamp };
  }

  async checkAccess (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, _: PreviewMode, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug(`(ImageLogic) checking access, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
    if (!ImageAuthRequiredCategories.includes(category)) {
      this.logger.debug(`(ImageLogic) access granted, category is unprotected, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
      return 'unprotected';
    }
    if (slug && ImagePublicSlugs.includes(slug.toString())) {
      this.logger.debug(`(ImageLogic) access granted, public slug, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
      return 'unprotected';
    }

    if (!userId) {
      this.logger.warn(`(ImageLogic) image can be accessed only by authorized users-owners, id=${id}, slug=${slug}, category=${category}`);
      return 'denied';
    }

    const isOwner = await this.dbRepository.image.count({
      where: this.getIdQueryFilter(id, slug, category, userId)
    }) > 0;
    if (!isOwner) { // generally not an expected situation
      const exists = await this.dbRepository.image.count({
        where: this.getIdQueryFilter(id, slug, category, undefined)
      }) > 0;
      if (!exists) {
        this.logger.warn(`(ImageLogic) image was not found, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
        return undefined;
      }
    }

    this.logger.debug(`(ImageLogic) access ${isOwner ? 'granted' : 'denied'}, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
    return isOwner ? 'granted' : 'denied';
  }

  async findImage (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageInfo | undefined> {
    this.logger.verbose(`(ImageLogic) loading image info, id=${id}, slug=${slug}, category=${category}`);
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(id, slug, category, undefined),
      select: ImageInfoQuery.select
    });
    if (!queryResult) {
      this.logger.warn(`(ImageLogic) cannot found image, id=${id}, slug=${slug}`);
      return undefined;
    }

    const resultFileUnresolved = MapImageInfo(queryResult);
    this.logger.debug(`(ImageLogic) find image - resoving file, id=${id}, slug=${slug}, fileId=${resultFileUnresolved.fileId}`);
    const fileInfos = await this.fileLogic.findFiles([resultFileUnresolved.fileId], event);
    if (!fileInfos?.length) {
      this.logger.warn(`(ImageLogic) cannot found file, id=${id}, slug=${slug}, fileId=${resultFileUnresolved.fileId}`);
      return undefined;
    }

    const result: IImageInfo = {
      ...resultFileUnresolved,
      file: fileInfos[0]
    };
    this.logger.verbose(`(ImageLogic) image bytes loaded, id=${id}, slug=${slug}`);
    return result;
  }

  async getImagesByIds(ids: EntityId[]): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug(`(ImageLogic) loading image infos by ids, count=${ids.length}`);

    const queryResult = await this.dbRepository.image.findMany({
      where: {
        id: {
          in: ids
        },
        isDeleted: false
      },
      select: ImageInfoQuery.select
    });
    
    const result = queryResult.map(q => { return MapImageInfo(q); });
    this.logger.debug(`(ImageLogic) image infos by ids loaded, req count=${ids.length}, result count=${result.length}`);
    return result;
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageBytes | undefined> {
    this.logger.verbose(`(ImageLogic) loading image bytes, id=${id}, slug=${slug}, category=${category}`);
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(id, slug, category, undefined),
      select: { fileId: true }
    });
    if (!queryResult) {
      this.logger.warn(`(ImageLogic) cannot found image, id=${id}, slug=${slug}`);
      return undefined;
    }
    const fileId = queryResult?.fileId;
    if (!fileId) {
      this.logger.warn(`(ImageLogic) file not linked, id=${id}, slug=${slug}`);
      return undefined;
    }

    const fileData = await this.fileLogic.getFileData(fileId, event);
    if(!fileData) {
      this.logger.warn(`(ImageLogic) file not found, id=${id}, slug=${slug}, fileId=${fileId}`);
      return undefined;
    }

    const result: IImageBytes = { bytes: fileData.bytes, mimeType: fileData.mime ?? undefined, modifiedUtc: fileData.modifiedUtc! };
    this.logger.verbose(`(ImageLogic) image bytes loaded, id=${id}, slug=${slug}, mime=${result.mimeType}, size=${result.bytes.byteLength}`);
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory, skipAuthChecks: boolean): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug(`(ImageLogic) accessing all images by category=${category}, skipAuthChecks=${skipAuthChecks}`);

    if (!skipAuthChecks && ImageAuthRequiredCategories.includes(category)) {
      throw new AppException(
        AppExceptionCodeEnum.BAD_REQUEST,
        `Access all images by [${category}] category failed, category requires authorization checks`,
        'error-stub');
    }

    const queryResult = await this.dbRepository.image.findMany({
      where: { category: { kind: mapEnumValue(category) }, isDeleted: false },
      select: ImageInfoQuery.select,
      orderBy: { id: 'desc' }
    });
    const resultFileUnresolved = queryResult.map(MapImageInfo);

    this.logger.debug(`(ImageLogic) images by category: category=${category}, skipAuthChecks=${skipAuthChecks}, count=${resultFileUnresolved.length}`);
    return resultFileUnresolved;
  }

  async resolveImageFiles(imageInfos: IImageFileInfoUnresolved[], event: H3Event): Promise<IImageInfo[]> {
    this.logger.debug(`(ImageLogic) resolving image files, count=${imageInfos.length}`);

    const result = [] as IImageInfo[];
    for(let i = 0; i < imageInfos.length; i++) {
      const unresolvedInfo = imageInfos[i];
      this.logger.debug(`(ImageLogic) find image - resoving file, id=${unresolvedInfo.id}, slug=${unresolvedInfo.slug}, fileId=${unresolvedInfo.fileId}`);    
      const fileInfos = await this.fileLogic.findFiles([unresolvedInfo.fileId], event);
      if (!fileInfos?.length) {
        this.logger.warn(`(ImageLogic) cannot found file, id=${unresolvedInfo.id}, slug=${unresolvedInfo.slug}, fileId=${unresolvedInfo.fileId}`);
        continue;
      }
      result.push({
        ...unresolvedInfo,
        file: fileInfos[0]
      });
    }

    this.logger.debug(`(ImageLogic) image files resolved, result count=${result.length} (of requested count=${imageInfos.length})`);
    return result;
  }
}

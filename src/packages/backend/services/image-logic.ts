import { CachedResultsInAppServicesEnabled, type IImageData, type IImageInfo, AppException, AppExceptionCodeEnum, ImageAuthRequiredCategories, ImagePublicSlugs, newUniqueId, DbVersionInitial, type IAppLogger, type ImageCategory, type EntityId, type Timestamp, type PreviewMode } from '@golobe-demo/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { IImageLogic, IFileLogic, IImageBytes, IImageFileInfoUnresolved, IImageCategoryLogic, ImageCheckAccessResult } from './../types';
import { ImageInfoQuery, MapImageInfo } from './queries';
import { mapEnumDbValue, executeInTransaction } from '../helpers/db';
import type { H3Event } from 'h3';

export class ImageLogic implements IImageLogic {
  private readonly logger: IAppLogger;
  private readonly fileLogic: IFileLogic;
  private readonly dbRepository: PrismaClient;
  private readonly imageCategoryLogic: IImageCategoryLogic;

  public static inject = ['dbRepository', 'fileLogic', 'imageCategoryLogic', 'logger'] as const;
  constructor (dbRepository: PrismaClient, fileLogic: IFileLogic, imageCategoryLogic: IImageCategoryLogic, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'ImageLogic' });
    this.fileLogic = fileLogic;
    this.dbRepository = dbRepository;
    this.imageCategoryLogic = imageCategoryLogic;
  }

  deleteImage =  async (id: EntityId): Promise<void> => {
    this.logger.verbose('deleting image', id);
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
    this.logger.verbose('image deleted', id);
  };

  getIdQueryFilter (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, userId?: EntityId): Prisma.ImageWhereUniqueInput {
    if (slug) {
      return { slug, category: { kind: mapEnumDbValue(category) }, ownerId: userId, isDeleted: false };
    } else {
      return { id, category: { kind: mapEnumDbValue(category) }, ownerId: userId, isDeleted: false };
    }
  }

  async createImage (data: IImageData, userId: EntityId | undefined): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.verbose('creating image', { slug: data.slug, category: data.category, ownerId: data.ownerId, userId, fileName: data.originalName, length: data.bytes.length });

    const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id;
    const result = await executeInTransaction(async () => {
      const fileCreationResult = await this.fileLogic.createFile(data, userId);
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
    }, this.dbRepository);

    this.logger.verbose('image created', { id: result.id, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, fileName: data.originalName, length: data.bytes.length });
    return result;
  }

  /**
   *
   * @param imageId Id of image to update
   * @param data Attributes of imaeg to update
   * @param imageFileId Optional, if provided, used for optimization to skip additional DB request for obtaining image file ID
   */
  async updateImage (imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event): Promise<{ timestamp: Timestamp }> {
    this.logger.verbose('updating image', { imageId, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, imageFileId, fileName: data.originalName, length: data.bytes?.length?.toString() ?? '[empty]' });

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
        this.logger.warn('cannot update image because it is not found', undefined, { imageId, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, imageFileId, fileName: data.originalName, length: data.bytes?.length?.toString() ?? '[empty]' });
        throw new AppException(
          AppExceptionCodeEnum.OBJECT_NOT_FOUND,
          'Cannot update image as it is not found',
          'error-stub');
      }
      imageFileId = fileInfo.fileId;
    }

    const categoryId = data.category ? (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id : undefined;
    let timestamp: Timestamp = 0;
    await executeInTransaction(async () => {
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
    }, this.dbRepository);

    this.logger.verbose('image updated', { imageId, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, imageFileId, fileName: data.originalName, length: data.bytes?.length?.toString() ?? '[empty]' });
    return { timestamp };
  }

  async checkAccess (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, _: PreviewMode, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug('checking access', { id, slug, category, userId });
    if (!ImageAuthRequiredCategories.includes(category)) {
      this.logger.debug('access granted, category is unprotected', { id, slug, category, userId });
      return 'unprotected';
    }
    if (slug && ImagePublicSlugs.includes(slug.toString())) {
      this.logger.debug('access granted, public slug', { id, slug, category, userId });
      return 'unprotected';
    }

    if (!userId) {
      this.logger.warn('image can be accessed only by authorized users-owners', undefined, { id, slug, category });
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
        this.logger.warn('image was not found', undefined, { id, slug, category, userId });
        return undefined;
      }
    }

    this.logger.debug('access status', { granted: isOwner, id, slug, category, userId });
    return isOwner ? 'granted' : 'denied';
  }

  async findImage (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageInfo | undefined> {
    this.logger.verbose('loading image info', { id, slug, category });
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(id, slug, category, undefined),
      select: ImageInfoQuery.select
    });
    if (!queryResult) {
      this.logger.warn('cannot found image', undefined, { id, slug });
      return undefined;
    }

    const resultFileUnresolved = MapImageInfo(queryResult);
    this.logger.debug('find image - resoving file', { id, slug, fileId: resultFileUnresolved.fileId });
    const fileInfos = await this.fileLogic.findFiles([resultFileUnresolved.fileId], event);
    if (!fileInfos?.length) {
      this.logger.warn('cannot found file', undefined, { id, slug, fileId: resultFileUnresolved.fileId });
      return undefined;
    }

    const result: IImageInfo = {
      ...resultFileUnresolved,
      file: fileInfos[0]
    };
    this.logger.verbose('image bytes loaded', { id, slug });
    return result;
  }

  async getImagesByIds(ids: EntityId[]): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug('loading image infos by ids', { count: ids.length });

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
    this.logger.debug('image infos by ids loaded', { reqCount: ids.length, resCount: result.length });
    return result;
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageBytes | undefined> {
    this.logger.verbose('loading image bytes', { id, slug, category });
    const queryResult = await this.dbRepository.image.findFirst({
      where: this.getIdQueryFilter(id, slug, category, undefined),
      select: { fileId: true }
    });
    if (!queryResult) {
      this.logger.warn('get image bytes - cannot found image', undefined, { id, slug });
      return undefined;
    }
    const fileId = queryResult?.fileId;
    if (!fileId) {
      this.logger.warn('file not linked', undefined, { id, slug });
      return undefined;
    }

    const fileData = await this.fileLogic.getFileData(fileId, event);
    if(!fileData) {
      this.logger.warn('file not found', undefined, { id, slug, fileId });
      return undefined;
    }

    const result: IImageBytes = { bytes: fileData.bytes, mimeType: fileData.mime ?? undefined, modifiedUtc: fileData.modifiedUtc! };
    this.logger.verbose('image bytes loaded', { id, slug, mime: result.mimeType, size: result.bytes.byteLength });
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory, skipAuthChecks: boolean): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug('accessing all images by', { category, skipAuthChecks });

    if (!skipAuthChecks && ImageAuthRequiredCategories.includes(category)) {
      throw new AppException(
        AppExceptionCodeEnum.BAD_REQUEST,
        `Access all images by [${category}] category failed, category requires authorization checks`,
        'error-stub');
    }

    const queryResult = await this.dbRepository.image.findMany({
      where: { category: { kind: mapEnumDbValue(category) }, isDeleted: false },
      select: ImageInfoQuery.select,
      orderBy: { id: 'desc' }
    });
    const resultFileUnresolved = queryResult.map(MapImageInfo);

    this.logger.debug('images by category', { category, skipAuthChecks, count: resultFileUnresolved.length });
    return resultFileUnresolved;
  }

  async resolveImageFiles(imageInfos: IImageFileInfoUnresolved[], event: H3Event): Promise<IImageInfo[]> {
    this.logger.debug('resolving image files', { count: imageInfos.length });

    const result = [] as IImageInfo[];
    for(let i = 0; i < imageInfos.length; i++) {
      const unresolvedInfo = imageInfos[i];
      this.logger.debug('find image - resoving file', { id: unresolvedInfo.id, slug: unresolvedInfo.slug, fileId: unresolvedInfo.fileId });    
      const fileInfos = await this.fileLogic.findFiles([unresolvedInfo.fileId], event);
      if (!fileInfos?.length) {
        this.logger.warn('cannot found file', undefined, { id: unresolvedInfo.id, slug: unresolvedInfo.slug, fileId: unresolvedInfo.fileId });
        continue;
      }
      result.push({
        ...unresolvedInfo,
        file: fileInfos[0]
      });
    }

    this.logger.debug('image files resolved', { rescount: result.length, reqCount: imageInfos.length });
    return result;
  }
}

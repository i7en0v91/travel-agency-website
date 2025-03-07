import { CachedResultsInAppServicesEnabled, type IImageInfo, type IImageData, type PreviewMode, type IAppLogger, type ImageCategory, type EntityId, type Timestamp, DbVersionInitial, newUniqueId } from '@golobe-demo/shared';
import type { ImageCheckAccessResult, IFileLogic, IImageCategoryLogic, IImageFileInfoUnresolved, IImageBytes, IImageLogic } from './../types';
import { ImageInfoQuery, MapImageInfo } from './../services/queries';
import type { EventHandlerRequest, H3Event } from 'h3';
import type { PrismaClient, Prisma } from '@prisma/client';
import { type AcsysDraftEntitiesResolver, UnresolvedEntityThrowingCondition } from './acsys-draft-entities-resolver';
import omit from 'lodash-es/omit';
import { executeInTransaction } from './../helpers/db';

export class ImageLogic implements IImageLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly prismaImplementation: IImageLogic;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;
  private readonly imageCategoryLogic: IImageCategoryLogic;
  private readonly fileLogic: IFileLogic;

  public static inject = ['imageCategoryLogic', 'fileLogic', 'imageLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (imageCategoryLogic: IImageCategoryLogic, fileLogic: IFileLogic, prismaImplementation: IImageLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'ImageLogic-Acsys' });
    this.dbRepository = dbRepository;
    this.imageCategoryLogic = imageCategoryLogic;
    this.fileLogic = fileLogic;
    this.prismaImplementation = prismaImplementation;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  getIdQueryFilter (id: EntityId | undefined, slug: string | undefined, categoryId: EntityId, userId?: EntityId): Prisma.AcsysDraftsImageWhereUniqueInput {
    if (slug) {
      return { slug, categoryId, ownerId: userId, isDeleted: false };
    } else {
      return { id, categoryId, ownerId: userId, isDeleted: false };
    }
  }

  async deleteImage(id: EntityId): Promise<void> {
    this.logger.debug('deleting image', id);

    const deleted = (await this.dbRepository.acsysDraftsImage.updateMany({
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
      this.logger.debug('no images have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteImage(id);
    }

    this.logger.debug('image deleted', id);
  };

  async createImage (data: IImageData, userId: EntityId | undefined, previewMode: PreviewMode): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.debug('creating image', { slug: data.slug, category: data.category, ownerId: data.ownerId, userId, fileName: data.originalName, length: data.bytes.length, previewMode });

    let result: { id: EntityId, timestamp: Timestamp };
    if(previewMode) {
      const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id;
      result = await executeInTransaction(async () => {
        const fileCreationResult = await this.fileLogic.createFile(data, userId);
        const imageEntity = await this.dbRepository.acsysDraftsImage.create({
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
    } else {
      result = await this.prismaImplementation.createImage(data, userId, previewMode);
    }
    
    this.logger.debug('image created', { id: result.id, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, fileName: data.originalName, length: data.bytes.length, previewMode });
    return result;
  }

  async updateImage (imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event, previewMode: PreviewMode): Promise<{ timestamp: Timestamp }> {
    this.logger.debug('updating image', { imageId, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, imageFileId, fileName: data.originalName, length: data.bytes?.length?.toString() ?? '[empty]', previewMode });
    let result: { timestamp: Timestamp } | undefined;
    if(previewMode) {
      if (!imageFileId) {
        const fileInfo = await this.dbRepository.acsysDraftsImage.findFirst({
          where: {
            id: imageId,
            isDeleted: false
          },
          select: {
            fileId: true
          }
        });
        if (fileInfo?.fileId) {
          imageFileId = fileInfo.fileId;
        } else {
          this.logger.verbose('image file info does not exist in drafts, proceeding with published', { imageId, slug: data.slug, category: data.category });
          result = await this.prismaImplementation.updateImage(imageId, data, undefined, userId, event, previewMode); 
        }
      }

      if(!result) {
        const categoryId = data.category ? (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id : undefined;
        const timestamp = await executeInTransaction(async () => {
          const updateResult = (await this.fileLogic.updateFile(imageFileId!, data, userId, true, event));
          await this.dbRepository.acsysDraftsImage.updateMany({
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
          return updateResult.timestamp;
        }, this.dbRepository);
        result = { timestamp };
      }
    } else {
      result = await this.prismaImplementation.updateImage(imageId, data, imageFileId, userId, event, previewMode);
    }
    
    this.logger.debug('image updated', { imageId, slug: data.slug, category: data.category, ownerId: data.ownerId, userId, imageFileId, fileName: data.originalName, length: data.bytes?.length?.toString() ?? '[empty]', previewMode });
    return result;
  }

  async checkAccess (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, previewMode: PreviewMode, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug('checking access', { id, slug, category, previewMode, userId: userId ?? '' });
    let result: ImageCheckAccessResult | undefined;
    if(previewMode) {
      result = 'granted';
    } else {
      result = await this.prismaImplementation.checkAccess(id, slug, category, previewMode, userId);
    }
    this.logger.debug('access checked', { id, slug, category, userId, result, previewMode });
    return result;
  }

  async findImage (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageInfo | undefined> {
    this.logger.debug('loading image info', { id, slug, category, previewMode });

    let result: IImageInfo | undefined;
    if(previewMode) {
      const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(category)!.id;
      const queryResult = await this.dbRepository.acsysDraftsImage.findFirst({
        where: this.getIdQueryFilter(id, slug, categoryId, undefined),
        select: {
          ...(omit(ImageInfoQuery.select, 'category')),
          categoryId: true
        }
      });
      if (queryResult) {
        const resultFileUnresolved = MapImageInfo({
          ...queryResult,
          category: {
            kind: category
          }
        });
        const fileInfoResultResult = await this.acsysDraftsEntitiesResolver.resolveFileInfos({ idsFilter: [resultFileUnresolved.fileId], unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ExcludeFromResult });
        const fileInfos = Array.from(fileInfoResultResult.items.values());
        if (!fileInfos?.length) {
          this.logger.warn('cannot found file', undefined, { id, slug, fileId: resultFileUnresolved.fileId });
          return undefined;
        }
    
        result = {
          ...resultFileUnresolved,
          file: fileInfos[0],
          previewMode: true
        }; 
      } else {
        this.logger.debug('no images exist in drafts table, proceeding to the main table', { id, slug, category, previewMode });
        result = await this.prismaImplementation.findImage(id, slug, category, event, previewMode); 
      }
    } else {
      result = await this.prismaImplementation.findImage(id, slug, category, event, previewMode);
    }
    this.logger.debug('image bytes loaded', { id, slug, previewMode });
    return result;
  }

  async getImagesByIds(ids: EntityId[], previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug('loading image infos by ids', { count: ids.length, previewMode });
    let result: IImageFileInfoUnresolved[];
    if(previewMode) {
      const queryResult = await this.dbRepository.acsysDraftsImage.findMany({
        where: {
          id: {
            in: ids
          },
          isDeleted: false
        },
        select: {
          ...(omit(ImageInfoQuery.select, 'category')),
          categoryId: true
        }
      });

      const categories = new Map<EntityId, ImageCategory>(
          Array.from(
            (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).values()
          ).map(c => [c.id, c.kind])
      );
      result = queryResult.map(q => { 
        const category = categories.get(q.categoryId)!;
        return { 
          ...MapImageInfo({
            ...q,
            category: {
              kind: category
            }
          }),
          previewMode: true
        }; 
      });

      const draftIds = new Set<EntityId>(result.map(d => d.id));
      const publishedIds = ids.filter(id => !draftIds.has(id));
      if(publishedIds.length) {
        this.logger.debug('some image infos don', { draftIds, publishedIds });
        const published = await this.prismaImplementation.getImagesByIds(publishedIds, previewMode);
        result.push(...published);
      }
    } else {
      result = await this.prismaImplementation.getImagesByIds(ids, previewMode);
    }
    this.logger.debug('image infos by ids loaded', { reqCount: ids.length, previewMode, resCount: result.length });
    return result;
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined> {
    this.logger.debug('loading image bytes', { id, slug, category, previewMode });
    let result: IImageBytes | undefined;
    if(previewMode) {
      const fileId  = (await this.findImage(id, slug, category, event, true))?.file.id;
      if(!fileId) {
        this.logger.warn('image file info not found', undefined, { id, slug });
        return undefined;
      }

      const fileData = await this.fileLogic.getFileData(fileId, event);
      if(!fileData) {
        this.logger.warn('file not found', undefined, { id, slug, fileId });
        return undefined;
      }

      result = { bytes: fileData.bytes, mimeType: fileData.mime ?? undefined, modifiedUtc: fileData.modifiedUtc! };
    } else {
      result = await this.prismaImplementation.getImageBytes(id, slug, category, event, previewMode);
    }
    this.logger.debug('image bytes loaded', { id, slug, previewMode, mime: result?.mimeType, size: result?.bytes.byteLength });
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory, skipAuthChecks: boolean, previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug('accessing all images by', { category, skipAuthChecks, previewMode });

    const result = await this.prismaImplementation.getAllImagesByCategory(category, previewMode ? true : skipAuthChecks, previewMode);
    if(previewMode) {
      const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(category)!.id;
      const queryResult = await this.dbRepository.acsysDraftsImage.findMany({
        where: {
          categoryId,
          isDeleted: false
        },
        select: {
          ...(omit(ImageInfoQuery.select, 'category')),
          categoryId: true
        }
      });

      result.push(
        ...(queryResult.map(q => { 
          return { 
            ...MapImageInfo({
              ...q,
              category: {
                kind: category
              }
            }),
            previewMode: true
          }; 
        }))
      );
    }

    this.logger.debug('images by category', { category, skipAuthChecks, previewMode, count: result.length });
    return result;
  }

  async resolveImageFiles(imageInfos: IImageFileInfoUnresolved[], event: H3Event<EventHandlerRequest>, previewMode: PreviewMode): Promise<IImageInfo[]> {
    this.logger.debug('resolving image files', { count: imageInfos.length, previewMode });

    let result: IImageInfo[];
    if(previewMode) {
      const fileInfoResolveResult = await this.acsysDraftsEntitiesResolver.resolveFileInfos({ idsFilter: imageInfos.map(i => i.fileId), unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ExcludeFromResult });
      if(fileInfoResolveResult.notFoundIds?.length) {
        this.logger.warn('cannot resolve files', undefined, { fileIds: fileInfoResolveResult.notFoundIds });
      }
      result = [];
      for(let i = 0; i < imageInfos.length; i++) {
        const info = imageInfos[i];
        const file = fileInfoResolveResult.items.get(info.fileId);
        if(!file) {
          continue;
        }

        result.push({
          ...info,
          file
        });
      }
    } else {
      result = await this.prismaImplementation.resolveImageFiles(imageInfos, event, previewMode);
    }

    this.logger.debug('image files resolved', { resCount: result.length, reqCount: imageInfos.length, previewMode });
    return result;
  }
}

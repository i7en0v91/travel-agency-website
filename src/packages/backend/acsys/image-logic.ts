import { CachedResultsInAppServicesEnabled, type IImageInfo, type IImageData, type PreviewMode, type IAppLogger, type ImageCategory, type EntityId, type Timestamp, DbVersionInitial, newUniqueId } from '@golobe-demo/shared';
import { type ImageCheckAccessResult, type IFileLogic, type IImageCategoryLogic, type IImageFileInfoUnresolved, type IImageBytes, type IImageLogic } from './../types';
import { ImageInfoQuery, MapImageInfo } from './../services/queries';
import { type EventHandlerRequest, type H3Event } from 'h3';
import type { PrismaClient, Prisma } from '@prisma/client';
import { type AcsysDraftEntitiesResolver, UnresolvedEntityThrowingCondition } from './acsys-draft-entities-resolver';
import omit from 'lodash-es/omit';

export class ImageLogic implements IImageLogic {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly prismaImplementation: IImageLogic;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;
  private readonly imageCategoryLogic: IImageCategoryLogic;
  private readonly fileLogic: IFileLogic;

  public static inject = ['imageCategoryLogic', 'fileLogic', 'imageLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (imageCategoryLogic: IImageCategoryLogic, fileLogic: IFileLogic, prismaImplementation: IImageLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
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
    this.logger.debug(`(ImageLogic-Acsys) deleting image: id=${id}`);

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
      this.logger.debug(`(ImageLogic-Acsys) no images have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteImage(id);
    }

    this.logger.debug(`(ImageLogic-Acsys) image deleted: id=${id}`);
  };

  async createImage (data: IImageData, userId: EntityId | undefined, previewMode: PreviewMode): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.debug(`(ImageLogic-Acsys) creating image, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}, previewMode=${previewMode}`);

    let result: { id: EntityId, timestamp: Timestamp };
    if(previewMode) {
      const categoryId = (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id;
      result = await this.dbRepository.$transaction(async () => {
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
      });
    } else {
      result = await this.prismaImplementation.createImage(data, userId, previewMode);
    }
    
    this.logger.debug(`(ImageLogic-Acsys) image created, id=${result.id}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}, previewMode=${previewMode}`);
    return result;
  }

  async updateImage (imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event, previewMode: PreviewMode): Promise<{ timestamp: Timestamp }> {
    this.logger.debug(`(ImageLogic-Acsys) updating image, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}, previewMode=${previewMode}`);
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
          this.logger.verbose(`(ImageLogic-Acsys) image file info does not exist in drafts, proceeding with published: imageId=${imageId}, slug=${data.slug}, category=${data.category}`);
          result = await this.prismaImplementation.updateImage(imageId, data, undefined, userId, event, previewMode); 
        }
      }

      if(!result) {
        const categoryId = data.category ? (await this.imageCategoryLogic.getImageCategoryInfos(CachedResultsInAppServicesEnabled)).get(data.category)!.id : undefined;
        const timestamp = await this.dbRepository.$transaction(async () => {
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
        });
        result = { timestamp };
      }
    } else {
      result = await this.prismaImplementation.updateImage(imageId, data, imageFileId, userId, event, previewMode);
    }
    
    this.logger.debug(`(ImageLogic-Acsys) image updated, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}, previewMode=${previewMode}`);
    return result;
  }

  async checkAccess (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, previewMode: PreviewMode, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) checking access, id=${id}, slug=${slug}, category=${category}, previewMode=${previewMode}, userId=${userId ?? ''}`);
    let result: ImageCheckAccessResult | undefined;
    if(previewMode) {
      result = 'granted';
    } else {
      result = await this.prismaImplementation.checkAccess(id, slug, category, previewMode, userId);
    }
    this.logger.debug(`(ImageLogic-Acsys) access checked, id=${id}, slug=${slug}, category=${category}, userId=${userId}, result=${result}, previewMode=${previewMode}`);
    return result;
  }

  async findImage (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageInfo | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) loading image info, id=${id}, slug=${slug}, category=${category}, previewMode=${previewMode}`);

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
          this.logger.warn(`(ImageLogic-Acsys) cannot found file, id=${id}, slug=${slug}, fileId=${resultFileUnresolved.fileId}`);
          return undefined;
        }
    
        result = {
          ...resultFileUnresolved,
          file: fileInfos[0],
          previewMode: true
        }; 
      } else {
        this.logger.debug(`(ImageLogic-Acsys) no images exist in drafts table, proceeding to the main table, id=${id}, slug=${slug}, category=${category}, previewMode=${previewMode}`);
        result = await this.prismaImplementation.findImage(id, slug, category, event, previewMode); 
      }
    } else {
      result = await this.prismaImplementation.findImage(id, slug, category, event, previewMode);
    }
    this.logger.debug(`(ImageLogic-Acsys) image bytes loaded, id=${id}, slug=${slug}, previewMode=${previewMode}`);
    return result;
  }

  async getImagesByIds(ids: EntityId[], previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug(`(ImageLogic-Acsys) loading image infos by ids, count=${ids.length}, previewMode=${previewMode}`);
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
        this.logger.debug(`(ImageLogic-Acsys) some image infos don't exist in drafts table, proceeding to the main table, draftIds=[${result.map(d => d.id).join('; ')}], publishedIds=[${publishedIds.join('; ')}]`);
        const published = await this.prismaImplementation.getImagesByIds(publishedIds, previewMode);
        result.push(...published);
      }
    } else {
      result = await this.prismaImplementation.getImagesByIds(ids, previewMode);
    }
    this.logger.debug(`(ImageLogic-Acsys) image infos by ids loaded, req count=${ids.length}, previewMode=${previewMode}, result count=${result.length}`);
    return result;
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) loading image bytes, id=${id}, slug=${slug}, category=${category}, previewMode=${previewMode}`);
    let result: IImageBytes | undefined;
    if(previewMode) {
      const fileId  = (await this.findImage(id, slug, category, event, true))?.file.id;
      if(!fileId) {
        this.logger.warn(`(ImageLogic-Acsys) image file info not found, id=${id}, slug=${slug}`);
        return undefined;
      }

      const fileData = await this.fileLogic.getFileData(fileId, event);
      if(!fileData) {
        this.logger.warn(`(ImageLogic-Acsys) file not found, id=${id}, slug=${slug}, fileId=${fileId}`);
        return undefined;
      }

      result = { bytes: fileData.bytes, mimeType: fileData.mime ?? undefined, modifiedUtc: fileData.modifiedUtc! };
    } else {
      result = await this.prismaImplementation.getImageBytes(id, slug, category, event, previewMode);
    }
    this.logger.debug(`(ImageLogic-Acsys) image bytes loaded, id=${id}, slug=${slug}, previewMode=${previewMode}, mime=${result?.mimeType}, size=${result?.bytes.byteLength}`);
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory, skipAuthChecks: boolean, previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]> {
    this.logger.debug(`(ImageLogic-Acsys) accessing all images by category=${category}, skipAuthChecks=${skipAuthChecks}, previewMode=${previewMode}`);

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

    this.logger.debug(`(ImageLogic-Acsys) images by category: category=${category}, skipAuthChecks=${skipAuthChecks}, previewMode=${previewMode}, count=${result.length}`);
    return result;
  }

  async resolveImageFiles(imageInfos: IImageFileInfoUnresolved[], event: H3Event<EventHandlerRequest>, previewMode: PreviewMode): Promise<IImageInfo[]> {
    this.logger.debug(`(ImageLogic-Acsys) resolving image files, count=${imageInfos.length}, previewMode=${previewMode}`);

    let result: IImageInfo[];
    if(previewMode) {
      const fileInfoResolveResult = await this.acsysDraftsEntitiesResolver.resolveFileInfos({ idsFilter: imageInfos.map(i => i.fileId), unresolvedEntityPolicy: UnresolvedEntityThrowingCondition.ExcludeFromResult });
      if(fileInfoResolveResult.notFoundIds?.length) {
        this.logger.warn(`(ImageLogic-Acsys) cannot resolve files, fileIds=[${fileInfoResolveResult.notFoundIds.join('; ')}]`);
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

    this.logger.debug(`(ImageLogic-Acsys) image files resolved, result count=${result.length} (of requested count=${imageInfos.length}), previewMode=${previewMode}`);
    return result;
  }
}

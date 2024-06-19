import type { IAppLogger, ImageCategory, IImageBytes, EntityId, IImageInfo, IImageLogic, IImageData, Timestamp, ImageCheckAccessResult } from '../app-facade/interfaces';
import type { ImageLogic as ImageLogicPrisma } from '../services/image-logic';
import { type H3Event } from 'h3';

export class ImageLogic implements IImageLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ImageLogicPrisma;

  public static inject = ['imageLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: ImageLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteImage(id: EntityId): Promise<void> {
    this.logger.debug(`(ImageLogic-Acsys) deleting image: id=${id}`);
    await this.prismaImplementation.deleteImage(id);
    this.logger.debug(`(ImageLogic-Acsys) image deleted: id=${id}`);
  };

  async createImage (data: IImageData, userId: EntityId | undefined, event: H3Event): Promise<{ id: EntityId, timestamp: Timestamp }> {
    this.logger.debug(`(ImageLogic-Acsys) creating image, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}`);
    const result = await this.prismaImplementation.createImage(data, userId, event);
    this.logger.debug(`(ImageLogic-Acsys) image created, id=${result.id}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, fileName=${data.originalName}, length=${data.bytes.length}`);
    return result;
  }

  async updateImage (imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event): Promise<{ timestamp: Timestamp }> {
    this.logger.debug(`(ImageLogic-Acsys) updating image, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
    const result = await this.prismaImplementation.updateImage(imageId, data, imageFileId, userId, event);
    this.logger.debug(`(ImageLogic-Acsys) image updated, imageId=${imageId}, slug=${data.slug}, category=${data.category}, ownerId=${data.ownerId}, userId=${userId}, imageFileId=${imageFileId}, fileName=${data.originalName}, length=${data.bytes?.length?.toString() ?? '[empty]'}`);
    return result;
  }

  async checkAccess (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, userId?: EntityId | undefined): Promise<ImageCheckAccessResult | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) checking access, id=${id}, slug=${slug}, category=${category}, userId=${userId}`);
    const result = await this.prismaImplementation.checkAccess(id, slug, category, userId);
    this.logger.debug(`(ImageLogic-Acsys) access checked, id=${id}, slug=${slug}, category=${category}, userId=${userId}, result=${result}`);
    return result;
  }

  async findImage (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageInfo | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) loading image info, id=${id}, slug=${slug}, category=${category}`);
    const result = await this.prismaImplementation.findImage(id, slug, category, event);
    this.logger.debug(`(ImageLogic-Acsys) image bytes loaded, id=${id}, slug=${slug}`);
    return result;
  }

  async getImageBytes (id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event): Promise<IImageBytes | undefined> {
    this.logger.debug(`(ImageLogic-Acsys) loading image bytes, id=${id}, slug=${slug}, category=${category}`);
    const result = await this.prismaImplementation.getImageBytes(id, slug, category, event);
    this.logger.debug(`(ImageLogic-Acsys) image bytes loaded, id=${id}, slug=${slug}, mime=${result?.mimeType}, size=${result?.bytes.byteLength}`);
    return result;
  }

  async getAllImagesByCategory (category: ImageCategory, event: H3Event): Promise<IImageInfo[]> {
    this.logger.debug(`(ImageLogic-Acsys) accessing all images by category=${category}`);
    const result = await this.prismaImplementation.getAllImagesByCategory(category, event);
    this.logger.debug(`(ImageLogic-Acsys) images by category: category=${category}, count=${result.length}`);
    return result;
  }
}

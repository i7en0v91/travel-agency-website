import type { ImageCategory, IImageCategoryInfo, EntityId, IAppLogger } from '@golobe-demo/shared';
import type { IImageCategoryLogic } from './../types';

export class ImageCategoryLogic implements IImageCategoryLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IImageCategoryLogic;

  public static inject = ['imageCategoryLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: IImageCategoryLogic, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async initialize(): Promise<void> {
    this.logger.debug('(ImageCategoryLogic-Acsys) initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('(ImageCategoryLogic-Acsys) initialized');
  }

  async findCategory (type: ImageCategory): Promise<IImageCategoryInfo | undefined> {
    this.logger.debug(`(ImageCategoryLogic-Acsys) finding category, type=${type}`);
    const result = await this.prismaImplementation.findCategory(type);
    this.logger.debug(`(ImageCategoryLogic-Acsys) category found, type=${type}, id=${result}`);
    return result;
  }

  async createCategory (type: ImageCategory, width: number, height: number): Promise<EntityId> {
    this.logger.debug(`(ImageCategoryLogic-Acsys) creating category, type=${type}, width=${width}, height=${height}`);
    const result = await this.prismaImplementation.createCategory(type, width, height);
    this.logger.debug(`(ImageCategoryLogic-Acsys) category created, type=${type}, id=${result}`);
    return result;
  }

  async getImageCategoryInfos (allowCachedValue: boolean): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>> {
    this.logger.debug(`(ImageCategoryLogic-Acsys) accessing image category infos, allowCachedValue=${allowCachedValue}`);
    const result = await this.prismaImplementation.getImageCategoryInfos(allowCachedValue);
    this.logger.debug(`(ImageCategoryLogic-Acsys) image category infos count=${result.size}, allowCachedValue=${allowCachedValue}`);
    return result;
  }
}

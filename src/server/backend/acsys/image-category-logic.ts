import { type IImageCategoryLogic, type IImageCategoryInfo, type EntityId, type IAppLogger } from '../app-facade/interfaces';
import type { ImageCategory } from '../app-facade/implementation';
import type { ImageCategoryLogic as ImageCategoryLogicPrisma } from '../services/image-category-logic';

export class ImageCategoryLogic implements IImageCategoryLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ImageCategoryLogicPrisma;

  public static inject = ['imageCategoryLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: ImageCategoryLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
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

  async getImageCategoryInfos (): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>> {
    this.logger.debug('(ImageCategoryLogic-Acsys) accessing image category infos');
    const result = await this.prismaImplementation.getImageCategoryInfos();
    this.logger.debug(`(ImageCategoryLogic-Acsys) image category infos count=${result.size}`);
    return result;
  }
}

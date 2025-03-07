import type { ImageCategory, IImageCategoryInfo, EntityId, IAppLogger } from '@golobe-demo/shared';
import type { IImageCategoryLogic } from './../types';

export class ImageCategoryLogic implements IImageCategoryLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IImageCategoryLogic;

  public static inject = ['imageCategoryLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: IImageCategoryLogic, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'ImageCategoryLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
  }

  async initialize(): Promise<void> {
    this.logger.debug('initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('initialized');
  }

  async findCategory (type: ImageCategory): Promise<IImageCategoryInfo | undefined> {
    this.logger.debug('finding category', type);
    const result = await this.prismaImplementation.findCategory(type);
    this.logger.debug('category found', { type, id: result });
    return result;
  }

  async createCategory (type: ImageCategory, width: number, height: number): Promise<EntityId> {
    this.logger.debug('creating category', { type, width, height });
    const result = await this.prismaImplementation.createCategory(type, width, height);
    this.logger.debug('category created', { type, id: result });
    return result;
  }

  async getImageCategoryInfos (allowCachedValue: boolean): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>> {
    this.logger.debug('accessing image category infos', allowCachedValue);
    const result = await this.prismaImplementation.getImageCategoryInfos(allowCachedValue);
    this.logger.debug('image category infos', { count: result.size, allowCachedValue });
    return result;
  }
}

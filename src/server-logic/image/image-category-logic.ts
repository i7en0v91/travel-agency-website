import { PrismaClient } from '@prisma/client';
import { type Storage, type StorageValue } from 'unstorage';
import { type IAppLogger } from '../../shared/applogger';
import { type IImageCategoryLogic, ImageCategory, type IImageCategoryInfo, type EntityId } from '../../shared/interfaces';
import { mapEnumValue } from './../helpers/db';
import { parseEnumOrThrow } from './../../shared/common';

export class ImageCategoryLogic implements IImageCategoryLogic {
  private readonly ImageCategoryInfosCacheKey = 'UserLogic-ImageCategoryInfos';

  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;
  private readonly cache: Storage<StorageValue>;

  public static inject = ['dbRepository', 'cache', 'logger'] as const;
  constructor (dbRepository: PrismaClient, cache: Storage<StorageValue>, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;
    this.cache = cache;
  }

  async findCategory (type: ImageCategory): Promise<IImageCategoryInfo | undefined> {
    this.logger.debug(`(ImageCategoryLogic) finding category, type=${type}`);
    const categoryEntity = await this.dbRepository.imageCategory.findUnique({
      where: { kind: mapEnumValue(type) },
      select: { id: true, width: true, height: true }
    });
    if (!categoryEntity) {
      this.logger.warn(`(ImageCategoryLogic) category not found, type=${type}`);
      return undefined;
    }

    this.logger.debug(`(ImageCategoryLogic) category found, type=${type}, id=${categoryEntity.id}`);
    return categoryEntity;
  }

  async createCategory (type: ImageCategory, width: number, height: number): Promise<EntityId> {
    this.logger.info(`(ImageCategoryLogic) creating category, type=${type}, width=${width}, height=${height}`);
    const categoryId = (await this.dbRepository.imageCategory.create({ data: { kind: mapEnumValue(type), width, height }, select: { id: true } })).id as EntityId;
    await this.cache.removeItem(this.ImageCategoryInfosCacheKey);
    this.logger.info(`(ImageCategoryLogic) category created, type=${type}, id=${categoryId}`);
    return categoryId;
  }

  async getImageCategoryInfos (): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>> {
    this.logger.debug('(ImageCategoryLogic) accessing image category infos');

    let entries = await this.cache.getItem(this.ImageCategoryInfosCacheKey) as [ImageCategory, IImageCategoryInfo][];
    if (!entries) {
      entries = [];
      this.logger.verbose('(ImageCategoryLogic) image category infos - cache miss, loading from db');
      const categoryEntities = await this.dbRepository.imageCategory.findMany({ select: { id: true, kind: true, width: true, height: true } });
      for (let i = 0; i < categoryEntities.length; i++) {
        const entity = categoryEntities[i];
        entries.push([parseEnumOrThrow(ImageCategory, entity.kind), { width: entity.width, height: entity.height, id: entity.id }]);
      }
      this.logger.debug('(ImageCategoryLogic) image category infos - updating cache');
      await this.cache.setItem(this.ImageCategoryInfosCacheKey, entries);
    }

    const result = new Map<ImageCategory, IImageCategoryInfo>(entries);
    this.logger.debug(`(ImageCategoryLogic) image category infos count=${entries.length}`);
    return result;
  }
}

import type { IAppLogger, EntityId, IAuthFormImageLogic, AuthFormImageData, IAuthFormImageInfo } from '../app-facade/interfaces';
import type { AuthFormImageLogic as AuthFormImageLogicPrisma } from '../services/auth-form-image-logic';
import { type EventHandlerRequest, type H3Event } from 'h3';

export class AuthFormImageLogic implements IAuthFormImageLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: AuthFormImageLogicPrisma;

  public static inject = ['authFormImageLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: AuthFormImageLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async createImage(imageData: EntityId | AuthFormImageData, order: number, event: H3Event<EventHandlerRequest>): Promise<string> {
    this.logger.debug(`(AuthFormImageLogic-Acsys) creating auth form image, order=${order}`, imageData);
    const resultId = await this.prismaImplementation.createImage(imageData, order, event);
    this.logger.debug(`(AuthFormImageLogic-Acsys) auth form image created, id=${resultId}, order=${order}`, imageData);
    return resultId;
  };

  async getAllImages(event: H3Event<EventHandlerRequest>): Promise<IAuthFormImageInfo[]> {
    this.logger.debug('(AuthFormImageLogic-Acsys) get all auth form images');
    const result = await this.prismaImplementation.getAllImages(event);
    this.logger.debug(`(AuthFormImageLogic-Acsys) returning all auth form images, count=${result.length}`);
    return result;
  };

  async deleteImage(id: EntityId): Promise<void> {
    this.logger.debug(`(AuthFormImageLogic-Acsys) deleting auth form image, id=${id}`);
    await this.prismaImplementation.deleteImage(id);
    this.logger.debug(`(AuthFormImageLogic-Acsys) auth form image deleted, id=${id}`);
  };
}

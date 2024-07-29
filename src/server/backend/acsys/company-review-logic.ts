import { type PreviewMode, type IAppLogger, type EntityId, type CompanyReviewData, type ICompanyReview, type ICompanyReviewsLogic } from './../../backend/app-facade/interfaces';
import { DbVersionInitial, newUniqueId }  from './../../backend/app-facade/implementation';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ICompanyReviewsLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['companyReviewsLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: ICompanyReviewsLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteReview (id: EntityId): Promise<void> {
    this.logger.debug(`(CompanyReviewLogic-Acsys) deleting review: id=${id}`);
    await this.prismaImplementation.deleteReview(id);
    this.logger.debug(`(CompanyReviewLogic-Acsys) review deleted: id=${id}`);
  };

  async createReview (data: CompanyReviewData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(CompanyReviewLogic-Acsys) creating review, header=${data.header.en}, previewMode=${previewMode}`);

    let reviewId: EntityId;
    if(previewMode) {
      reviewId = await this.dbRepository.$transaction(async () => {
        const headerStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.header
          },
          select: {
            id: true
          }
        })).id;

        const bodyStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.body
          },
          select: {
            id: true
          }
        })).id;

        const personNameStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.userName
          },
          select: {
            id: true
          }
        })).id;

        const reviewId = (await this.dbRepository.acsysDraftsCompanyReview.create({
          data: {
            id: newUniqueId(),
            isDeleted: false,
            version: DbVersionInitial,
            imageId: data.imageId,
            headerStrId,
            bodyStrId,
            personNameStrId
          },
          select: {
            id: true
          }
        })).id;

        return reviewId;
      });
    } else {
      reviewId = await this.prismaImplementation.createReview(data, previewMode);
    }
    this.logger.debug(`(CompanyReviewLogic-Acsys) review created, header=${data.header.en}, id=${reviewId}, previewMode=${previewMode}`);
    return reviewId;
  }

  async getReviews (previewMode: PreviewMode): Promise<ICompanyReview[]> {
    this.logger.debug(`(CompanyReviewLogic-Acsys) obtaining list of company reviews, previewMode=${previewMode}`);

    let result: ICompanyReview[];
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveCompanyReviews({});
      result = [...resolveResult.items.values()];
    } else {
      result = await this.prismaImplementation.getReviews(previewMode);
    }
    
    this.logger.debug(`(CompanyReviewLogic-Acsys) returning list of company reviews, count=${result.length}, previewMode=${previewMode}`);
    return result;
  }
}

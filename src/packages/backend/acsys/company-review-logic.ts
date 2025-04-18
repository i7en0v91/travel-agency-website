import { DbVersionInitial, newUniqueId, type PreviewMode, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import type { CompanyReviewData, ICompanyReview, ICompanyReviewsLogic }  from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import { executeInTransaction } from './../helpers/db';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: ICompanyReviewsLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['companyReviewsLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: ICompanyReviewsLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'CompanyReviewLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteReview (id: EntityId): Promise<void> {
    this.logger.debug('deleting review', id);
    await this.prismaImplementation.deleteReview(id);
    this.logger.debug('review deleted', id);
  };

  async createReview (data: CompanyReviewData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug('creating review', { header: data.header.en, previewMode });

    let reviewId: EntityId;
    if(previewMode) {
      reviewId = await executeInTransaction(async () => {
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
      }, this.dbRepository);
    } else {
      reviewId = await this.prismaImplementation.createReview(data, previewMode);
    }
    this.logger.debug('review created', { header: data.header.en, id: reviewId, previewMode });
    return reviewId;
  }

  async getReviews (previewMode: PreviewMode): Promise<ICompanyReview[]> {
    this.logger.debug('obtaining list of company reviews', previewMode);

    let result: ICompanyReview[];
    if(previewMode) {
      const resolveResult = await this.acsysDraftsEntitiesResolver.resolveCompanyReviews({});
      result = Array.from(resolveResult.items.values());
    } else {
      result = await this.prismaImplementation.getReviews(previewMode);
    }
    
    this.logger.debug('returning list of company reviews', { count: result.length, previewMode });
    return result;
  }
}

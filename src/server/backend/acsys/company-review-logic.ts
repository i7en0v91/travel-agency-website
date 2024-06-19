import { type IAppLogger, type EntityId, type CompanyReviewData, type ICompanyReview, type ICompanyReviewsLogic } from './../../backend/app-facade/interfaces';
import type { CompanyReviewLogic as CompanyReviewLogicPrisma } from '../services/company-review-logic';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: CompanyReviewLogicPrisma;

  public static inject = ['companyReviewsLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: CompanyReviewLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteReview (id: EntityId): Promise<void> {
    this.logger.debug(`(CompanyReviewLogic-Acsys) deleting review: id=${id}`);
    await this.prismaImplementation.deleteReview(id);
    this.logger.debug(`(CompanyReviewLogic-Acsys) review deleted: id=${id}`);
  };

  async createReview (data: CompanyReviewData): Promise<EntityId> {
    this.logger.debug(`(CompanyReviewLogic-Acsys) creating review, header=${data.header.en}`);
    const reviewId = await this.prismaImplementation.createReview(data);
    this.logger.debug(`(CompanyReviewLogic-Acsys) review created, header=${data.header.en}, id=${reviewId}`);
    return reviewId;
  }

  async getReviews (): Promise<ICompanyReview[]> {
    this.logger.debug('(CompanyReviewLogic-Acsys) obtaining list of company reviews');
    const result = await this.prismaImplementation.getReviews();
    this.logger.debug(`(CompanyReviewLogic-Acsys) returning list of company reviews, count=${result.length}`);
    return result;
  }
}

import { DbVersionInitial, newUniqueId, type IAppLogger, type EntityId } from '@golobe-demo/shared';
import type { CompanyReviewData, ICompanyReview, ICompanyReviewsLogic } from './../types';
import type { PrismaClient } from '@prisma/client';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'CompanyReviewLogic' });
    this.dbRepository = dbRepository;
  }

  deleteReview = async (id: EntityId): Promise<void> => {
    this.logger.verbose('deleting review', id);
    await this.dbRepository.companyReview.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose('review deleted', id);
  };

  async createReview (data: CompanyReviewData): Promise<EntityId> {
    this.logger.verbose('creating review', { header: data.header.en });

    const reviewId = (await this.dbRepository.companyReview.create({
      data: {
        id: newUniqueId(),
        isDeleted: false,
        version: DbVersionInitial,
        image: {
          connect: {
            id: data.imageId
          }
        },
        headerStr: {
          create: { 
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.header
          }
        },
        bodyStr: {
          create: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.body
          }
        },
        personNameStr: {
          create: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...data.userName
          }
        }
      },
      select: {
        id: true
      }
    })).id;

    this.logger.verbose('review created', { header: data.header.en, id: reviewId });
    return reviewId;
  }

  async getReviews (): Promise<ICompanyReview[]> {
    this.logger.verbose('obtaining list of company reviews');

    const reviewEntities = await this.dbRepository.companyReview.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        headerStr: true,
        bodyStr: true,
        personNameStr: true,
        image: {
          select: {
            slug: true,
            modifiedUtc: true
          }
        },
        modifiedUtc: true
      }
    });
    const result: ICompanyReview[] = reviewEntities.map((r) => {
      return <ICompanyReview>{
        header: r.headerStr,
        body: r.bodyStr,
        userName: r.personNameStr,
        id: r.id,
        imgSlug: r.image.slug,
        timestamp: Math.max(r.image.modifiedUtc.getTime(), r.modifiedUtc.getTime())
      };
    });

    this.logger.verbose('returning list of company reviews', { count: result.length });
    return result;
  }
}

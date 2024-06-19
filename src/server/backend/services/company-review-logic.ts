import type { PrismaClient } from '@prisma/client';
import { type IAppLogger, type EntityId, type CompanyReviewData, type ICompanyReview, type ICompanyReviewsLogic } from './../../backend/app-facade/interfaces';
import { DbVersionInitial, newUniqueId } from './../../backend/app-facade/implementation';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  deleteReview = async (id: EntityId): Promise<void> => {
    this.logger.verbose(`(CompanyReviewLogic) deleting review: id=${id}`);
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
    this.logger.verbose(`(CompanyReviewLogic) review deleted: id=${id}`);
  };

  async createReview (data: CompanyReviewData): Promise<EntityId> {
    this.logger.verbose(`(CompanyReviewLogic) creating review, header=${data.header.en}`);

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

    this.logger.verbose(`(CompanyReviewLogic) review created, header=${data.header.en}, id=${reviewId}`);
    return reviewId;
  }

  async getReviews (): Promise<ICompanyReview[]> {
    this.logger.verbose('(CompanyReviewLogic) obtaining list of company reviews');

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

    this.logger.verbose(`(CompanyReviewLogic) returning list of company reviews, count=${result.length}`);
    return result;
  }
}

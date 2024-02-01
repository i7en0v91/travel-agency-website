import { PrismaClient } from '@prisma/client';
import { type EntityId, type CompanyReviewData, type ICompanyReview, type ICompanyReviewsLogic } from '../shared/interfaces';
import { type IAppLogger } from '../shared/applogger';
import { DbConcurrencyVersions } from '../shared/constants';

export class CompanyReviewLogic implements ICompanyReviewsLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async createReview (data: CompanyReviewData): Promise<EntityId> {
    this.logger.verbose(`(CompanyReviewLogic) creating review, header=${data.header.en}`);

    const reviewId = (await this.dbRepository.companyReview.create({
      data: {
        isDeleted: false,
        version: DbConcurrencyVersions.InitialVersion,
        image: {
          connect: {
            id: data.imageId
          }
        },
        headerStr: {
          create: data.header
        },
        bodyStr: {
          create: data.body
        },
        personNameStr: {
          create: data.userName
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
            file: {
              select: {
                modifiedUtc: true
              }
            }
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
        timestamp: Math.max(r.image.file.modifiedUtc.getTime(), r.modifiedUtc.getTime())
      };
    });

    this.logger.verbose(`(CompanyReviewLogic) returning list of company reviews, count=${result.length}`);
    return result;
  }
}

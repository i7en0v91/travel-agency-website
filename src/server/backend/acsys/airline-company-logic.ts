import { type IAppLogger, type IAirlineCompanyLogic, type IAirlineCompany, type IAirlineCompanyData, type EntityId, type PreviewMode } from './../../backend/app-facade/interfaces';
import { DbVersionInitial, newUniqueId } from './../../backend/app-facade/implementation';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IAirlineCompanyLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['airlineCompanyLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IAirlineCompanyLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.dbRepository = dbRepository;
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async initialize(): Promise<void> {
    this.logger.debug('(AirlineCompanyLogic-Acsys) initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('(AirlineCompanyLogic-Acsys) initialized');
  };

  async deleteCompany(id: EntityId): Promise<void>  {
    this.logger.debug(`(AirlineCompanyLogic-Acsys) deleting airline company: id=${id}`);
    const deleted = (await this.dbRepository.acsysDraftsAirlineCompany.updateMany({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    })).count > 0;

    if(!deleted) {
      this.logger.debug(`(AirlineCompanyLogic-Acsys) no airline companies have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteCompany(id);
    }
    
    this.logger.debug(`(AirlineCompanyLogic-Acsys) airline company deleted: id=${id}`);
  };

  async getAllAirlineCompanies (allowCachedValue: boolean, previewMode: PreviewMode): Promise<IAirlineCompany[]> {
    this.logger.debug(`(AirlineCompanyLogic-Acsys) get all airline companies, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}`);
    let result: IAirlineCompany[] | undefined;
    if(previewMode) {
      result = [...(await this.acsysDraftsEntitiesResolver.resolveAirlineCompanies({})).items.values()];
    } else {
      result = await this.prismaImplementation.getAllAirlineCompanies(allowCachedValue, previewMode);
    }
    this.logger.debug(`(AirlineCompanyLogic-Acsys) get all airline companies, count=${result.length}, allowCachedValue=${allowCachedValue}, previewMode=${previewMode}`);
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(AirlineCompanyLogic-Acsys) creating airline company, previewMode=${previewMode}`);
    let companyId: EntityId;
    if(previewMode) {
      companyId = await this.dbRepository.$transaction(async () => {
        const nameStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...companyData.name
          },
          select: {
            id: true
          }
        })).id;

        return (await this.dbRepository.acsysDraftsAirlineCompany.create({
          data: {
            id: newUniqueId(),
            nameStrId,
            cityId: companyData.cityId,
            logoImageId: companyData.logoImageId,
            numReviews: companyData.reviewSummary.numReviews,
            reviewScore: companyData.reviewSummary.score.toFixed(1),
            version: DbVersionInitial
          },
          select: {
            id: true
          }
        })).id;
      });
    } else {
      companyId = await this.prismaImplementation.createAirlineCompany(companyData, previewMode);
    }
    this.logger.debug(`(AirlineCompanyLogic-Acsys) creating airline company - completed, id=${companyId}, previewMode=${previewMode}`);
    return companyId;
  }

  async getNearestCompany (allowCachedValue: boolean) : Promise<IAirlineCompany> {
    this.logger.debug(`(AirlineCompanyLogic-Acsys) get nearest company, allowCachedValue=${allowCachedValue}`);
    const result = await this.prismaImplementation.getNearestCompany(allowCachedValue);
    this.logger.debug(`(AirlineCompanyLogic-Acsys) nearest company, id=${result.id}, name=${result.name.en}, allowCachedValue=${allowCachedValue}`);
    return result;
  }
}

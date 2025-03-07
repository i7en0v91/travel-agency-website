import { DbVersionInitial, newUniqueId, type IAppLogger, type IAirlineCompany, type EntityId, type PreviewMode } from '@golobe-demo/shared';
import type { IAirlineCompanyLogic, IAirlineCompanyData } from './../types';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';
import { executeInTransaction } from './../helpers/db';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IAirlineCompanyLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['airlineCompanyLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IAirlineCompanyLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.dbRepository = dbRepository;
    this.logger = logger.addContextProps({ component: 'AirlineCompanyLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async initialize(): Promise<void> {
    this.logger.debug('initializing');
    await this.prismaImplementation.initialize();
    this.logger.debug('initialized');
  };

  async deleteCompany(id: EntityId): Promise<void>  {
    this.logger.debug('deleting airline company', id);
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
      this.logger.debug('no airline companies have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteCompany(id);
    }
    
    this.logger.debug('airline company deleted', id);
  };

  async getAllAirlineCompanies (allowCachedValue: boolean, previewMode: PreviewMode): Promise<IAirlineCompany[]> {
    this.logger.debug('get all airline companies', { allowCachedValue, previewMode });
    let result: IAirlineCompany[];
    if(previewMode) {
      const resolvedAirlineCompanies = (await this.acsysDraftsEntitiesResolver.resolveAirlineCompanies({}));
      result = Array.from(resolvedAirlineCompanies.items.values());
    } else {
      result = await this.prismaImplementation.getAllAirlineCompanies(allowCachedValue, previewMode);
    }
    this.logger.debug('get all airline companies', { count: result.length, allowCachedValue, previewMode });
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug('creating airline company', previewMode);
    let companyId: EntityId;
    if(previewMode) {
      companyId = await executeInTransaction(async () => {
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
      }, this.dbRepository);
    } else {
      companyId = await this.prismaImplementation.createAirlineCompany(companyData, previewMode);
    }
    this.logger.debug('creating airline company - completed', { id: companyId, previewMode });
    return companyId;
  }

  async getNearestCompany (allowCachedValue: boolean) : Promise<IAirlineCompany> {
    this.logger.debug('get nearest company', allowCachedValue);
    const result = await this.prismaImplementation.getNearestCompany(allowCachedValue);
    this.logger.debug('nearest company', { id: result.id, name: result.name.en, allowCachedValue });
    return result;
  }
}

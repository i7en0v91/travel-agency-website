import { type IAppLogger, type IAirlineCompanyLogic, type IAirlineCompany, type IAirlineCompanyData, type EntityId } from './../../backend/app-facade/interfaces';
import type { AirlineCompanyLogic as AirlineCompanyLogicPrisma } from './../services/airline-company-logic';

export class AirlineCompanyLogic implements IAirlineCompanyLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: AirlineCompanyLogicPrisma;

  public static inject = ['airlineCompanyLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: AirlineCompanyLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  deleteCompany =  async (id: EntityId): Promise<void> => {
    this.logger.debug(`(AirlineCompanyLogic-Acsys) deleting airline company: id=${id}`);
    await this.prismaImplementation.deleteCompany(id);
    this.logger.debug(`(AirlineCompanyLogic-Acsys) airline company deleted: id=${id}`);
  };

  async getAllAirlineCompanies (): Promise<IAirlineCompany[]> {
    this.logger.debug('(AirlineCompanyLogic-Acsys) get all airline companies');
    const result = await this.prismaImplementation.getAllAirlineCompanies();
    this.logger.debug(`(AirlineCompanyLogic-Acsys) get all airline companies, count=${result.length}`);
    return result;
  }

  async createAirlineCompany (companyData: IAirlineCompanyData): Promise<EntityId> {
    this.logger.debug('(AirlineCompanyLogic-Acsys) creating airline company');
    const companyId = await this.prismaImplementation.createAirlineCompany(companyData);
    this.logger.debug(`(AirlineCompanyLogic-Acsys) creating airline company - completed, id=${companyId}`);
    return companyId;
  }

  async getNearestCompany () : Promise<IAirlineCompany> {
    this.logger.debug('(AirlineCompanyLogic-Acsys) get nearest company');
    const result = await this.prismaImplementation.getNearestCompany();
    this.logger.debug(`(AirlineCompanyLogic-Acsys) nearest company, id=${result.id}, name=${result.name.en}`);
    return result;
  }
}

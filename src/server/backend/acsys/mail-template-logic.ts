import type { Locale, IAppLogger, EmailTemplateEnum, IMailTemplateLogic, ILocalizableValue, EntityId } from './../../backend/app-facade/interfaces';
import type { MailTemplateLogic as MailTemplateLogicPrisma } from '../services/mail-template-logic';

export class MailTemplateLogic implements IMailTemplateLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: MailTemplateLogicPrisma;

  public static inject = ['mailTemplateLogicPrisma', 'logger'] as const;
  constructor (prismaImplementation: MailTemplateLogicPrisma, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
  }

  async deleteTemplate (id: EntityId): Promise<void> {
    this.logger.debug(`(MailTemplateLogic-Acsys) deleting template: id=${id}`);
    await this.prismaImplementation.deleteTemplate(id);
    this.logger.debug(`(MailTemplateLogic-Acsys) template deleted: id=${id}`);
  };

  async getTemplateMarkup (kind: EmailTemplateEnum, locale: Locale): Promise<string | undefined> {
    this.logger.debug(`(MailTemplateLogic-Acsys) find template, kind=${kind}, locale=${locale}`);
    const result = await this.prismaImplementation.getTemplateMarkup(kind, locale);
    this.logger.debug(`(MailTemplateLogic-Acsys) template found, kind=${kind}, locale=${locale}, length=${result?.length ?? 0}`);
    return result;
  }

  async createTemplate (kind: EmailTemplateEnum, markup: ILocalizableValue): Promise<EntityId> {
    this.logger.debug(`(MailTemplateLogic-Acsys) creating template, kind=${kind}`);
    const mailTemplateId = await this.prismaImplementation.createTemplate(kind, markup);
    this.logger.debug(`(MailTemplateLogic-Acsys) template created, kind=${kind}, id=${mailTemplateId}`);
    return mailTemplateId;
  }
}

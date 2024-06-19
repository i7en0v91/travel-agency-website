import type { PrismaClient } from '@prisma/client';
import type { Locale, IAppLogger, EmailTemplateEnum, IMailTemplateLogic, ILocalizableValue, EntityId } from './../../backend/app-facade/interfaces';
import { getLocalizeableValue, LocaleEnum, DbVersionInitial, newUniqueId } from './../app-facade/implementation';
import { mapEnumValue } from './db';

export class MailTemplateLogic implements IMailTemplateLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger;
    this.dbRepository = dbRepository;
  }

  async deleteTemplate(id: EntityId): Promise<void> {
    this.logger.verbose(`(MailTemplateLogic) deleting template: id=${id}`);
    await this.dbRepository.mailTemplate.update({
      where: {
        id,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        version: { increment: 1 }
      }
    });
    this.logger.verbose(`(MailTemplateLogic) template deleted: id=${id}`);
  }

  async getTemplateMarkup (kind: EmailTemplateEnum, locale: Locale): Promise<string | undefined> {
    this.logger.verbose(`(MailTemplateLogic) find template, kind=${kind}, locale=${locale}`);

    const templateEntity = await this.dbRepository.mailTemplate.findFirst({
      where: { kind: mapEnumValue(kind), isDeleted: false, templateStr: { isDeleted: false } },
      orderBy: { modifiedUtc: 'desc' },
      select: {
        id: true,
        templateStr: {
          select: {
            en: locale === 'en',
            fr: locale === 'fr',
            ru: locale === 'ru'
          }
        }
      }
    });

    if (!templateEntity || !(Object.keys(LocaleEnum).some(x => (templateEntity.templateStr as any)[x.toLowerCase()]))) {
      this.logger.warn(`(MailTemplateLogic) mail template not found: kind=${kind}, locale=${locale}`);
      return undefined;
    }

    const result = getLocalizeableValue(templateEntity.templateStr, locale);
    this.logger.verbose(`(MailTemplateLogic) template found, kind=${kind}, locale=${locale}, length=${result?.length ?? 0}`);
    return result;
  }

  async createTemplate (kind: EmailTemplateEnum, markup: ILocalizableValue): Promise<EntityId> {
    this.logger.verbose(`(MailTemplateLogic) creating template, kind=${kind}`);

    const mailTemplateId = ((await this.dbRepository.mailTemplate.create({
      data: {
        id: newUniqueId(),
        kind: mapEnumValue(kind),
        version: DbVersionInitial,
        isDeleted: false,
        templateStr: {
          create: { 
            id: newUniqueId(),
            version: DbVersionInitial,
            ...markup
          }
        }
      },
      select: {
        id: true
      }
    }))).id;

    this.logger.verbose(`(MailTemplateLogic) template created, kind=${kind}, id=${mailTemplateId}`);
    return mailTemplateId;
  }
}

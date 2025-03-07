import type { PrismaClient } from '@prisma/client';
import { getLocalizeableValue, LocaleEnum, DbVersionInitial, newUniqueId, type Locale, type IAppLogger, type EmailTemplateEnum, type ILocalizableValue, type EntityId } from '@golobe-demo/shared';
import type { IMailTemplateLogic } from './../types';
import { mapEnumDbValue } from '../helpers/db';

export class MailTemplateLogic implements IMailTemplateLogic {
  private logger: IAppLogger;
  private dbRepository: PrismaClient;

  public static inject = ['logger', 'dbRepository'] as const;
  constructor (logger: IAppLogger, dbRepository: PrismaClient) {
    this.logger = logger.addContextProps({ component: 'MailTemplateLogic' });
    this.dbRepository = dbRepository;
  }

  async deleteTemplate(id: EntityId): Promise<void> {
    this.logger.verbose('deleting template', id);
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
    this.logger.verbose('template deleted', id);
  }

  async getTemplateMarkup (kind: EmailTemplateEnum, locale: Locale): Promise<string | undefined> {
    this.logger.verbose('find template', { kind, locale });

    const templateEntity = await this.dbRepository.mailTemplate.findFirst({
      where: { kind: mapEnumDbValue(kind), isDeleted: false, templateStr: { isDeleted: false } },
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
      this.logger.warn('mail template not found', undefined, { kind, locale });
      return undefined;
    }

    const result = getLocalizeableValue(templateEntity.templateStr, locale);
    this.logger.verbose('template found', { kind, locale, length: result?.length ?? 0 });
    return result;
  }

  async createTemplate (kind: EmailTemplateEnum, markup: ILocalizableValue): Promise<EntityId> {
    this.logger.verbose('creating template', kind);

    const mailTemplateId = ((await this.dbRepository.mailTemplate.create({
      data: {
        id: newUniqueId(),
        kind: mapEnumDbValue(kind),
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

    this.logger.verbose('template created', { kind, id: mailTemplateId });
    return mailTemplateId;
  }
}

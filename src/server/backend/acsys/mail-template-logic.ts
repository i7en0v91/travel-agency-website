import type { PreviewMode, Locale, IAppLogger, EmailTemplateEnum, IMailTemplateLogic, ILocalizableValue, EntityId } from './../../backend/app-facade/interfaces';
import { DbVersionInitial, newUniqueId, getLocalizeableValue } from './../../backend/app-facade/implementation';
import { mapEnumValue } from './../../backend/helpers/db';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class MailTemplateLogic implements IMailTemplateLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IMailTemplateLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['mailTemplateLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IMailTemplateLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteTemplate (id: EntityId): Promise<void> {
    this.logger.debug(`(MailTemplateLogic-Acsys) deleting template: id=${id}`);

    const deleted = (await this.dbRepository.acsysDraftsAirport.updateMany({
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
      this.logger.debug(`(MailTemplateLogic-Acsys) no templates have been deleted in drafts table, proceeding to the main table: id=${id}`);
      await this.prismaImplementation.deleteTemplate(id);
    }

    this.logger.debug(`(MailTemplateLogic-Acsys) template deleted: id=${id}`);
  };

  async getTemplateMarkup (kind: EmailTemplateEnum, locale: Locale, previewMode: PreviewMode): Promise<string | undefined> {
    this.logger.debug(`(MailTemplateLogic-Acsys) find template, kind=${kind}, locale=${locale}, previewMode=${previewMode}`);

    let result: string | undefined;
    if(previewMode) {
      const templateEntityId = (await this.dbRepository.acsysDraftsMailTemplate.findFirst({
        where: { 
          kind: mapEnumValue(kind), 
          isDeleted: false,          
        },
        orderBy: { modifiedUtc: 'desc' },
        select: {
          id: true
        }
      }))?.id;
      if(templateEntityId) {
        const resolvedTemplate = await this.acsysDraftsEntitiesResolver.resolveMailTemplates({ idsFilter: [templateEntityId] });
        result = getLocalizeableValue([...resolvedTemplate.items.values()][0], locale);
      }
    }
    if(!result) {
      this.logger.debug(`(MailTemplateLogic-Acsys) no templates have been deleted in drafts table, proceeding to the main table: kind=${kind}, locale=${locale}, previewMode=${previewMode}`);
      result = await this.prismaImplementation.getTemplateMarkup(kind, locale, previewMode);
    }
    
    this.logger.debug(`(MailTemplateLogic-Acsys) template found, kind=${kind}, locale=${locale}, previewMode=${previewMode}, length=${result?.length ?? 0}`);
    return result;
  }

  async createTemplate (kind: EmailTemplateEnum, markup: ILocalizableValue, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug(`(MailTemplateLogic-Acsys) creating template, kind=${kind}, previewMode=${previewMode}`);
    
    let mailTemplateId: EntityId;
    if(previewMode) {
      mailTemplateId = await this.dbRepository.$transaction(async () => {
        const templateStrId = (await this.dbRepository.acsysDraftsLocalizeableValue.create({
          data: {
            id: newUniqueId(),
            version: DbVersionInitial,
            ...markup
          },
          select: {
            id: true
          }
        })).id;

        return ((await this.dbRepository.acsysDraftsMailTemplate.create({
          data: {
            id: newUniqueId(),
            kind: mapEnumValue(kind),
            version: DbVersionInitial,
            isDeleted: false,
            templateStrId
          },
          select: {
            id: true
          }
        }))).id;  
      });
    } else {
      mailTemplateId = await this.prismaImplementation.createTemplate(kind, markup, previewMode);
    }
    
    this.logger.debug(`(MailTemplateLogic-Acsys) template created, kind=${kind}, previewMode=${previewMode}, id=${mailTemplateId}`);
    return mailTemplateId;
  }
}

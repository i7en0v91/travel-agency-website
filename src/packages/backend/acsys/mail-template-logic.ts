import { DbVersionInitial, newUniqueId, getLocalizeableValue, type PreviewMode, type Locale, type IAppLogger, type EmailTemplateEnum, type ILocalizableValue, type EntityId } from '@golobe-demo/shared';
import type { IMailTemplateLogic } from './../types';
import { mapEnumDbValue, executeInTransaction } from '../helpers/db';
import type { PrismaClient } from '@prisma/client';
import type { AcsysDraftEntitiesResolver } from './acsys-draft-entities-resolver';

export class MailTemplateLogic implements IMailTemplateLogic {
  private readonly logger: IAppLogger;
  private readonly prismaImplementation: IMailTemplateLogic;
  private readonly dbRepository: PrismaClient;
  private readonly acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver;

  public static inject = ['mailTemplateLogicPrisma', 'acsysDraftsEntitiesResolver', 'dbRepository', 'logger'] as const;
  constructor (prismaImplementation: IMailTemplateLogic, acsysDraftsEntitiesResolver: AcsysDraftEntitiesResolver, dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger.addContextProps({ component: 'MailTemplateLogic-Acsys' });
    this.prismaImplementation = prismaImplementation;
    this.dbRepository = dbRepository;
    this.acsysDraftsEntitiesResolver = acsysDraftsEntitiesResolver;
  }

  async deleteTemplate (id: EntityId): Promise<void> {
    this.logger.debug('deleting template', id);

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
      this.logger.debug('no templates have been deleted in drafts table, proceeding to the main table', id);
      await this.prismaImplementation.deleteTemplate(id);
    }

    this.logger.debug('template deleted', id);
  };

  async getTemplateMarkup (kind: EmailTemplateEnum, locale: Locale, previewMode: PreviewMode): Promise<string | undefined> {
    this.logger.debug('find template', { kind, locale, previewMode });

    let result: string | undefined;
    if(previewMode) {
      const templateEntityId = (await this.dbRepository.acsysDraftsMailTemplate.findFirst({
        where: { 
          kind: mapEnumDbValue(kind), 
          isDeleted: false,          
        },
        orderBy: { modifiedUtc: 'desc' },
        select: {
          id: true
        }
      }))?.id;
      if(templateEntityId) {
        const resolvedTemplate = await this.acsysDraftsEntitiesResolver.resolveMailTemplates({ idsFilter: [templateEntityId] });
        result = getLocalizeableValue(Array.from(resolvedTemplate.items.values())[0], locale);
      }
    }
    if(!result) {
      this.logger.debug('no templates have been deleted in drafts table, proceeding to the main table', { kind, locale, previewMode });
      result = await this.prismaImplementation.getTemplateMarkup(kind, locale, previewMode);
    }
    
    this.logger.debug('template found', { kind, locale, previewMode, length: result?.length ?? 0 });
    return result;
  }

  async createTemplate (kind: EmailTemplateEnum, markup: ILocalizableValue, previewMode: PreviewMode): Promise<EntityId> {
    this.logger.debug('creating template', { kind, previewMode });
    
    let mailTemplateId: EntityId;
    if(previewMode) {
      mailTemplateId = await executeInTransaction(async () => {
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
            kind: mapEnumDbValue(kind),
            version: DbVersionInitial,
            isDeleted: false,
            templateStrId
          },
          select: {
            id: true
          }
        }))).id;  
      }, this.dbRepository);
    } else {
      mailTemplateId = await this.prismaImplementation.createTemplate(kind, markup, previewMode);
    }
    
    this.logger.debug('template created', { kind, previewMode, id: mailTemplateId });
    return mailTemplateId;
  }
}

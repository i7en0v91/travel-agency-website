import { Prisma, type PrismaClient } from '@prisma/client';
import { hash } from 'ohash';
import { type EntityId, type IAppLogger } from '../app-facade/interfaces';
import { HtmlPageTimestampTable, AcsysDraftsEntityPrefix } from '../app-facade/implementation';
import { AppException, AppExceptionCodeEnum } from './../../../shared/exceptions';
import omit from 'lodash-es/omit';
import groupBy from 'lodash-es/groupBy';
import toPairs from 'lodash-es/toPairs';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';

const DomainModelDefinition = Prisma.dmmf;
const ModifiedTimeColumnName = 'modifiedUtc';

export declare type EntityModelWithDrafts = Prisma.ModelName;
declare type ExcludeDrafts<T extends string> = T extends `AcsysDrafts${string}` ? never : T;
declare type ExcludePageTimestamps<T extends string> = T extends `HtmlPageTimestamp` ? never : T;
export declare type EntityModel = ExcludePageTimestamps<ExcludeDrafts<EntityModelWithDrafts>>;
export const AllEntityModels: EntityModel[] = DomainModelDefinition.datamodel.models.filter(m => m.name !== HtmlPageTimestampTable && !m.name.startsWith(AcsysDraftsEntityPrefix)).map(m => m.name as EntityModel);

/**
 * List of entities whose instances can be referenced by different identified entities. 
 * Used to limit size of chain of dependent changes
 */
const SharedIdentityEntities: EntityModel[] = [ 'ImageCategory', 'FlightOffer', 'StayOffer', 'Flight', 'City', 'Country', 'HotelReview' ];

declare type DependencyFlowMode = 'root' | 'independent-refence' | 'dependenant-reference';
declare type ChangedEntityInfo = {
  id: EntityId,
  changedEntity: EntityModel,
  dependencyFlowMode: DependencyFlowMode,
  modifiedUtc: Date
};

export interface IChangeDependencyTracker {
  getChangedEntityChain(changedEntity: EntityModel, id: EntityId, includeDeleted?: boolean): Promise<ChangedEntityInfo[]>;
  getAllChangedEntities(since: Date, maxCount: number): Promise<{ id: EntityId; entity: EntityModel; }[] | 'too-much'>;
}

declare type GetArrayItemType<T> = T extends RelativeIndexable<infer TItem> ? TItem : T;
declare type EntityModelDef = GetArrayItemType<Prisma.DMMF.Datamodel['models']>;

export class ChangeDependencyTracker implements IChangeDependencyTracker {
  private readonly logger: IAppLogger;
  private readonly dbRepository: PrismaClient;

  private readonly modelsMap: Map<EntityModel, EntityModelDef>;
  
  public static inject = ['dbRepository', 'logger'] as const;
  constructor (dbRepository: PrismaClient, logger: IAppLogger) {
    this.logger = logger;
    this.dbRepository = dbRepository;

    this.modelsMap = new Map(DomainModelDefinition.datamodel.models.map(m => [m.name as EntityModel, m]));
  }

  formatSqliteDateParam = (value: Date): string => {
    return dayjs(value).utc().format('YYYY-MM-DD HH:mm:ss.SSS UTC');
  };  

  convertDbDateValue = (dbValue: any): Date => {
    let result: Date;
    if(isNumber(dbValue)) {
      result = new Date(dbValue);
    } else {
      result = dayjs(dbValue).toDate();
    }
    return result;
  };

  async loadEntityModifiedUtc(entityModel: EntityModel, id: EntityId): Promise<Date | undefined> {
    this.logger.debug(`(ChangeDependencyTracker) loading entity modified utc, entityModel=${entityModel}, id=${id}`);

    const entityModelDef = this.getEntityModelDefOrThrow(entityModel);
    const entityModelIdDbColumn = this.getEntityIdDbColumnOrThrow(entityModelDef);
    const entityModelModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(entityModelDef, ModifiedTimeColumnName));
    const modifiedSql =  `/*EMUTC*/ SELECT ${this.getDmmfItemDbName(entityModelDef)}.${entityModelModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(entityModelDef)} WHERE ${this.getDmmfItemDbName(entityModelDef)}.${entityModelIdDbColumn} = ?`;
    const query = Prisma.raw(modifiedSql);
    query.values.push(id);

    const queryResult = await this.dbRepository.$queryRaw<{ modifiedUtc: any }[]>(query);
    if(!queryResult.length) {
      this.logger.verbose(`(ChangeDependencyTracker) loading modifiedUtc for entity - not found, entityModel=${entityModel}, id=${id}`);
      return undefined;
    }
    const result = this.convertDbDateValue(queryResult[0].modifiedUtc);

    this.logger.debug(`(ChangeDependencyTracker) entity modified utc loaded, entityModel=${entityModel}, id=${id}, result=${result.toISOString()}`);
    return result;
  }

  async getAllChangedEntities(since: Date, maxCount: number): Promise<{ id: EntityId; entity: EntityModel; }[] | 'too-much'> {
    this.logger.verbose(`(ChangeDependencyTracker) obtaining list of changed entities, since=${since.toISOString()}, maxCount=${maxCount}`);

    const allQueries: Prisma.Sql[] = [];

    this.logger.debug(`(ChangeDependencyTracker) constructing table queries, since=${since.toISOString()}`);
    const models = [...this.modelsMap.entries()].filter(m => m[1].fields.some(f => f.name === ModifiedTimeColumnName)).map(m => m[0]);
    for(let i = 0; i < models.length; i++) {
      const entityModel = models[i] as EntityModel;
      const entityModelDef = this.getEntityModelDefOrThrow(entityModel);
      const entityModelIdDbColumn = this.getEntityIdDbColumnOrThrow(entityModelDef);
      const entityModelModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(entityModelDef, ModifiedTimeColumnName));

      const modifiedSql =  `/*ME*/ SELECT '${this.getDmmfItemDbName(entityModelDef)}' AS "entity", ${this.getDmmfItemDbName(entityModelDef)}.${entityModelIdDbColumn} AS "id" FROM ${this.getDmmfItemDbName(entityModelDef)} WHERE ${this.getDmmfItemDbName(entityModelDef)}.${entityModelModifiedTimeDbColumn} >= ?`;
      const modifiedQuery = Prisma.raw(modifiedSql);
      
      const isSqlite = !!process.env.VITE_QUICKSTART;
      const sinceSqlParam = isSqlite ? this.formatSqliteDateParam(since) : since;
      modifiedQuery.values.push(sinceSqlParam);
      allQueries.push(modifiedQuery);
    }

    const result: { id: EntityId; entity: EntityModel; }[] = [];
    this.logger.debug(`(ChangeDependencyTracker) executing queries, since=${since.toISOString()}, count=${allQueries.length}`);
    for(let i = 0; i < allQueries.length; i++) {
      const query = allQueries[i];
      const modifiedEntities = await this.dbRepository.$queryRaw<{ entity: EntityModel, id: EntityId }[]>(query);
      if(modifiedEntities.length) {
        this.logger.debug(`(ChangeDependencyTracker) modified entities query results since=${since.toISOString()}, entity=${modifiedEntities[0].entity}, count=${modifiedEntities.length}`);
      }
      result.push(...(modifiedEntities).map(x => { return { entity: x.entity, id: x.id }; }));
      if(result.length > maxCount) {
        const stats = toPairs(groupBy(result, i => i.entity)).map(t => { return { entity: t[0], count: t[1].length }; });
        this.logger.warn(`(ChangeDependencyTracker) too much changed entities, since=${since.toISOString()}, stats=[${JSON.stringify(stats)}]`);
        return 'too-much';
      }
    }

    this.logger.verbose(`(ChangeDependencyTracker) list of changed entities obtained, since=${since.toISOString()}, count=${result.length}`);
    return result;
  }

  getDmmfItemDbName(dmmfItemNames: { dbName?: string | null, name: string }): string {
    return dmmfItemNames.dbName ?? dmmfItemNames.name;
  }

  getEntityModelDefOrThrow(name: EntityModel): EntityModelDef {
    const modelDef = this.modelsMap.get(name);
    if(!modelDef) {
      this.logger.error(`(ChangeDependencyTracker) entity model not found, name=${name}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error', 'error-page');
    }
    return modelDef;
  }

  getEntityFieldDefOrThrow(entityDef: EntityModelDef, fieldName: string): GetArrayItemType<EntityModelDef['fields']> {
    const fieldDef = entityDef.fields.find(f => f.name === fieldName);
    if(!fieldDef) {
      this.logger.error(`(ChangeDependencyTracker) entity field not found, entity=${entityDef.name}, field=${fieldName}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error', 'error-page');
    }
    return fieldDef;
  }

  getEntityIdDbColumnOrThrow(entityModel: EntityModelDef): string {
    const idField = entityModel.fields.find(f => f.isId);
    if(!idField) {
      this.logger.error(`(ChangeDependencyTracker) id field was not found for entity, name=${entityModel.name}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error', 'error-page');
    }
    return this.getDmmfItemDbName(idField);
  }

  getEntityIsDeletedColumn(entityModel: EntityModelDef): string | undefined {
    const isDeletedField = entityModel.fields?.find(f => f.name?.toLowerCase() === 'isdeleted');
    if(!isDeletedField) {
      return undefined;
    }
    return this.getDmmfItemDbName(isDeletedField);
  }

  async getDirectlyAffectedEntites(changedEntity: EntityModel, id: EntityId, includeDeleted: boolean, dependencyFlowMode: DependencyFlowMode): Promise<ChangedEntityInfo[]> {
    this.logger.debug(`(ChangeDependencyTracker) obtaining directly affected entities, changedEntity=${changedEntity}, id=${id}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}`);
    const result: ChangedEntityInfo[] = [];
    const fieldQueries: { sql: Prisma.Sql, dependencyFlowMode: DependencyFlowMode } [] = [];

    // 1. Add dependants which reference the changed entity
    const referencingEntities = [...this.modelsMap.entries()].filter(e => /*e[0] !== changedEntity &&*/ e[1].fields?.some(f => f.type === changedEntity)).map(e => e[1]);
    for(let i = 0; i < referencingEntities.length; i++) {
      const referencingEntityDef = this.getEntityModelDefOrThrow(referencingEntities[i].name as EntityModel);
      const referencingEntityIdDbColumn = this.getEntityIdDbColumnOrThrow(referencingEntityDef);
      const referencingEntityIsDeletedDbColumn = this.getEntityIsDeletedColumn(referencingEntityDef);
      const referencingEntityModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(referencingEntityDef, ModifiedTimeColumnName));
      const referencingFieldsDef = referencingEntityDef.fields?.filter(f =>  f.type === changedEntity && f.relationFromFields?.length);
      for(let j = 0; j < referencingFieldsDef.length; j++) {
        const referencingFieldDef = this.getEntityFieldDefOrThrow(referencingEntityDef, referencingFieldsDef[j].relationFromFields![0]);
        const referencingFieldDbColumn = this.getDmmfItemDbName(referencingFieldDef);

        const referencingEntitySql = (referencingEntityIsDeletedDbColumn && !includeDeleted) ?
          (`/*1*/ SELECT '${this.getDmmfItemDbName(referencingEntityDef)}' AS "entity", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIdDbColumn} AS "id", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(referencingEntityDef)} WHERE ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingFieldDbColumn} = ? AND ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIsDeletedDbColumn} = 0`) :
          (`/*1*/ SELECT '${this.getDmmfItemDbName(referencingEntityDef)}' AS "entity", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIdDbColumn} AS "id", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(referencingEntityDef)} WHERE ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingFieldDbColumn} = ?`);
        const referencingEntityQuery = Prisma.raw(referencingEntitySql);
        referencingEntityQuery.values.push(id);

        fieldQueries.push({ sql: referencingEntityQuery, dependencyFlowMode: 'dependenant-reference' });
      }
    }

    // 2. Add entities referenced by the changed entity
    if(dependencyFlowMode === 'root' || !SharedIdentityEntities.includes(changedEntity)) {
      const changedEntityDef = this.getEntityModelDefOrThrow(changedEntity);
      const changedEntityIdFieldDbColumn = this.getEntityIdDbColumnOrThrow(changedEntityDef);
      const changedEntityIsDeletedDbColumn = this.getEntityIsDeletedColumn(changedEntityDef);
      for(let i = 0; i < (changedEntityDef.fields ?? []).length; i++) {
        const fieldDef = changedEntityDef.fields[i];
        if(fieldDef.relationFromFields?.length) {
          const fromFieldDbColumn = fieldDef.relationFromFields[0];
          if(!fieldDef.relationToFields?.length) {
            this.logger.error(`(ChangeDependencyTracker) cannot obtain directly affected entities, expected relationTo field to be not empty, changedEntity=${changedEntity}, id=${id}, dependencyFlowMode=${dependencyFlowMode}, field=${fieldDef.name}, dbColumn=${fromFieldDbColumn}`);
            throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error', 'error-page');
          } 
          const toFieldDbColumn = fieldDef.relationToFields[0];
          const toEntityModel: EntityModel = fieldDef.type as EntityModel;
          if(SharedIdentityEntities.includes(toEntityModel)) {
            continue;
          }

          const toEntityDef = this.getEntityModelDefOrThrow(toEntityModel);
          const toEntityIsDeletedDbColumn = this.getEntityIsDeletedColumn(toEntityDef);
          const toEntityIdFieldDbColumn = this.getEntityIdDbColumnOrThrow(toEntityDef);
          const toEntityModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(toEntityDef, ModifiedTimeColumnName));
  
          const filterSql = changedEntityIsDeletedDbColumn && !includeDeleted ? 
            (`SELECT ${this.getDmmfItemDbName(changedEntityDef)}.${fromFieldDbColumn} FROM ${this.getDmmfItemDbName(changedEntityDef)} WHERE ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIdFieldDbColumn} = '${id}' AND ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIsDeletedDbColumn} = 0`) :
            (`SELECT ${this.getDmmfItemDbName(changedEntityDef)}.${fromFieldDbColumn} FROM ${this.getDmmfItemDbName(changedEntityDef)} WHERE ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIdFieldDbColumn} = '${id}'`);
  
          const toEntitySql = toEntityIsDeletedDbColumn && !includeDeleted ? 
            (`/*2*/ SELECT '${this.getDmmfItemDbName(toEntityDef)}' AS "entity", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIdFieldDbColumn} AS "id", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(toEntityDef)} WHERE ${this.getDmmfItemDbName(toEntityDef)}.${toFieldDbColumn} IN (${filterSql}) AND ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIsDeletedDbColumn} = 0`) : 
            (`/*2*/ SELECT '${this.getDmmfItemDbName(toEntityDef)}' AS "entity", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIdFieldDbColumn} AS "id", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(toEntityDef)} WHERE ${this.getDmmfItemDbName(toEntityDef)}.${toFieldDbColumn} IN (${filterSql})`);
          const toEntityQuery = Prisma.raw(toEntitySql);
  
          fieldQueries.push({ sql: toEntityQuery, dependencyFlowMode: 'independent-refence' });
        }
      }
    }

    this.logger.debug(`(ChangeDependencyTracker) executing affected entities queries, changedEntity=${changedEntity}, id=${id}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}, numQueries=${fieldQueries.length}`);
    for(let i = 0; i < fieldQueries.length; i++) {
      try {
        const query = fieldQueries[i];
        const affectedEntities = await this.dbRepository.$queryRaw<{ entity: EntityModel, id: EntityId, modifiedUtc: any }[]>(query.sql);
        result.push(...(affectedEntities).map(x => { return { changedEntity: x.entity, id: x.id, dependencyFlowMode: query.dependencyFlowMode, modifiedUtc: this.convertDbDateValue(x.modifiedUtc) }; }));
      } catch(err: any) {
        this.logger.error(`(ChangeDependencyTracker) error occured while executing affected entities queries, changedEntity=${changedEntity}, id=${id}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}, queries=${fieldQueries.map(q => `[${q.sql.sql}]`).join('; ')}`, err);
      }
    }

    this.logger.debug(`(ChangeDependencyTracker) directly affected entities obtained, changedEntity=${changedEntity}, id=${id}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}, result=[${JSON.stringify(result)}]`);
    return result;
  };

  async getChangedEntityChain(changedEntity: EntityModel, id: EntityId, includeDeleted?: boolean): Promise<ChangedEntityInfo[]> {
    includeDeleted ??= false;
    this.logger.verbose(`(ChangeDependencyTracker) get change chain, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}`);
    
    const MAX_ITERATIONS_COUNT = 100;

    const rootEntityModifiedUtc = await this.loadEntityModifiedUtc(changedEntity, id);
    if(!rootEntityModifiedUtc) {
      this.logger.verbose(`(ChangeDependencyTracker) change chain computed - root entity not found, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}, result=[]`);
      return [];
    }
    const iterationBatch: ChangedEntityInfo[] = [{ changedEntity, id, dependencyFlowMode: 'root', modifiedUtc: rootEntityModifiedUtc }];
    const entityChain = new Map<ReturnType<typeof hash>, ChangedEntityInfo>([[hash(omit(iterationBatch[0], 'dependencyFlowMode')), iterationBatch[0]]]);

    let iterCounter = 0;
    while(iterationBatch.length && iterCounter < MAX_ITERATIONS_COUNT) {
      this.logger.debug(`(ChangeDependencyTracker) iterationNo=${iterCounter}, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}, batchSize=${iterationBatch.length}`);
      const newBatchItems: ChangedEntityInfo[] = [];
      for(let i = 0; i < iterationBatch.length; i++) {
        const iterEntity = iterationBatch[i];
        const affectedIterEntities = await this.getDirectlyAffectedEntites(iterEntity.changedEntity, iterEntity.id, includeDeleted, iterEntity.dependencyFlowMode);
        for(let j = 0; j < affectedIterEntities.length; j++) {
          const affIterEntity = affectedIterEntities[j];
          const entityHash = hash(omit(affIterEntity, 'dependencyFlowMode'));
          if(entityChain.has(entityHash)) {
            continue;
          }
          this.logger.debug(`(ChangeDependencyTracker) new affected entity found iterationNo=${iterCounter}, affectedEntity=${affIterEntity.changedEntity}, affectedId=${affIterEntity.id}, affectedEntityFlowMode=${affIterEntity.dependencyFlowMode}, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}`);
          entityChain.set(entityHash, affIterEntity);
          newBatchItems.push(affIterEntity);
        }
      }

      iterationBatch.splice(0, iterationBatch.length);
      if(newBatchItems.length) {
        iterationBatch.push(...newBatchItems.splice(0, newBatchItems.length));
      }
      iterCounter++;
    }

    const result = [...entityChain.values()];
    if(iterCounter >= MAX_ITERATIONS_COUNT) {
      this.logger.error(`(ChangeDependencyTracker) maximum number of iterations exceeded, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}, current result=[${result.map(i => JSON.stringify(i)).join('; ')}]`);  
    } else {
      this.logger.verbose(`(ChangeDependencyTracker) change chain computed, entity=${changedEntity}, id=${id}, includeDeleted=${includeDeleted}, result=[${result.map(i => JSON.stringify(i)).join('; ')}]`);
    }
    return result;
  }
}


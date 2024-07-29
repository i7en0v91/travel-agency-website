import { Prisma, type PrismaClient } from '@prisma/client';
import { hash } from 'ohash';
import { AppException, AppExceptionCodeEnum, ModifiedTimeColumnName, HtmlPageTimestampTable, AcsysDraftsEntityPrefix, AppConfig, type UninitializedPageTimestamp } from '../app-facade/implementation';
import { formatIdsListParam, formatSqlDateParam } from './../helpers/db';
import { type EntityId, type IAppLogger } from '../app-facade/interfaces';
import pick from 'lodash-es/pick';
import groupBy from 'lodash-es/groupBy';
import toPairs from 'lodash-es/toPairs';
import dayjs from 'dayjs';
import isNumber from 'lodash-es/isNumber';
import sumBy from 'lodash-es/sumBy';
import flatten from 'lodash-es/flatten';
import chunk from 'lodash-es/chunk';

const DomainModelDefinition = Prisma.dmmf;

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

declare type DependencyFlowMode = 'root' | 'independent-refence' | 'dependent-reference';
declare type ChangedEntityInfo = {
  id: EntityId,
  changedEntity: EntityModel,
  dependencyFlowMode: DependencyFlowMode,
  modifiedUtc: Date
};

export interface IChangeDependencyTracker {
  getChangedEntityChain(changedEntities: { entity: EntityModel, id: EntityId }[], includeDeleted?: boolean): Promise<ChangedEntityInfo[]>;
  getChangedEntities(since: Date, maxCount: number): Promise<{ id: EntityId; entity: EntityModel; }[] | 'too-much'>;
  loadEntityModifiedUtc(entity: EntityModel, id: EntityId | 'most-recent', includeDeleted: boolean): Promise<Date | UninitializedPageTimestamp>;
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

  getStatsByKeyForLogMessage = <TItem>(items: TItem[], keySelector: (item: TItem) => string): [EntityModel, number][] => toPairs(groupBy(items, e => keySelector(e))).map(p => [p[0] as EntityModel, p[1].length]);

  convertDbDateValue = (dbValue: any): Date => {
    let result: Date;
    if(isNumber(dbValue)) {
      result = new Date(dbValue);
    } else {
      result = dayjs(dbValue).toDate();
    }
    return result;
  };

  async loadEntityModifiedUtc(entity: EntityModel, id: EntityId | 'most-recent', includeDeleted: boolean): Promise<Date | UninitializedPageTimestamp> {
    this.logger.debug(`(ChangeDependencyTracker) get modified utc, entity=${entity}, id=${id ?? ''}, includeDeleted=${includeDeleted}`);

    let result: Date | UninitializedPageTimestamp = 0;
    if(id === 'most-recent') {
      const entityModelDef = this.getEntityModelDefOrThrow(entity);
      const entityModelModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(entityModelDef, ModifiedTimeColumnName));
      const referencingEntityIsDeletedDbColumn = this.getEntityIsDeletedColumn(entityModelDef);
      const modifiedSql =  `/*MRMUTC*/ SELECT MAX(${entityModelModifiedTimeDbColumn}) AS "modifiedUtc" FROM ${this.getDmmfItemDbName(entityModelDef)} WHERE ${this.getDmmfItemDbName(entityModelDef)}.${entityModelModifiedTimeDbColumn} IS NOT NULL ${includeDeleted ? '' : `AND ${this.getDmmfItemDbName(entityModelDef)}.${referencingEntityIsDeletedDbColumn} = 0`}`;
      const query = Prisma.raw(modifiedSql);
      const queryResult = await this.dbRepository.$queryRaw<{ modifiedUtc: any }[]>(query);
      for(let i = 0; i < queryResult.length; i++) {
        if(queryResult[i].modifiedUtc) {
          result = this.convertDbDateValue(queryResult[i].modifiedUtc);
          break;
        }
      }
    } else {
      const loaded = toPairs((await this.loadEntitiesModifiedUtc([{ entity, id }]))).map(x => this.convertDbDateValue(x[1]));
      if(loaded.length && !!loaded[0]) {
        result = loaded[0];
      }
    }

    this.logger.debug(`(ChangeDependencyTracker) get modified utc - completed, entity=${entity}, id=${id ?? ''}, includeDeleted=${includeDeleted}, result=${result === 0 ? result : result.toISOString()}`);
    return result;
  };

  async loadEntitiesModifiedUtc(changedEntities: { entity: EntityModel, id: EntityId }[]): Promise<Map<EntityId, Date>> {
    this.logger.debug(`(ChangeDependencyTracker) loading entities modified utc, totalCount=${changedEntities.length}`);
    if(changedEntities.length === 0) {
      this.logger.debug(`(ChangeDependencyTracker) entities modified utc loaded, totalCount=${changedEntities.length}, result=[]`);
      return new Map<EntityId, Date>([]);
    }

    const result = new Map<EntityId, Date>([]);

    const MaxBatchPortionSize = AppConfig.caching.invalidation.batching.modifiedEntitiesQueryBatch;
    const itemsChunks = chunk(changedEntities, MaxBatchPortionSize);
    for(let j = 0; j < itemsChunks.length; j++) {
      const chunkItems = itemsChunks[j];
      const entitiesByModel = toPairs(groupBy(chunkItems, x => x.entity));
      const modelQueries: string[] = [];
      for(let i = 0; i < entitiesByModel.length; i++) {
        const entityModel = entitiesByModel[i][0] as EntityModel;
        const entityModelDef = this.getEntityModelDefOrThrow(entityModel);
        const entityModelIdDbColumn = this.getEntityIdDbColumnOrThrow(entityModelDef);
        const entityModelModifiedTimeDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(entityModelDef, ModifiedTimeColumnName));
        const modifiedSql =  `/*EMUTC*/ SELECT ${entityModelIdDbColumn} AS "id", ${entityModelModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(entityModelDef)} WHERE ${this.getDmmfItemDbName(entityModelDef)}.${entityModelIdDbColumn} IN (${formatIdsListParam(chunkItems.map(e => e.id))})`;
        modelQueries.push(modifiedSql);
      }
      
      const query = Prisma.raw(modelQueries.join(' UNION '));
      const queryResult = await this.dbRepository.$queryRaw<{ id: string, modifiedUtc: any }[]>(query);

      for(let i = 0; i < queryResult.length; i++) {
        const id = queryResult[i].id;
        if(result.has(id)) {
          continue;
        }
        result.set(id, this.convertDbDateValue(queryResult[i].modifiedUtc));
      }
    }

    this.logger.debug(`(ChangeDependencyTracker) entities modified utc loaded, totalCount=${result.size}`);
    return result;
  }

  async getChangedEntities(since: Date, maxCount: number): Promise<{ id: EntityId; entity: EntityModel; }[] | 'too-much'> {
    this.logger.verbose(`(ChangeDependencyTracker) obtaining list of changed entities, since=${since.toISOString()}, maxCount=${maxCount}`);

    const entityQueries: {sqlText: string, params: any}[] = [];

    this.logger.debug(`(ChangeDependencyTracker) constructing table queries, since=${since.toISOString()}`);
    const timestmapColumnName = ModifiedTimeColumnName;

    const models = [...this.modelsMap.entries()].filter(m => m[1].fields.some(f => f.name === timestmapColumnName)).map(m => m[0]);
    for(let i = 0; i < models.length; i++) {
      const entityModel = models[i] as EntityModel;
      const entityModelDef = this.getEntityModelDefOrThrow(entityModel);
      const entityModelIdDbColumn = this.getEntityIdDbColumnOrThrow(entityModelDef);
      const entityModelTimestampDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(entityModelDef, timestmapColumnName));

      const timestampSql =  `/*ME*/ SELECT '${this.getDmmfItemDbName(entityModelDef)}' AS "entity", ${this.getDmmfItemDbName(entityModelDef)}.${entityModelIdDbColumn} AS "id" FROM ${this.getDmmfItemDbName(entityModelDef)} WHERE ${this.getDmmfItemDbName(entityModelDef)}.${entityModelTimestampDbColumn} >= ?`;
      entityQueries.push({ sqlText: timestampSql, params: formatSqlDateParam(since) });
    }

    this.logger.debug(`(ChangeDependencyTracker) grouping queries, num sub-queries=${entityQueries.length}, since=${since.toISOString()}`);
    const modifiedSqlQuery = Prisma.raw(entityQueries.map(q => q.sqlText).join(' UNION '));
    modifiedSqlQuery.values.push(...entityQueries.map(q => q.params));

    const result: { id: EntityId; entity: EntityModel; }[] = [];
    const modifiedEntities = await this.dbRepository.$queryRaw<{ entity: EntityModel, id: EntityId }[]>(modifiedSqlQuery);
    if(modifiedEntities.length) {
      this.logger.debug(`(ChangeDependencyTracker) modified entities query results count=${modifiedEntities.length}, since=${since.toISOString()}`);
    }
    result.push(...(modifiedEntities).map(x => { return { entity: x.entity, id: x.id }; }));
    if(result.length > maxCount) {
      this.logger.warn(`(ChangeDependencyTracker) too much changed entities, since=${since.toISOString()}, stats=[${JSON.stringify(this.getStatsByKeyForLogMessage(result, i => i.entity))}]`);
      return 'too-much';
    }

    this.logger.verbose(`(ChangeDependencyTracker) list of changed entities obtained, count=${result.length}, since=${since.toISOString()}`);
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

  /**
   * De-duplication of result array items is delegated to calling methods for performance
   */
  async getDirectlyAffectedEntites(changedEntities: [EntityModel, Omit<ChangedEntityInfo, 'dependencyFlowMode'>[]][], dependencyFlowMode: DependencyFlowMode, includeDeleted: boolean): Promise<ChangedEntityInfo[]> {
    const totalCount = sumBy(changedEntities, e => e[1].length);
    this.logger.debug(`(ChangeDependencyTracker) obtaining directly affected entities, totalCount=${totalCount}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}`);
    if(!changedEntities.length) {
      this.logger.debug(`(ChangeDependencyTracker) directly affected entities obtained - empty, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}, result=[]`);
      return [];
    }

    const result: ChangedEntityInfo[] = [];
    const fieldQueries: { selectSql: string, params: any } [] = [];

    for(let e = 0; e < changedEntities.length; e++) {
      const changedEntity = changedEntities[e][0];
      const ids = changedEntities[e][1].map(x => x.id);

      // 1. Add dependants which reference the changed entity
      const referencingEntities = [...this.modelsMap.entries()].filter(t => /*t[0] !== changedEntity &&*/ t[1].fields?.some(f => f.type === changedEntity)).map(c => c[1]);
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
            (`/*1*/ SELECT '${this.getDmmfItemDbName(referencingEntityDef)}' AS "entity", '${<DependencyFlowMode>'dependent-reference'}' as "dependencyFlowMode", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIdDbColumn} AS "id", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(referencingEntityDef)} WHERE ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingFieldDbColumn} IN (${formatIdsListParam(ids)}) AND ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIsDeletedDbColumn} = 0`) :
            (`/*1*/ SELECT '${this.getDmmfItemDbName(referencingEntityDef)}' AS "entity", '${<DependencyFlowMode>'dependent-reference'}' as "dependencyFlowMode", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityIdDbColumn} AS "id", ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingEntityModifiedTimeDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(referencingEntityDef)} WHERE ${this.getDmmfItemDbName(referencingEntityDef)}.${referencingFieldDbColumn} IN (${formatIdsListParam(ids)})`);
          fieldQueries.push({ selectSql: referencingEntitySql, params: undefined });
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
              this.logger.error(`(ChangeDependencyTracker) cannot obtain directly affected entities, expected relationTo field to be not empty, changedEntity=${changedEntity}, ids=${ids.join('; ')}, dependencyFlowMode=${dependencyFlowMode}, field=${fieldDef.name}, dbColumn=${fromFieldDbColumn}`);
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
            const toEntityTiemstampDbColumn = this.getDmmfItemDbName(this.getEntityFieldDefOrThrow(toEntityDef, ModifiedTimeColumnName));
    
            const filterSql = changedEntityIsDeletedDbColumn && !includeDeleted ? 
              (`SELECT ${this.getDmmfItemDbName(changedEntityDef)}.${fromFieldDbColumn} FROM ${this.getDmmfItemDbName(changedEntityDef)} WHERE ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIdFieldDbColumn} IN (${formatIdsListParam(ids)}) AND ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIsDeletedDbColumn} = 0`) :
              (`SELECT ${this.getDmmfItemDbName(changedEntityDef)}.${fromFieldDbColumn} FROM ${this.getDmmfItemDbName(changedEntityDef)} WHERE ${this.getDmmfItemDbName(changedEntityDef)}.${changedEntityIdFieldDbColumn} IN (${formatIdsListParam(ids)})`);
            
            const toEntitySql = toEntityIsDeletedDbColumn && !includeDeleted ? 
              (`/*2*/ SELECT '${this.getDmmfItemDbName(toEntityDef)}' AS "entity", '${<DependencyFlowMode>'independent-refence'}' as "dependencyFlowMode", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIdFieldDbColumn} AS "id", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityTiemstampDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(toEntityDef)} WHERE ${this.getDmmfItemDbName(toEntityDef)}.${toFieldDbColumn} IN (${filterSql}) AND ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIsDeletedDbColumn} = 0`) : 
              (`/*2*/ SELECT '${this.getDmmfItemDbName(toEntityDef)}' AS "entity", '${<DependencyFlowMode>'independent-refence'}' as "dependencyFlowMode", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityIdFieldDbColumn} AS "id", ${this.getDmmfItemDbName(toEntityDef)}.${toEntityTiemstampDbColumn} AS "modifiedUtc" FROM ${this.getDmmfItemDbName(toEntityDef)} WHERE ${this.getDmmfItemDbName(toEntityDef)}.${toFieldDbColumn} IN (${filterSql})`);
            
            fieldQueries.push({ selectSql: toEntitySql, params: undefined });
          }
        }
      } 
    }

    this.logger.debug(`(ChangeDependencyTracker) executing affected entities query, num sub-queries=${fieldQueries.length}, totalCount=${totalCount}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}`);
    const query = Prisma.raw(fieldQueries.map(q => q.selectSql).join(' UNION '));

    const affectedEntities = await this.dbRepository.$queryRaw<{ entity: EntityModel, dependencyFlowMode: DependencyFlowMode, id: EntityId, modifiedUtc: any }[]>(query);
    result.push(...(affectedEntities).map(x => { return { changedEntity: x.entity, id: x.id, dependencyFlowMode: x.dependencyFlowMode, modifiedUtc: this.convertDbDateValue(x.modifiedUtc) }; }));

    this.logger.debug(`(ChangeDependencyTracker) directly affected entities obtained, totalCount=${totalCount}, dependencyFlowMode=${dependencyFlowMode}, includeDeleted=${includeDeleted}, resultCount=[${result.length}]`);
    return result;
  };

  async getChangedEntityChain(changedEntities: { entity: EntityModel, id: EntityId }[], includeDeleted?: boolean): Promise<ChangedEntityInfo[]> {
    includeDeleted ??= false;
    this.logger.verbose(`(ChangeDependencyTracker) get change chain, totalCount=${changedEntities.length}, includeDeleted=${includeDeleted}`);

    if(changedEntities.length === 0) {
      this.logger.debug(`(ChangeDependencyTracker) change chain computed, totalCount=${changedEntities.length}, result=[]`);
      return [];
    }
    
    this.logger.debug(`(ChangeDependencyTracker) loading root entities modified utc, totalCount=${changedEntities.length}, grouping=${JSON.stringify(this.getStatsByKeyForLogMessage(changedEntities, e => e.entity))}`);

    const rootEntitiesModifiedUtc = await this.loadEntitiesModifiedUtc(changedEntities);
    const notFoundRootEntities = changedEntities.filter(e => !rootEntitiesModifiedUtc.has(e.id));
    if(notFoundRootEntities.length) {
      this.logger.verbose(`(ChangeDependencyTracker) some root entities were not found: ${JSON.stringify(notFoundRootEntities)}, includeDeleted=${includeDeleted}`);
    }

    const entitiesByModel = toPairs(groupBy(changedEntities, x => x.entity)).map(p => { return { entity: p[0] as EntityModel, ids: p[1].map(i => i.id) }; });
    const iterationBatch: [EntityModel, ChangedEntityInfo[]][] = entitiesByModel.map(e => {
      const changedInfos = e.ids.map(id => {
        if(!rootEntitiesModifiedUtc.has(id)) {
          return undefined;
        }

        return {
          id: id,
          changedEntity: e.entity,
          dependencyFlowMode: 'root' as DependencyFlowMode,
          modifiedUtc: rootEntitiesModifiedUtc.get(id)!
        };
      }).filter(i => !!i) as ChangedEntityInfo[];

      return [e.entity, changedInfos];
    });
    
    const resultEntityChain = new Map<ReturnType<typeof hash>, ChangedEntityInfo>();
    for(let i = 0; i < iterationBatch.length; i++) {
      const entities = iterationBatch[i];
      for(let j = 0; j < entities[1].length; j++) {
        const batchItem = entities[1][j];
        const batchItemHash = hash(pick(batchItem, 'id', 'changedEntity'));
        if(resultEntityChain.has(batchItemHash)) {
          continue;
        }
        resultEntityChain.set(batchItemHash, batchItem);
      }
    }

    const MaxIterationsCount = 100;
    const MaxBatchPortionSize = AppConfig.caching.invalidation.batching.relatedEntitiesQueryBatch;
    let iterCounter = 0;
    while(iterationBatch.length && iterCounter < MaxIterationsCount) {
      this.logger.debug(`(ChangeDependencyTracker) iterationNo=${iterCounter}, batch size=${sumBy(iterationBatch, e => e[1].length)}, includeDeleted=${includeDeleted}`);
      const newBatchItemsMap = new Map<EntityModel, ChangedEntityInfo[]>([]);

      const batchByFlowMode = toPairs(groupBy(flatten(iterationBatch.map(x => x[1])), i => i.dependencyFlowMode));
      for(let i = 0; i < batchByFlowMode.length; i++) {
        const dependencyFlowMode = batchByFlowMode[i][0] as DependencyFlowMode;
        const batchItems = toPairs(groupBy(batchByFlowMode[i][1], i => i.changedEntity)) as [EntityModel, ChangedEntityInfo[]][];
        const itemsChunks = chunk(batchItems, MaxBatchPortionSize);
        for(let j = 0; j < itemsChunks.length; j++) {
          this.logger.debug(`(ChangeDependencyTracker) iterationNo=${iterCounter}, obtaining affected entities for items chunk #${j}, includeDeleted=${includeDeleted}`);
          const chunkItems = itemsChunks[j];
          const affectedEntities = await this.getDirectlyAffectedEntites(chunkItems, dependencyFlowMode, includeDeleted);

          for(let k = 0; k < affectedEntities.length; k++) {
            const affIterEntity = affectedEntities[k];
            const entityHash = hash(pick(affIterEntity, 'changedEntity', 'id'));
            if(resultEntityChain.has(entityHash)) {
              continue;
            }

            this.logger.debug(`(ChangeDependencyTracker) new affected entity found iterationNo=${iterCounter}, chunk #${j}, affectedEntity=${affIterEntity.changedEntity}, affectedId=${affIterEntity.id}, affectedEntityFlowMode=${affIterEntity.dependencyFlowMode}, includeDeleted=${includeDeleted}`);
            resultEntityChain.set(entityHash, affIterEntity);
            let newBatchItemsForEntity = newBatchItemsMap.get(affIterEntity.changedEntity);
            if(!newBatchItemsForEntity) {
              newBatchItemsForEntity = [];
              newBatchItemsMap.set(affIterEntity.changedEntity, newBatchItemsForEntity);
            }
            newBatchItemsForEntity.push(affIterEntity);
          }
        }
      }
      
      iterationBatch.splice(0, iterationBatch.length);
      if(newBatchItemsMap.size) {
        [...newBatchItemsMap.entries()].forEach(t => {
          iterationBatch.push([t[0], t[1]]);
        });
      }
      newBatchItemsMap.clear();

      iterCounter++;
    }

    const result = [...resultEntityChain.values()];
    if(iterCounter >= MaxIterationsCount) {
      this.logger.error(`(ChangeDependencyTracker) maximum number of iterations exceeded, totalCount=${changedEntities.length}, grouping=${JSON.stringify(entitiesByModel.map(p => [p.entity, p.ids.length]))}, includeDeleted=${includeDeleted}`);  
    } else {
      this.logger.verbose(`(ChangeDependencyTracker) change chain computed, totalCount=${changedEntities.length}, grouping=${JSON.stringify(entitiesByModel.map(p => [p.entity, p.ids.length]))}, includeDeleted=${includeDeleted}, resultCount=[${result.length}]`);
    }
    return result;
  }
}


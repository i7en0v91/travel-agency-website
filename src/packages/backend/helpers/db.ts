import { type IAppLogger, AppConfig, DbVersionDraft, isPublishEnv, isQuickStartEnv, EntityIdTestRegEx } from '@golobe-demo/shared';
import { createPrismaClient } from './../prisma/client';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { IConcurrentlyModifyingEntity } from './../types';
import dayjs from 'dayjs';
import { getServerServices } from './service-accessors';

export class DbConcurrentUpdateException extends Error {
  public dbException: Error;

  constructor (message: string, dbException: Error) {
    super(message);
    this.dbException = dbException;
  }
}

export async function executeWithConcurrencyErrorCheck (concurrentEntity: IConcurrentlyModifyingEntity, dbOperation: () => Promise<void>) {
  try {
    await dbOperation();
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        if (concurrentEntity.version === DbVersionDraft) {
          // real duplication
          throw e;
        } else {
          throw new DbConcurrentUpdateException(`seems like concurrent update violation detected, version=${concurrentEntity.version}`, e);
        }
      }
    }
    throw e;
  }
};

export async function executeWithConcurrentUpdateRetries (concurrentEntity: () => IConcurrentlyModifyingEntity, onCollision: () => Promise<void>, dbOperation: (entity: IConcurrentlyModifyingEntity) => Promise<void>) {
  const logger = getServerServices().getLogger();

  let numRetries = 0;
  while (numRetries <= AppConfig.maxDbConcurrentUpdateAttemps) {
    const entity = concurrentEntity();
    try {
      await executeWithConcurrencyErrorCheck(entity, async () => { await dbOperation(entity); });
      break;
    } catch (err: any) {
      if (err instanceof DbConcurrentUpdateException) {
        const concurrentErr = err as DbConcurrentUpdateException;
        numRetries++;
        if(numRetries >= AppConfig.maxDbConcurrentUpdateAttemps) {
          logger?.warn(`maximum concurrent update collisions reached, version=${concurrentEntity().version}`, concurrentErr.dbException);
          throw concurrentErr.dbException;
        }

        logger?.info(`concurrent update collision detected, retrying ${numRetries} attempt, version=${entity.version}`);
        try {
          await onCollision();
        } catch (err: any) {
          logger?.warn(`failed to handle udpate collision, version=${entity.version}`, err);
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
}

export function mapEnumDbValue (enumValue: any): string {
  return enumValue.valueOf();
}

export function mapGeoCoord(coord: number): string {
  return coord.toFixed(6);
}

export function mapDbGeoCoord(coord: string): number {
  return parseFloat(coord);
}

export function mapDate(date: Date): number {
  const time = date.getTime();
  return (time - time % 1000) / 1000; // seconds resolution timestamp
}

export function mapDbDate(dateTimestamp: number): Date {
  return new Date(dateTimestamp * 1000);
}

export function formatSqlDateParam(value: Date): any {
  return dayjs(value).utc().format(isSqlite() ? 'YYYY-MM-DD HH:mm:ss.SSS UTC' : 'YYYY-MM-DD HH:mm:ss.SSS');
};  

export function formatIdsListParam(ids: string[]): string {
  if(isPublishEnv() && ids.find(id => !(EntityIdTestRegEx.test(id)))) {
    throw new Error(`not an ids list: [${ids.join(',')}]`);
  }
  return ids.map(id => `'${id}'`).join(',');
}

export function isSqlite(): boolean {
  return isQuickStartEnv();
}

export async function getGlobalPrismaClient(logger?: IAppLogger): Promise<PrismaClient> {
  if(!(globalThis as any).GlobalPrismaClient) {
    const prismaClient = await createPrismaClient(logger);
    (globalThis as any).GlobalPrismaClient = prismaClient;  
  }
  return (globalThis as any).GlobalPrismaClient;
}


export async function executeInTransaction<TResult>(dbStatements: () => Promise<TResult>, dbRepository: PrismaClient): Promise<TResult> {
  if(isSqlite()) {
    // KB: Prisma 6.2.1 - only Serializable isolation level is supported for SQLite => need to release db object locks asap
    // (https://www.prisma.io/docs/orm/prisma-client/queries/transactions#supported-isolation-levels)
    return await dbStatements();
  } else {
    return await dbRepository.$transaction(dbStatements);
  }
}
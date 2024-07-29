import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { type IConcurrentlyModifyingEntity } from '../app-facade/interfaces';
import { AppConfig, DbVersionDraft, DbConcurrentUpdateException, isPublishEnv, isQuickStartEnv, EntityIdTestRegEx } from '../app-facade/implementation';
import dayjs from 'dayjs';

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
  const logger = ServerServicesLocator.getLogger();

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

export async function obtainFreeSlug (tokens: string[], testSlugUsedFunc: (slug: string) => Promise<boolean>, maxIter: number = 1000) : Promise<string | undefined> {
  const logger = ServerServicesLocator.getLogger();
  logger.debug(`obtain free slug, tokens=[${tokens.join('; ')}]`);

  const resultBase = slugify(tokens.join(' ').trim());
  if (resultBase.length === 0) {
    logger.warn(`cannot obtain free slug because of empty slug data, tokens=[${tokens.join('; ')}]`);
    throw new Error('empty slug data');
  }

  let result = resultBase;
  for (let i = 0; i <= maxIter; i++) {
    if (i === maxIter) {
      logger.warn(`cannot obtained free slug - no free variants, tokens=[${tokens.join('; ')}]`);
      return undefined;
    }

    if (!(await testSlugUsedFunc(result))) {
      break;
    }
    result = `${resultBase}-${i + 1}`;
  }

  logger.debug(`free slug obtained, tokens=[${tokens.join('; ')}], result=${result}`);
  return result;
}

export function mapEnumValue (enumValue: any): string {
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

export function isSqlite(): boolean {
  return isQuickStartEnv();
}

export function formatIdsListParam(ids: string[]): string {
  if(isPublishEnv() && ids.find(id => !(EntityIdTestRegEx.test(id)))) {
    throw new Error(`not an ids list: [${ids.join(',')}]`);
  }
  return ids.map(id => `'${id}'`).join(',');
}

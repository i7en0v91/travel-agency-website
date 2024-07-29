import { PrismaClient } from '@prisma/client';
import { type IAppLogger } from './../app-facade/interfaces';
import { lookupValueOrThrow, QuickStartDir, QuickStartDbFile, AcsysExecDir, AcsysSQLiteDbName, CmsType } from './../app-facade/implementation';
import { access } from 'fs/promises';
import { isSqlite } from './../helpers/db';
import { resolve, join } from 'pathe';
import { resolveParentDirectory } from './../../utils/fs';

export async function createPrismaClient (logger?: IAppLogger): Promise<PrismaClient> {
  logger?.verbose(`initializing prisma client`);

  let datasourceUrl: string | undefined;
  if (isSqlite()) {
    logger?.verbose('locating SQLite db directory... ');
    const cwd = resolve('./');
    if(process.env.CMS) {
      const cmsType = lookupValueOrThrow(CmsType, process.env.CMS) as CmsType;
      if(cmsType === CmsType.acsys) {
        datasourceUrl = await resolveParentDirectory(cwd, 'src');
        if (datasourceUrl) {
          datasourceUrl = `${join(datasourceUrl, AcsysExecDir, AcsysSQLiteDbName)}`;
        }
      } else {
        logger?.error(`unexpected CMS type, cms=${process.env.CMS}`);
        throw new Error('unexpected CMS type');
      }
    } else {
      datasourceUrl = await resolveParentDirectory(cwd, 'src');
      if (datasourceUrl) {
        datasourceUrl = `${join(datasourceUrl, QuickStartDir, QuickStartDbFile)}`;
      }
    }
    
    if (!datasourceUrl) {
      logger?.error(`failed to locate SQLite db directory, cwd=${cwd}`);
      throw new Error('failed to locate SQLite db directory');
    }

    try {
      await access(datasourceUrl);
    } catch (err: any) {
      logger?.error(`cannot access SQLite db file, path=${datasourceUrl}`);
      throw new Error('cannot access SQLite db file');
    }

    logger?.info(`the following SQLite db file will be used, path=${datasourceUrl}`);
    datasourceUrl = `file:${datasourceUrl}`;
  }

  const prismaClient = new PrismaClient({
    datasourceUrl,
    log: [
      {
        emit: 'event',
        level: 'query'
      },
      {
        emit: 'event',
        level: 'error'
      },
      {
        emit: 'event',
        level: 'info'
      },
      {
        emit: 'event',
        level: 'warn'
      }
    ]
  });
  prismaClient.$on('query', (e) => { logger?.debug(`prisma orm, query: ${e.query}; params: ${e.params}; duration: ${e.duration}; ts: ${e.timestamp}`); });
  prismaClient.$on('info', (e) => { logger?.info(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  prismaClient.$on('warn', (e) => { logger?.warn(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  prismaClient.$on('error', (e) => { logger?.error(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  
  logger?.verbose('prisma client initialized');
  return prismaClient;
}
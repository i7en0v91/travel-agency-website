import { isQuickStartEnv, AppConfig, lookupParentDirectory, type IAppLogger } from '@golobe-demo/shared';
import { PrismaClient } from '@prisma/client';
import { access } from 'fs/promises';
import { resolve, join } from 'pathe';

const CommonLogProps = { component: 'PrismaClient' };
const CommonDiagnosticsLogProps = { component: 'PrismaClientDiagnostics' };
export async function createPrismaClient (logger?: IAppLogger): Promise<PrismaClient> {
  logger = logger ? logger.addContextProps(CommonLogProps) : undefined;
  logger?.verbose(`initializing prisma client`);

  let datasourceUrl: string | undefined;
  if (isQuickStartEnv()) {
    logger?.verbose('locating SQLite db directory... ');
    const cwd = resolve('./');
    
    datasourceUrl = await lookupParentDirectory(cwd, 'src', async (path: string) => { await access(path); return true; });
    if (datasourceUrl) {
      datasourceUrl = `${join(datasourceUrl, AppConfig.acsys.execDir, AppConfig.acsys.dbName)}`;
    } else {
      logger?.error(`failed to locate SQLite db directory, cwd=${cwd}`, undefined, { cwd });
      throw new Error('failed to locate SQLite db directory');
    }
    
    try {
      await access(datasourceUrl);
    } catch (err: any) {
      logger?.error(`cannot access SQLite db file`, err, { path: datasourceUrl });
      throw new Error('cannot access SQLite db file');
    }

    logger?.info(`the following SQLite db file will be used`, { path: datasourceUrl });
    datasourceUrl = `file:${datasourceUrl}`;
  }

  const diagnosticsLogger = logger ? logger.addContextProps(CommonDiagnosticsLogProps) : undefined;
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
  prismaClient.$on('query', (e) => { diagnosticsLogger?.debug(`prisma orm`, { query: e.query, params: e.params, duration: e.duration, ts: e.timestamp }); });
  prismaClient.$on('info', (e) => { diagnosticsLogger?.info(`prisma orm`, { message: e.message, ts: e.timestamp }); });
  prismaClient.$on('warn', (e) => { diagnosticsLogger?.warn(`prisma orm`, undefined, { message: e.message, ts: e.timestamp }); });
  prismaClient.$on('error', (e) => { diagnosticsLogger?.error(`prisma orm`, undefined, { message: e.message, ts: e.timestamp }); });
  
  logger?.verbose('prisma client initialized');
  return prismaClient;
}
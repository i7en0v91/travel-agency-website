import { PrismaClient } from '@prisma/client';
import type { IAppLogger } from '../shared/applogger';

export function createPrismaClient (logger: IAppLogger, datasourceUrl: string | undefined): PrismaClient {
  logger.verbose(`initializing prisma client, datasourceUrl=${datasourceUrl}`);
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
  prismaClient.$on('query', (e) => { logger.debug(`prisma orm, query: ${e.query}; params: ${e.params}; duration: ${e.duration}; ts: ${e.timestamp}`); });
  prismaClient.$on('info', (e) => { logger.info(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  prismaClient.$on('warn', (e) => { logger.warn(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  prismaClient.$on('error', (e) => { logger.error(`prisma orm,: ${e.message}; ts: ${e.timestamp}`); });
  logger.verbose('prisma client initialized');
  return prismaClient;
}

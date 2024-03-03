import { existsSync, mkdirSync } from 'fs';
import { access } from 'fs/promises';
import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import { createStorage, type Storage, type StorageValue } from 'unstorage';
import { resolve, join } from 'pathe';
import { SessionLogic } from '../server-logic/session/session-logic';
import { UserLogic } from '../server-logic/user-logic';
import { ImageBytesProvider } from '../server-logic/image/image-bytes-provider';
import { ServerLogger } from '../server-logic/helpers/logging';
import type { IServerServicesLocator } from '../shared/serviceLocator';
import { type IAppLogger } from '../shared/applogger';
import { initializeSession } from '../server-logic/session/server';
import { UserSessionOnServer } from '../server-logic/helpers/user-session';
import { ImageLogic } from '../server-logic/image/image-logic';
import { FileLogic } from '../server-logic/file-logic';
import AppConfig from '../appconfig';
import { EmailSender } from '../server-logic/email-sender';
import { TokenLogic } from '../server-logic/token-logic';
import { ServerI18n } from '../server-logic/helpers/i18n';
import { CitiesLogic } from '../server-logic/cities-logic';
import { FlightsLogic } from '../server-logic/flights-logic';
import { StaysLogic } from '../server-logic/stays-logic';
import { CompanyReviewLogic } from '../server-logic/company-review-logic';
import { EntityCacheLogic } from '../server-logic/entity-cache-logic';
import { ImageCategoryLogic } from '../server-logic/image/image-category-logic';
import { MailTemplateLogic } from '../server-logic/mail-template-logic';
import { GeoLogic } from '../server-logic/geo-logic';
import { AirportLogic } from '../server-logic/airport-logic';
import { AssetsProvider } from '../server-logic/assets-provider';
import { AirlineCompanyLogic } from './../server-logic/airline-company-logic';
import { AirplaneLogic } from './../server-logic/airplane-logic';
import { createPrismaClient } from './../prisma/client';
import installLoggingHooks from './common/errors-hooks';
import { isQuickStartEnv } from './../shared/common';
import { resolveParentDirectory } from './../shared/fs';

function createCache (): Storage<StorageValue> {
  return createStorage();
}

function ensureImageCacheDir (logger: IAppLogger): string {
  logger.info(`ensuring images cache directory: dir=${AppConfig.images.cacheFsDir}`);
  const cacheDir = resolve(AppConfig.images.cacheFsDir);
  if (!existsSync(cacheDir)) {
    logger.info(`creating images cache directory ${cacheDir}`);
    mkdirSync(cacheDir, { recursive: true });
  }
  logger.verbose('image cache directory ensured');
  return cacheDir;
}

async function getPublicAssetsStorage (logger: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$publicAssetsStorage as Storage<StorageValue>;
  if (!result) {
    logger.error('public assets storage is not available');
    throw new Error('public assets storage is not available');
  }

  if (!(await result.getItem('geo/world-map.json'))) {
    logger.error('public assets storage is miconfigured');
    throw new Error('public assets storage is miconfigured');
  }

  return result;
}

async function buildServiceLocator (logger: IAppLogger) : Promise<IServerServicesLocator> {
  let dbUrlOverwrite: string | undefined;
  if (isQuickStartEnv()) {
    logger.verbose('locating SQLite db directory...');
    const cwd = process.cwd();
    dbUrlOverwrite = await resolveParentDirectory(cwd, 'src');
    if (dbUrlOverwrite) {
      dbUrlOverwrite = `${join(dbUrlOverwrite, '.tmp', 'golobe-demo.db')}`;
    }

    if (!dbUrlOverwrite) {
      logger.error(`failed to locate SQLite db directory, cwd=${cwd}`);
      throw new Error('failed to locate SQLite db directory');
    }

    try {
      await access(dbUrlOverwrite);
    } catch (err: any) {
      logger.error(`cannot access SQLite db file, path=${dbUrlOverwrite}`);
      throw new Error('cannot access SQLite db file');
    }

    logger.info(`the following SQLite db file will be used, path=${dbUrlOverwrite}`);
    dbUrlOverwrite = `file:${dbUrlOverwrite}`;
  }

  const publicAssetsStorage = await getPublicAssetsStorage(logger);

  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ServerLogger, Scope.Singleton)
    .provideValue('dbRepository', createPrismaClient(logger, dbUrlOverwrite))
    .provideValue('cache', createCache())
    .provideValue('publicAssetsStorage', publicAssetsStorage)
    .provideValue('imageCacheDir', ensureImageCacheDir(logger))
    .provideClass('assetsProvider', AssetsProvider, Scope.Singleton)
    .provideClass('sessionLogic', SessionLogic, Scope.Singleton)
    .provideClass('userSession', UserSessionOnServer, Scope.Singleton)
    .provideClass('fileLogic', FileLogic, Scope.Singleton)
    .provideClass('imageCategoryLogic', ImageCategoryLogic, Scope.Singleton)
    .provideClass('imageLogic', ImageLogic, Scope.Singleton)
    .provideClass('imageBytesProvider', ImageBytesProvider, Scope.Singleton)
    .provideClass('mailTemplateLogic', MailTemplateLogic, Scope.Singleton)
    .provideClass('emailSender', EmailSender, Scope.Singleton)
    .provideClass('tokenLogic', TokenLogic, Scope.Singleton)
    .provideClass('serverI18n', ServerI18n, Scope.Singleton)
    .provideClass('userLogic', UserLogic, Scope.Singleton)
    .provideClass('geoLogic', GeoLogic, Scope.Singleton)
    .provideClass('airlineCompanyLogic', AirlineCompanyLogic, Scope.Singleton)
    .provideClass('airplaneLogic', AirplaneLogic, Scope.Singleton)
    .provideClass('citiesLogic', CitiesLogic, Scope.Singleton)
    .provideClass('airportLogic', AirportLogic, Scope.Singleton)
    .provideClass('flightsLogic', FlightsLogic, Scope.Singleton)
    .provideClass('staysLogic', StaysLogic, Scope.Singleton)
    .provideClass('companyReviewsLogic', CompanyReviewLogic, Scope.Singleton)
    .provideClass('entityCacheLogic', EntityCacheLogic, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getAssetsProvider: () => provider.resolve('assetsProvider'),
    getSessionLogic: () => provider.resolve('sessionLogic'),
    getUserSession: () => provider.resolve('userSession'),
    getUserLogic: () => provider.resolve('userLogic'),
    getImageLogic: () => provider.resolve('imageLogic'),
    getImageCategoryLogic: () => provider.resolve('imageCategoryLogic'),
    getImageBytesProvider: () => provider.resolve('imageBytesProvider'),
    getMailTemplateLogic: () => provider.resolve('mailTemplateLogic'),
    getEmailSender: () => provider.resolve('emailSender'),
    getTokenLogic: () => provider.resolve('tokenLogic'),
    getServerI18n: () => provider.resolve('serverI18n'),
    getGeoLogic: () => provider.resolve('geoLogic'),
    getAirplaneLogic: () => provider.resolve('airplaneLogic'),
    getAirportLogic: () => provider.resolve('airportLogic'),
    getFlightsLogic: () => provider.resolve('flightsLogic'),
    getStaysLogic: () => provider.resolve('staysLogic'),
    getAirlineCompanyLogic: () => provider.resolve('airlineCompanyLogic'),
    getCitiesLogic: () => provider.resolve('citiesLogic'),
    getEntityCacheLogic: () => provider.resolve('entityCacheLogic'),
    getCompanyReviewsLogic: () => provider.resolve('companyReviewsLogic')
  };
}

const initApp = once(async () => {
  const logger = new ServerLogger(); // container has not built yet
  try {
    logger.error(`APP STARTING... (${import.meta.env.MODE})`); // use error level to be sure it is logged no matter which logging level is in config
    (globalThis as any).CommonServicesLocator = (globalThis as any).ServerServicesLocator = await buildServiceLocator(logger);
    if (AppConfig.email) {
      await ServerServicesLocator.getEmailSender().verifySetup();
    } else if (process.env.PUBLISH) {
      logger.error('Emailing is not configured!');
    } else {
      logger.info('skipping email infrastructure check as it is disabled');
    }
    (globalThis as any).ServerServicesLocator.getServerI18n().initialize();
  } catch (e) {
    logger.error('app initialization failed', e);
    throw e;
  }
});

export default defineNuxtPlugin({
  async setup (/* nuxtApp */) {
    await initApp();
    await initializeSession(useRequestEvent()!);
  },
  hooks: {
    'app:created' () {
      const nuxtApp = useNuxtApp();
      installLoggingHooks(nuxtApp);
    }
  }
});

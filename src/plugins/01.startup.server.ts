import { existsSync, mkdirSync } from 'fs';
import { access } from 'fs/promises';
import { Scope, createInjector } from 'typed-inject';
import once from 'lodash-es/once';
import { createStorage, type Storage, type StorageValue } from 'unstorage';
import { resolve, join } from 'pathe';
import { UserLogic } from '../server-logic/user-logic';
import { ImageBytesProvider } from '../server-logic/image/image-bytes-provider';
import { ServerLogger } from '../server-logic/helpers/logging';
import type { IServerServicesLocator } from '../shared/serviceLocator';
import { type IAppLogger } from '../shared/applogger';
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
import { AppAssetsProvider } from '../server-logic/app-assets-provider';
import { AirlineCompanyLogic } from './../server-logic/airline-company-logic';
import { AirplaneLogic } from './../server-logic/airplane-logic';
import { createPrismaClient } from './../prisma/client';
import installLoggingHooks from './common/logging-hooks';
import { getOgImageFileName } from './../shared/common';
import { isQuickStartEnv } from './../shared/constants';
import { resolveParentDirectory } from './../shared/fs';
import { AllPagePaths, PagePath, OgImageDynamicPages, AvailableLocaleCodes, type Locale } from './../shared/constants';

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

async function getAppAssetsStorage (logger: IAppLogger): Promise<Storage<StorageValue>> {
  const result = (globalThis as any).$appDataStorage as Storage<StorageValue>;
  if (!result) {
    logger.error('app assets storage is not available');
    throw new Error('app assets storage is not available');
  }

  if (!(await result.getItem('world-map.json'))) {
    logger.error('app assets storage is miconfigured');
    throw new Error('app assets storage is miconfigured');
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

  const appAssetsStorage = await getAppAssetsStorage(logger);

  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ServerLogger, Scope.Singleton)
    .provideValue('dbRepository', createPrismaClient(logger, dbUrlOverwrite))
    .provideValue('cache', createCache())
    .provideValue('appAssetsStorage', appAssetsStorage)
    .provideValue('imageCacheDir', ensureImageCacheDir(logger))
    .provideClass('appAssetsProvider', AppAssetsProvider, Scope.Singleton)
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
    getAssetsProvider: () => provider.resolve('appAssetsProvider'),
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

async function checkOgImageConfiguration (logger: IAppLogger): Promise<void> {
  if (!process.env.PUBLISH) {
    logger.verbose('skipping OG images check for non-publish environment');
    return;
  }

  if (!AppConfig.ogImage.enabled) {
    logger.error('OG image is disabled!');
    throw new Error('OG image is disabled!');
  }

  logger.verbose('starting OG images check');
  const publicAssetsDir = await resolveParentDirectory('.', 'public');
  if (!publicAssetsDir) {
    logger.error('OG image check failed - cannot locate public directory!');
    throw new Error('OG image check failed - cannot locate public directory!');
  }

  const ogImageDir = join(publicAssetsDir, 'img', 'og');
  const imgPages: PagePath[] = AllPagePaths.filter(p => !OgImageDynamicPages.includes(p as PagePath));
  for (let i = 0; i < imgPages.length; i++) {
    for (let j = 0; j < AvailableLocaleCodes.length; j++) {
      const imgPath = join(ogImageDir, getOgImageFileName(imgPages[i], AvailableLocaleCodes[j] as Locale));
      try {
        await access(imgPath);
      } catch (err: any) {
        logger.error(`og image was not found, page=${imgPath}`);
        throw new Error('OG image check failed');
      }
    }
  }

  logger.info('OG images check completed');
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
      throw new Error('Emailing is not configured!');
    } else {
      logger.info('skipping email infrastructure check as it is disabled');
    }
    (globalThis as any).ServerServicesLocator.getServerI18n().initialize();
    await checkOgImageConfiguration(logger);
  } catch (e) {
    logger.error('app initialization failed', e);
    throw e;
  }
});

export default defineNuxtPlugin({
  name: 'startup-server',
  parallel: false,
  async setup (/* nuxtApp */) {
    await initApp();
  },
  hooks: {
    'app:created' () {
      const nuxtApp = useNuxtApp();
      installLoggingHooks(nuxtApp);
    }
  }
});

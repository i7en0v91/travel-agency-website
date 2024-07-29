import once from 'lodash-es/once';
import { lookupValueOrThrow } from '../shared/common';
import { CmsType } from '../shared/constants';
import { type IAppLogger } from '../shared/applogger';
import { type IServerServicesLocator } from '../shared/serviceLocator';
import { ServerLogger } from './../server/backend/helpers/logging';
import { Scope, createInjector } from 'typed-inject';
import { UserLogic } from '../server/backend/services/user-logic';
import { ImageBytesProvider } from '../server/backend/common-services/image-bytes-provider';
import { HtmlPageCacheCleaner } from '../server/backend/common-services/html-page-cache-cleaner';
import { ChangeDependencyTracker } from '../server/backend/common-services/change-dependency-tracker';
import { EntityChangeNotificationTask } from '../server/backend/common-services/entity-change-notification-task';
import { HtmlPageModelMetadata } from '../server/backend/common-services/html-page-model-metadata';
import { ImageLogic } from '../server/backend/services/image-logic';
import { AuthFormImageLogic } from '../server/backend/services/auth-form-image-logic';
import { FileLogic } from '../server/backend/services/file-logic';
import { EmailSender } from '../server/backend/services/email-sender';
import { TokenLogic } from '../server/backend/services/token-logic';
import { ServerI18n } from '../server/backend/helpers/i18n';
import { CitiesLogic } from '../server/backend/services/cities-logic';
import { FlightsLogic } from '../server/backend/services/flights-logic';
import { StaysLogic } from '../server/backend/services/stays-logic';
import { BookingLogic } from '../server/backend/services/booking-logic';
import { CompanyReviewLogic } from '../server/backend/services/company-review-logic';
import { EntityCacheLogic } from '../server/backend/services/entity-cache-logic';
import { ImageCategoryLogic } from '../server/backend/services/image-category-logic';
import { MailTemplateLogic } from '../server/backend/services/mail-template-logic';
import { GeoLogic } from '../server/backend/services/geo-logic';
import { AirportLogic } from '../server/backend/services/airport-logic';
import { AppAssetsProvider } from '../server/backend/common-services/app-assets-provider';
import { AirlineCompanyLogic } from '../server/backend/services/airline-company-logic';
import { AirplaneLogic } from '../server/backend/services/airplane-logic';
import { DocumentCreator } from '../server/backend/common-services/document-creator';
import { createPrismaClient } from '../server/backend/prisma/client';
import { createCache, getPdfFontsAssetsStorage, getAppAssetsStorage, getNitroCache } from '../server/backend/helpers/nitro';
import { ensureImageCacheDir } from '../server/backend/helpers/fs';
import { PrismaFlightOfferMaterializer, PrismaStayOfferMaterializer } from '../server/backend/helpers/offer-materializers';

const PluginName = 'backend-prisma';

export async function buildBackendServicesLocator(logger: IAppLogger): Promise<IServerServicesLocator> {
  const nitroCache = await getNitroCache(logger);
  const appAssetsStorage = await getAppAssetsStorage(logger);
  const pdfFontsAssetsStorage = await getPdfFontsAssetsStorage(logger);

  const prismaClient = await createPrismaClient(logger);
  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ServerLogger, Scope.Singleton)
    .provideValue('dbRepository', prismaClient)
    .provideValue('cache', createCache())
    .provideValue('nitroCache', nitroCache)
    .provideValue('appAssetsStorage', appAssetsStorage)
    .provideValue('pdfFontsAssetsStorage', pdfFontsAssetsStorage)
    .provideValue('imageCacheDir', ensureImageCacheDir(logger))
    .provideClass('appAssetsProvider', AppAssetsProvider, Scope.Singleton)
    .provideClass('htmlPageModelMetadata', HtmlPageModelMetadata, Scope.Singleton)
    .provideClass('changeDependencyTracker', ChangeDependencyTracker, Scope.Singleton)
    .provideClass('entityChangeNotifications', EntityChangeNotificationTask, Scope.Singleton)
    .provideClass('htmlPageCacheCleaner', HtmlPageCacheCleaner, Scope.Singleton)
    .provideClass('fileLogic', FileLogic, Scope.Singleton)
    .provideClass('imageCategoryLogic', ImageCategoryLogic, Scope.Singleton)
    .provideClass('imageLogic', ImageLogic, Scope.Singleton)
    .provideClass('authFormImageLogic', AuthFormImageLogic, Scope.Singleton)
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
    .provideClass('flightOfferMaterializer', PrismaFlightOfferMaterializer, Scope.Singleton)
    .provideClass('flightsLogic', FlightsLogic, Scope.Singleton)
    .provideClass('stayOfferMaterializer', PrismaStayOfferMaterializer, Scope.Singleton)
    .provideClass('staysLogic', StaysLogic, Scope.Singleton)
    .provideClass('bookingLogic', BookingLogic, Scope.Singleton)
    .provideClass('documentCreator', DocumentCreator, Scope.Singleton)
    .provideClass('companyReviewsLogic', CompanyReviewLogic, Scope.Singleton)
    .provideClass('entityCacheLogic', EntityCacheLogic, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getAssetsProvider: () => provider.resolve('appAssetsProvider'),
    getHtmlPageCacheCleaner: () => provider.resolve('htmlPageCacheCleaner'),
    getPageModelMetadata: () => provider.resolve('htmlPageModelMetadata'),
    getChangeDependencyTracker: () => provider.resolve('changeDependencyTracker'),
    getEntityChangeNotifications: () => provider.resolve('entityChangeNotifications'),
    getUserLogic: () => provider.resolve('userLogic'),
    getImageLogic: () => provider.resolve('imageLogic'),
    getAuthFormImageLogic: () => provider.resolve('authFormImageLogic'),
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
    getCompanyReviewsLogic: () => provider.resolve('companyReviewsLogic'),
    getBookingLogic: () => provider.resolve('bookingLogic'),
    getDocumentCreator: () => provider.resolve('documentCreator')
  };
}

const initApp = once(async () => {
  const logger = new ServerLogger(); // container has not built yet
  try {
    if(process.env.CMS) {
      const cmsType = lookupValueOrThrow(CmsType, process.env.CMS) as CmsType;
      if(cmsType === CmsType.acsys) {
        return; // container has been registered by CMS plugin
      }
    }
    
    logger.info(`initializing [${PluginName}] plugin (${import.meta.env.MODE})`);

    (globalThis as any).CommonServicesLocator = (globalThis as any).ServerServicesLocator = await buildBackendServicesLocator(logger);

    logger.info(`[${PluginName}] plugin initialized (${import.meta.env.MODE})`);
  } catch (e) {
    logger.error(`[${PluginName}] plugin initialization failed`, e);
    throw e;
  }
});

export default defineNuxtPlugin(
  {
    parallel: false,
    enforce: 'pre',
    async setup () {
      await initApp();
    },
  });
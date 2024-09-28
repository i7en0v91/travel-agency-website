import { AppException, AppExceptionCodeEnum, CmsType, DefaultTheme, DefaultLocale, type IImageData, type IAcsysOptions, lookupParentDirectory, lookupValueOrThrow, type IImageCategoryInfo, type IAppLogger, type EntityId, TokenKind, EmailTemplateEnum, ImageCategory, type PreviewMode, AppConfig } from '@golobe-demo/shared';
import { isSqlite } from './helpers/db';
import { access } from 'fs/promises';
import { ServerLogger } from './common-services/logging';
import { DataSeedingLogic } from './services/data-seeding-logic';
import { AppAssetsProvider } from './common-services/app-assets-provider';
import { ChangeDependencyTracker } from './common-services/change-dependency-tracker';
import { EntityChangeNotificationTask } from './common-services/entity-change-notification-task';
import { HtmlPageModelMetadata } from './common-services/html-page-model-metadata';
import { FileLogic as FileLogicAcsys } from './acsys/file-logic';
import { ImageCategoryLogic as ImageCategoryLogicWrapper } from './acsys/image-category-logic';
import { ImageLogic as ImageLogicWrapper } from './acsys/image-logic';
import { AuthFormImageLogic as AuthFormImageLogicWrapper } from './acsys/auth-form-image-logic';
import { ImageBytesProvider, ensureImageCacheDir } from './common-services/image-bytes-provider';
import { HtmlPageCacheCleaner } from './common-services/html-page-cache-cleaner';
import { MailTemplateLogic as MailTemplateLogicWrapper } from './acsys/mail-template-logic';
import { EmailSender as EmailSenderWrapper } from './acsys/email-sender';
import { TokenLogic as TokenLogicWrapper } from './acsys/token-logic';
import { ServerI18n } from './common-services/i18n';
import { UserLogic as UserLogicWrapper } from './acsys/user-logic';
import { GeoLogic as GeoLogicWrapper } from './acsys/geo-logic';
import { AirlineCompanyLogic as AirlineCompanyLogicWrapper } from './acsys/airline-company-logic';
import { AirplaneLogic as AirplaneLogicWrapper } from './acsys/airplane-logic';
import { CitiesLogic as CitiesLogicWrapper } from './acsys/cities-logic';
import { AirportLogic as AirportLogicWrapper } from './acsys/airport-logic';
import { FlightsLogic as FlightsLogicWrapper } from './acsys/flights-logic';
import { StaysLogic as StaysLogicWrapper } from './acsys/stays-logic';
import { BookingLogic as BookingLogicWrapper } from './acsys/booking-logic';
import { DocumentCreator } from './common-services/document-creator';
import { CompanyReviewLogic as CompanyReviewLogicWrapper } from './acsys/company-review-logic';
import { EntityCacheLogic as EntityCacheLogicWrapper } from './acsys/entity-cache-logic';
import { Scope, createInjector } from 'typed-inject';
import { createCache, getPdfFontsAssetsStorage, getAppAssetsStorage, getNitroCache } from './helpers/nitro';
import { AcsysClientProvider } from './acsys/client/acsys-client-provider';
import { ViewsConfig, type IViewColumnSettings } from './acsys/client/views';
import { type UserData, UserRoleEnum, type IAcsysClientAdministrator, type IAcsysClientBase } from './acsys/client/interfaces';
import toPairs from 'lodash-es/toPairs';
import { resolve } from 'pathe';
import { createPrismaClient } from './prisma/client';
import { UserLogic } from './services/user-logic';
import { FileLogic } from './services/file-logic';
import { ImageLogic } from './services/image-logic';
import { AuthFormImageLogic } from './services/auth-form-image-logic';
import { EmailSender } from './services/email-sender';
import { TokenLogic } from './services/token-logic';
import { CitiesLogic } from './services/cities-logic';
import { FlightsLogic } from './services/flights-logic';
import { StaysLogic } from './services/stays-logic';
import { BookingLogic } from './services/booking-logic';
import { CompanyReviewLogic } from './services/company-review-logic';
import { EntityCacheLogic } from './services/entity-cache-logic';
import { ImageCategoryLogic } from './services/image-category-logic';
import { MailTemplateLogic } from './services/mail-template-logic';
import { GeoLogic } from './services/geo-logic';
import { AirportLogic } from './services/airport-logic';
import { AirlineCompanyLogic } from './services/airline-company-logic';
import { AirplaneLogic } from './services/airplane-logic';
import { AcsysDraftEntitiesResolver } from './acsys/acsys-draft-entities-resolver';
import cloneDeep from 'lodash-es/cloneDeep';
import random from 'lodash-es/random';
import { murmurHash } from 'ohash';
import sharp from 'sharp';
import { PrismaFlightOfferMaterializer, PrismaStayOfferMaterializer } from './common-services/offer-materializers';
import { AcsysFlightOfferMaterializer, AcsysStayOfferMaterializer } from './acsys/offer-materializers';
import orderBy from 'lodash-es/orderBy';
import { type IInitializableOnStartup, type RegisterUserByEmailResponse, type IServerServicesLocator, type IAcsysServerServicesLocator } from './types';
import dayjs from 'dayjs';
import dayjsPluginUtc from 'dayjs/plugin/utc.js';

async function buildAcsysBackendServicesLocator(acsysModuleOptions: IAcsysOptions, srcDir: string, logger: IAppLogger): Promise<IAcsysServerServicesLocator> {
  const nitroCache = await getNitroCache(logger);
  const appAssetsStorage = await getAppAssetsStorage(logger);
  const pdfFontsAssetsStorage = await getPdfFontsAssetsStorage(logger);

  const injector = createInjector();
  const provider = injector
    .provideClass('logger', ServerLogger, Scope.Singleton)
    .provideValue('dbRepository', await createPrismaClient(logger))
    .provideValue('cache', createCache())
    .provideValue('nitroCache', nitroCache)
    .provideValue('appAssetsStorage', appAssetsStorage)
    .provideValue('pdfFontsAssetsStorage', pdfFontsAssetsStorage)
    .provideValue('imageCacheDir', await ensureImageCacheDir(logger))
    .provideClass('appAssetsProvider', AppAssetsProvider, Scope.Singleton)
    .provideClass('htmlPageModelMetadata', HtmlPageModelMetadata, Scope.Singleton)
    .provideClass('changeDependencyTracker', ChangeDependencyTracker, Scope.Singleton)
    .provideClass('entityChangeNotifications', EntityChangeNotificationTask, Scope.Singleton)
    .provideClass('htmlPageCacheCleaner', HtmlPageCacheCleaner, Scope.Singleton)
    .provideValue('acsysModuleOptions', acsysModuleOptions)
    .provideClass('acsysClientProvider', AcsysClientProvider, Scope.Singleton)
    .provideClass('fileLogicPrisma', FileLogic, Scope.Singleton)
    .provideClass('fileLogic', FileLogicAcsys, Scope.Singleton)
    .provideClass('acsysDraftsEntitiesResolver', AcsysDraftEntitiesResolver, Scope.Singleton)
    .provideClass('imageCategoryLogicPrisma', ImageCategoryLogic, Scope.Singleton)
    .provideClass('imageCategoryLogic', ImageCategoryLogicWrapper, Scope.Singleton)
    .provideClass('imageLogicPrisma', ImageLogic, Scope.Singleton)
    .provideClass('imageLogic', ImageLogicWrapper, Scope.Singleton)
    .provideClass('authFormImageLogicPrisma', AuthFormImageLogic, Scope.Singleton)
    .provideClass('authFormImageLogic', AuthFormImageLogicWrapper, Scope.Singleton)
    .provideClass('imageBytesProvider', ImageBytesProvider, Scope.Singleton)
    .provideClass('mailTemplateLogicPrisma', MailTemplateLogic, Scope.Singleton)
    .provideClass('mailTemplateLogic', MailTemplateLogicWrapper, Scope.Singleton)
    .provideClass('emailSenderPrisma', EmailSender, Scope.Singleton)
    .provideClass('emailSender', EmailSenderWrapper, Scope.Singleton)
    .provideClass('tokenLogicPrisma', TokenLogic, Scope.Singleton)
    .provideClass('tokenLogic', TokenLogicWrapper, Scope.Singleton)
    .provideClass('serverI18n', ServerI18n, Scope.Singleton)
    .provideClass('userLogicPrisma', UserLogic, Scope.Singleton)
    .provideClass('userLogic', UserLogicWrapper, Scope.Singleton)
    .provideClass('geoLogicPrisma', GeoLogic, Scope.Singleton)
    .provideClass('geoLogic', GeoLogicWrapper, Scope.Singleton)
    .provideClass('airlineCompanyLogicPrisma', AirlineCompanyLogic, Scope.Singleton)
    .provideClass('airlineCompanyLogic', AirlineCompanyLogicWrapper, Scope.Singleton)
    .provideClass('airplaneLogicPrisma', AirplaneLogic, Scope.Singleton)
    .provideClass('airplaneLogic', AirplaneLogicWrapper, Scope.Singleton)
    .provideClass('citiesLogicPrisma', CitiesLogic, Scope.Singleton)
    .provideClass('citiesLogic', CitiesLogicWrapper, Scope.Singleton)
    .provideClass('airportLogicPrisma', AirportLogic, Scope.Singleton)
    .provideClass('airportLogic', AirportLogicWrapper, Scope.Singleton)
    .provideClass('flightOfferMaterializerPrisma', PrismaFlightOfferMaterializer, Scope.Singleton)
    .provideClass('flightOfferMaterializer', AcsysFlightOfferMaterializer, Scope.Singleton)
    .provideClass('flightsLogicPrisma', FlightsLogic, Scope.Singleton)
    .provideClass('flightsLogic', FlightsLogicWrapper, Scope.Singleton)
    .provideClass('stayOfferMaterializerPrisma', PrismaStayOfferMaterializer, Scope.Singleton)
    .provideClass('stayOfferMaterializer', AcsysStayOfferMaterializer, Scope.Singleton)
    .provideClass('staysLogicPrisma', StaysLogic, Scope.Singleton)
    .provideClass('staysLogic', StaysLogicWrapper, Scope.Singleton)
    .provideClass('bookingLogicPrisma', BookingLogic, Scope.Singleton)
    .provideClass('bookingLogic', BookingLogicWrapper, Scope.Singleton)
    .provideClass('documentCreator', DocumentCreator, Scope.Singleton)
    .provideClass('companyReviewsLogicPrisma', CompanyReviewLogic, Scope.Singleton)
    .provideClass('companyReviewsLogic', CompanyReviewLogicWrapper, Scope.Singleton)
    .provideClass('entityCacheLogicPrisma', EntityCacheLogic, Scope.Singleton)
    .provideClass('entityCacheLogic', EntityCacheLogicWrapper, Scope.Singleton)
    .provideClass('dataSeedingLogic', DataSeedingLogic, Scope.Singleton);

  return {
    getLogger: () => provider.resolve('logger'),
    getAssetsProvider: () => provider.resolve('appAssetsProvider'),
    getHtmlPageCacheCleaner: () => provider.resolve('htmlPageCacheCleaner'),
    getPageModelMetadata: () => provider.resolve('htmlPageModelMetadata'),
    getChangeDependencyTracker: () => provider.resolve('changeDependencyTracker'),
    getEntityChangeNotifications: () => provider.resolve('entityChangeNotifications'),
    getAcsysClientProvider: () => provider.resolve('acsysClientProvider'),
    getUserLogic: () => provider.resolve('userLogic'),
    getImageLogic: () => provider.resolve('imageLogic'),
    getImageCategoryLogic: () => provider.resolve('imageCategoryLogic'),
    getAuthFormImageLogic: () => provider.resolve('authFormImageLogic'),
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
    getDocumentCreator: () => provider.resolve('documentCreator'),
    getDataSeedingLogic: () => provider.resolve('dataSeedingLogic')
  };
}

async function buildPrismaBackendServicesLocator(logger: IAppLogger): Promise<IServerServicesLocator> {
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
    .provideValue('imageCacheDir', await ensureImageCacheDir(logger))
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
    .provideClass('entityCacheLogic', EntityCacheLogic, Scope.Singleton)
    .provideClass('dataSeedingLogic', DataSeedingLogic, Scope.Singleton);

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
    getDocumentCreator: () => provider.resolve('documentCreator'),
    getDataSeedingLogic: () => provider.resolve('dataSeedingLogic')
  };
}

/**
 * Constructs new collection of backend service instances. 
 * Concrete implementation depends on whether {@link process.env.CMS} is configured or not
 * @param logger Temp logger until services container is constructed
 * @returns New services locator instance either initialized or in initializing state
 */
export async function buildBackendServicesLocator(logger: IAppLogger): Promise<IServerServicesLocator> {
  let result: IServerServicesLocator | undefined;

  dayjs.extend(dayjsPluginUtc);

  if(!process.env.CMS) {
    logger.verbose('building prisma services locator container');
    result = await buildPrismaBackendServicesLocator(logger);
  } else {
    const srcDir = await lookupParentDirectory(resolve('./'), 'src', async (path: string) => { await access(path); return true; });
    if(!srcDir) {
      logger.error(`failed to resolve src dir`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to resolve src dir', 'error-page');
    }
  
    const cmsType = lookupValueOrThrow(CmsType, process.env.CMS) as CmsType;
    if(cmsType === CmsType.acsys) {
      logger.verbose('building Acsys services locator container');
      const acsysServerServicesLocator = await buildAcsysBackendServicesLocator(AppConfig.acsys, srcDir, logger);
      logger.verbose('ensuring Acsys system objects');
      await ensureAcsysSystemObjects(acsysServerServicesLocator, AppConfig.acsys, logger);
      result = acsysServerServicesLocator;
    }
  }

  if(!result) {
    const errMsg = `unexpected CMS type: ${process.env.CMS}`;
    logger.error(errMsg);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, errMsg, 'error-page');
  }

  logger.verbose('starting initializable services');
  const initializables: IInitializableOnStartup[] = [
    result.getEmailSender(),  
    result.getServerI18n(),
    result.getEntityChangeNotifications(),
    result.getHtmlPageCacheCleaner(),
    result.getImageCategoryLogic(),
    result.getImageBytesProvider(),
    result.getAirlineCompanyLogic(),
    result.getAirplaneLogic()
  ];
  for(let i = 0; i < initializables.length; i++) {
    await initializables[i].initialize();
  }

  logger.verbose('services container was built');
  return result;
}

/** Acsys */
const LoggingPrefix = 'AcsysServerServicesLocator';
const ViewSampleDataPreviewMode: PreviewMode = false;

const SampleStr = 'AcsysSampleData';
const SampleLocalizeableStr = { en: SampleStr, fr: SampleStr, ru: SampleStr };
const SampleUserEmail = 'acsysSampleData@sample.sample';
const SampleImageSlug = 'sample-image';
const SampleImageCategory = ImageCategory.SampleData;
const SampleImageCategorySize = { width: 100, height: 100 };
const SampleCitySlugs = ['acsys-sample-city1-data', 'acsys-sample-city2-data'];
declare type SampleDataIds = {
  userId: EntityId | undefined,
  imageId: EntityId | undefined,
  authFormImageId: EntityId | undefined,
  countryId: EntityId | undefined,
  cityIds: EntityId[] | undefined,
  popularCityId: EntityId | undefined,
  airportIds: EntityId[] | undefined,
  airplaneId: EntityId | undefined,
  airlineCompanyId: EntityId | undefined,
  companyReviewId: EntityId | undefined,
  stayId: EntityId | undefined,
  bookingId: EntityId | undefined,
  mailTemplateId: EntityId | undefined,
  tokenId: EntityId | undefined
};

async function deleteViewSampleData(sampleDataIds: SampleDataIds, serviceLocator: IServerServicesLocator, logger: IAppLogger): Promise<void> {
  logger.verbose(`(${LoggingPrefix}) deleting view sample data`);
  
  if(sampleDataIds.tokenId) {
    logger.debug(`(${LoggingPrefix}) deleting sample verification token, id=${sampleDataIds.tokenId}`);
    const tokenLogic = serviceLocator.getTokenLogic();
    await tokenLogic.deleteToken(sampleDataIds.tokenId);
  }
  
  if(sampleDataIds.mailTemplateId) {
    logger.debug(`(${LoggingPrefix}) deleting sample mail template, id=${sampleDataIds.mailTemplateId}`);
    const mailTemplateLogic = serviceLocator.getMailTemplateLogic();
    await mailTemplateLogic.deleteTemplate(sampleDataIds.mailTemplateId);
  }

  if(sampleDataIds.bookingId) {
    logger.debug(`(${LoggingPrefix}) deleting sample booking, id=${sampleDataIds.bookingId}`);
    const bookingLogic = serviceLocator.getBookingLogic();
    await bookingLogic.deleteBooking(sampleDataIds.bookingId);
  }

  if(sampleDataIds.userId) {
    const stayLogic = serviceLocator.getStaysLogic();
    const stayOffers = (await stayLogic.searchOffers({ citySlug: SampleCitySlugs[0], }, sampleDataIds.userId, { direction: 'asc' }, { skip: 0, take: 1000 }, false, ViewSampleDataPreviewMode)).pagedItems;
    logger.debug(`(${LoggingPrefix}) deleting sample stay offers, count=${stayOffers.length}`);
    for(let i = 0; i < stayOffers.length; i++) {
      await stayLogic.deleteStayOffer(stayOffers[i].id);
    }
  }

  if(sampleDataIds.stayId) {
    logger.debug(`(${LoggingPrefix}) deleting sample stay, id=${sampleDataIds.stayId}`);
    const stayLogic = serviceLocator.getStaysLogic();
    await stayLogic.deleteStay(sampleDataIds.stayId);
  }

  if(sampleDataIds.userId) {
    const flightsLogic = serviceLocator.getFlightsLogic();
    const flightOffers = (await flightsLogic.searchOffers({ }, sampleDataIds.userId, { direction: 'asc' }, { direction: 'asc' }, { skip: 0, take: 1000 }, false, false, ViewSampleDataPreviewMode)).pagedItems;
    logger.debug(`(${LoggingPrefix}) deleting sample flight offers, count=${flightOffers.length}`);
    for(let i = 0; i < flightOffers.length; i++) {
      await flightsLogic.deleteFlightOffer(flightOffers[i].id);
      await flightsLogic.deleteFlight(flightOffers[i].departFlight.id);
      if(flightOffers[i].arriveFlight?.id) {
        await flightsLogic.deleteFlight(flightOffers[i].arriveFlight!.id);
      }
    }
  }

  if(sampleDataIds.airplaneId) {
    logger.debug(`(${LoggingPrefix}) deleting sample airplane, id=${sampleDataIds.airplaneId}`);
    const airplaneLogic = serviceLocator.getAirplaneLogic();
    await airplaneLogic.deleteAirplane(sampleDataIds.airplaneId);
  }

  if(sampleDataIds.airportIds) {
    const airportIds = sampleDataIds.airportIds;
    logger.debug(`(${LoggingPrefix}) deleting sample airports, count=${airportIds.length}`);
    const airportLogic = serviceLocator.getAirportLogic();
    for(let i = 0; i < airportIds.length; i++) {
      await airportLogic.deleteAirport(airportIds[i]);
    }
  }

  if(sampleDataIds.airlineCompanyId) {
    logger.debug(`(${LoggingPrefix}) deleting sample airline company, id=${sampleDataIds.airlineCompanyId}`);
    const airlineCompanyLogic = serviceLocator.getAirlineCompanyLogic();
    await airlineCompanyLogic.deleteCompany(sampleDataIds.airlineCompanyId);
  }

  if(sampleDataIds.companyReviewId) {
    logger.debug(`(${LoggingPrefix}) deleting sample company review data`);
    const companyReviewLogic = serviceLocator.getCompanyReviewsLogic();
    await companyReviewLogic.deleteReview(sampleDataIds.companyReviewId);
  }

  if(sampleDataIds.cityIds) {
    const cityIds = sampleDataIds.cityIds;
    logger.debug(`(${LoggingPrefix}) deleting sample cities, count=${cityIds.length}`);
    const cityLogic = serviceLocator.getCitiesLogic();
    for(let i = 0; i < cityIds.length; i++) {
      await cityLogic.deleteCity(cityIds[i]);
    }
  }

  if(sampleDataIds.countryId) {
    logger.debug(`(${LoggingPrefix}) deleting sample country, id=${sampleDataIds.countryId}`);
    const geoLogic = serviceLocator.getGeoLogic();
    await geoLogic.deleteCountry(sampleDataIds.countryId);
  }

  if(sampleDataIds.userId) {
    logger.debug(`(${LoggingPrefix}) deleting sample user, id=${sampleDataIds.userId}`);
    const userLogic = serviceLocator.getUserLogic();
    await userLogic.deleteUser(sampleDataIds.userId);
  }

  if(sampleDataIds.imageId) {
    logger.debug(`(${LoggingPrefix}) deleting sample image, id=${sampleDataIds.userId}`);
    const imageLogic = serviceLocator.getImageLogic();
    const imageBytesProvider = serviceLocator.getImageBytesProvider();
    await imageBytesProvider.clearImageCache(sampleDataIds.imageId, SampleImageCategory);
    await imageBytesProvider.clearImageCache(SampleImageSlug, SampleImageCategory);
    await imageLogic.deleteImage(sampleDataIds.imageId);
  }

  if(sampleDataIds.authFormImageId) {
    logger.debug(`(${LoggingPrefix}) deleting sample auth form image, id=${sampleDataIds.authFormImageId}`);
    const authFormImageLogic = serviceLocator.getAuthFormImageLogic();
    await authFormImageLogic.deleteImage(sampleDataIds.authFormImageId);
  }

  logger.verbose(`(${LoggingPrefix}) view sample data deleted`);
}

/**
 * At least one record in source collection is required for view initialization (Acsys v1.0.1)
 */
async function ensureViewSampleData(serviceLocator: IServerServicesLocator, logger: IAppLogger): Promise<SampleDataIds | 'already-exist'> {
  logger.verbose(`(${LoggingPrefix}) ensuring view sample data`);

  const sampleIds: SampleDataIds = {
    companyReviewId: undefined,
    cityIds: undefined,
    popularCityId: undefined,
    airlineCompanyId: undefined,
    countryId: undefined,
    imageId: undefined,
    authFormImageId: undefined,
    userId: undefined,
    airportIds: undefined,
    bookingId: undefined,
    stayId: undefined,
    airplaneId: undefined,
    mailTemplateId: undefined,
    tokenId: undefined
  };

  const imageCategoryLogic = serviceLocator.getImageCategoryLogic();
  let imageCategory: IImageCategoryInfo | undefined;
  logger.lowerWarnsWithoutErrorLevel(true);
  try {
    imageCategory = await imageCategoryLogic.findCategory(SampleImageCategory);
  } finally {
    logger.lowerWarnsWithoutErrorLevel(false);
  }
  if (imageCategory) {
    logger.verbose(`(${LoggingPrefix}) view sample data ensured - already exist`);
    return 'already-exist';
  }

  logger.debug(`(${LoggingPrefix}) creating sample image category`);
  await imageCategoryLogic.createCategory(ImageCategory.SampleData, SampleImageCategorySize.width, SampleImageCategorySize.height);
  
  logger.debug(`(${LoggingPrefix}) creating sample image data`);
  const imageLogic = serviceLocator.getImageLogic();
  const bytes = await sharp({ 
    create: { 
      width: SampleImageCategorySize.width, 
      height: SampleImageCategorySize.height, 
      channels: 3, 
      background: 'white' 
    } 
  }).png().toBuffer();
  const sampleImageData: IImageData = {
    bytes,
    category: SampleImageCategory,
    invertForDarkTheme: false,
    mimeType: 'image/png',
    slug: SampleImageSlug,
    originalName: 'acsys-sample-data-image',
    stubCssStyle: undefined
  };
  sampleIds.imageId = (await imageLogic.createImage(sampleImageData, undefined, ViewSampleDataPreviewMode)).id;

  logger.debug(`(${LoggingPrefix}) creating sample auth form image data`);
  const authFormImageLogic = serviceLocator.getAuthFormImageLogic();
  sampleIds.authFormImageId = await authFormImageLogic.createImage(sampleIds.imageId, 999, ViewSampleDataPreviewMode);
 
  logger.debug(`(${LoggingPrefix}) creating user sample data`);
  const userLogic = serviceLocator.getUserLogic();
  const password = `s@mPl3sPwd${murmurHash(`${random(2 ^ 30, false)}${random(2 ^ 30, false)}`)}`;
  const registerUserResult = await userLogic.registerUserByEmail(SampleUserEmail, password, 'verified', SampleStr, SampleStr, DefaultTheme, DefaultLocale) as RegisterUserByEmailResponse;
  switch(registerUserResult) {
    case 'already-exists':
    case 'insecure-password':
      logger.warn(`(${LoggingPrefix}) failed to register sample user, rseult=${registerUserResult}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to register user', 'error-page');
  }
  sampleIds.userId = registerUserResult;

  logger.debug(`(${LoggingPrefix}) creating sample geo data`);
  const geoLogic = serviceLocator.getGeoLogic();
  sampleIds.countryId = await geoLogic.createCountry({ name: SampleLocalizeableStr });
  sampleIds.cityIds = [
    await geoLogic.createCity({ 
      countryId: sampleIds.countryId, 
      geo: { 
        lat: 0.0, 
        lon: 0.0 
      }, 
      name: SampleLocalizeableStr, 
      population: 100000, 
      slug: SampleCitySlugs[0], 
      utcOffsetMin: 0 
    }, ViewSampleDataPreviewMode),
    await geoLogic.createCity({ 
      countryId: sampleIds.countryId, 
      geo: { 
        lat: 1.0, 
        lon: 1.0 
      }, 
      name: SampleLocalizeableStr, 
      population: 100000, 
      slug: SampleCitySlugs[1], 
      utcOffsetMin: 0 
    }, ViewSampleDataPreviewMode)
  ];

  logger.debug(`(${LoggingPrefix}) creating sample popular city data`);
  const cityLogic = serviceLocator.getCitiesLogic();
  sampleIds.popularCityId = sampleIds.cityIds[1];
  await cityLogic.makeCityPopular({ 
    cityId: sampleIds.popularCityId, 
    promoLineStr: SampleLocalizeableStr, 
    rating: 5, 
    travelHeaderStr: SampleLocalizeableStr, 
    travelTextStr: SampleLocalizeableStr, 
    visibleOnWorldMap: false, 
    geo: { lat: 0.0, lon: 0.0 } 
  }, ViewSampleDataPreviewMode);
  await cityLogic.setPopularCityImages(
    sampleIds.popularCityId, [
      { 
        id: sampleIds.imageId, 
        order: 0 
      }], ViewSampleDataPreviewMode);

  logger.debug(`(${LoggingPrefix}) creating sample company review data`);
  const companyReviewLogic = serviceLocator.getCompanyReviewsLogic();
  sampleIds.companyReviewId = await companyReviewLogic.createReview({ 
    imageId: sampleIds.imageId, 
    body: SampleLocalizeableStr,
    header: SampleLocalizeableStr,
    userName: SampleLocalizeableStr
  }, ViewSampleDataPreviewMode);
  
  logger.debug(`(${LoggingPrefix}) creating sample airline company data`);
  const airlineCompanyLogic = serviceLocator.getAirlineCompanyLogic();
  sampleIds.airlineCompanyId = await airlineCompanyLogic.createAirlineCompany({ 
    cityId: sampleIds.cityIds[0], 
    logoImageId: sampleIds.imageId, 
    name: SampleLocalizeableStr, 
    reviewSummary: {
      numReviews: 0, 
      score: 0
    },
    city: {
      geo: { 
        lat: 0.0, 
        lon: 0.0 
      }
    } 
  }, ViewSampleDataPreviewMode);

  logger.debug(`(${LoggingPrefix}) creating sample airports data`);
  const airportLogic = serviceLocator.getAirportLogic();
  sampleIds.airportIds = [
    await airportLogic.createAirport({ 
      cityId: sampleIds.cityIds[0], 
      geo: { 
        lat: 0.0, 
        lon: 0.0 
      }, 
      name: SampleLocalizeableStr 
    }, ViewSampleDataPreviewMode),
    await airportLogic.createAirport({ 
      cityId: sampleIds.cityIds[1], 
      geo: { 
        lat: 1.0, 
        lon: 1.0 
      }, 
      name: SampleLocalizeableStr 
    }, ViewSampleDataPreviewMode)
  ];
  
  logger.debug(`(${LoggingPrefix}) creating sample airplane data`);
  const airplaneLogic = serviceLocator.getAirplaneLogic();
  sampleIds.airplaneId = await airplaneLogic.createAirplane({ 
    name: SampleLocalizeableStr, 
    images: [{
      imageId: sampleIds.imageId,
      kind: 'business',
      order: 0
    }]
  }, ViewSampleDataPreviewMode);

  logger.debug(`(${LoggingPrefix}) creating sample flight offers data`);
  const flightsLogic = serviceLocator.getFlightsLogic();
  const flightOffers = await flightsLogic.searchOffers({ }, sampleIds.userId, { direction: 'asc' }, { direction: 'asc' }, { skip: 0, take: 1 }, false, false, ViewSampleDataPreviewMode);
  if(flightOffers.pagedItems.length === 0) {
    logger.warn(`(${LoggingPrefix}) failed to create flight offers, rseult=${registerUserResult}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to create flight offers', 'error-page');
  }
  const flightOffer = flightOffers.pagedItems[0];
  await flightsLogic.toggleFavourite(flightOffer.id, sampleIds.userId);

  logger.debug(`(${LoggingPrefix}) creating sample stay data`);
  const stayLogic = serviceLocator.getStaysLogic();
  sampleIds.stayId = await stayLogic.createStay({ 
    cityId: sampleIds.cityIds[0], 
    descriptionData: [{ 
        order: 0, 
        paragraphKind: 'Title', 
        textStr: SampleLocalizeableStr 
      }], 
      geo: { 
        lon: 0.0, 
        lat: 0.0 
      }, 
      imagesData: [{ 
        imageId: sampleIds.imageId, 
        order: 0, 
        serviceLevel: undefined
      }], 
      name: SampleLocalizeableStr, 
      reviewsData: [{ 
        score: 1, 
        text: SampleLocalizeableStr, 
        userId: sampleIds.userId 
      }], 
      slug: 'acsys-sample-stay-data-slug' 
    }, ViewSampleDataPreviewMode);
  
  logger.debug(`(${LoggingPrefix}) creating sample stay offers data`);
  const stayOffers = await stayLogic.searchOffers({ citySlug: SampleCitySlugs[0], }, sampleIds.userId, { direction: 'asc' }, { skip: 0, take: 1 }, false, ViewSampleDataPreviewMode);
  if(stayOffers.pagedItems.length === 0) {
    logger.warn(`(${LoggingPrefix}) failed to create stay offers, rseult=${registerUserResult}`);
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to create stay offers', 'error-page');
  }
  const stayOffer = stayOffers.pagedItems[0];
  await stayLogic.toggleFavourite(stayOffer.id, sampleIds.userId);

  logger.debug(`(${LoggingPrefix}) creating sample booking data`);
  const bookingLogic = serviceLocator.getBookingLogic();
  sampleIds.bookingId = await bookingLogic.createBooking({ 
    bookedUserId: sampleIds.userId, 
    kind: 'flights', 
    offerId: flightOffer.id, 
    serviceLevel: undefined 
  });

  logger.debug(`(${LoggingPrefix}) creating sample mail template data`);
  const mailTemplateLogic = serviceLocator.getMailTemplateLogic();
  sampleIds.mailTemplateId = await mailTemplateLogic.createTemplate(EmailTemplateEnum.EmailVerify, SampleLocalizeableStr, ViewSampleDataPreviewMode);

  logger.debug(`(${LoggingPrefix}) creating sample verification token data`);
  const tokenLogic = serviceLocator.getTokenLogic();
  sampleIds.tokenId = (await tokenLogic.issueToken(TokenKind.EmailVerify, sampleIds.userId, false)).id;

  logger.verbose(`(${LoggingPrefix}) view sample data ensured`);
  return sampleIds;
}

async function ensureViews(acsysClient: IAcsysClientAdministrator, serviceLocator: IServerServicesLocator, logger: IAppLogger): Promise<void> {
  logger.info(`(${LoggingPrefix}) ensuring views`);

  const ensureViewResult = await ensureViewSampleData(serviceLocator, logger);
  if(ensureViewResult === 'already-exist') {
    logger.info(`(${LoggingPrefix}) views ensured - already exist`);
    return;
  }

  const viewsConfig = orderBy(Array.from(ViewsConfig.entries()), v => v[0].valueOf(), 'asc');
  for(let i = 0; i < viewsConfig.length; i++) {
    const sourceCollection = viewsConfig[i][0];
    const viewConfig = viewsConfig[i][1];
    logger.debug(`(${LoggingPrefix}) checking view exists, sourceCollection=${sourceCollection.valueOf()}`);
    const viewInfo = await acsysClient.findViewInfo(sourceCollection);
    if(viewInfo) {
      logger.debug(`(${LoggingPrefix}) view already exists, sourceCollection=${sourceCollection.valueOf()}, viewId=${viewInfo.id}`);
      continue;
    }
    logger.verbose(`(${LoggingPrefix}) creating view, sourceCollection=${sourceCollection.valueOf()}, name=${viewConfig.displayProps.name}`);

    // fill display order
    const columnSettings: Omit<IViewColumnSettings, 'id'>[] = [];
    let maxOrder = Math.max(...(viewConfig.columnSettings.filter(c => c.displayOrder !== undefined).map(c => c.displayOrder!)));
    for(let i = 0; i < viewConfig.columnSettings.length; i++) {
      const settings = cloneDeep(viewConfig.columnSettings[i]);
      if(settings.displayOrder === undefined) {
        settings.displayOrder = ++maxOrder;
      }
      columnSettings.push(settings as Omit<IViewColumnSettings, 'id'>);
    }

    const viewId = await acsysClient.createView(sourceCollection, viewConfig.displayProps.name, viewConfig.displayProps.description);
    await acsysClient.setViewDisplayProps(viewId, viewConfig.displayProps);
    await acsysClient.setViewColumnSettings(viewId, sourceCollection, columnSettings);
    
    logger.verbose(`(${LoggingPrefix}) view created, sourceCollection=${sourceCollection.valueOf()}, name=${viewConfig.displayProps.name}, viewId=${viewId}`);
  }
  await deleteViewSampleData(ensureViewResult, serviceLocator, logger);

  logger.info(`(${LoggingPrefix}) views ensured`);
}

async function ensureNonAdminUsers(acsysClient: IAcsysClientAdministrator, moduleOptions: IAcsysOptions, logger: IAppLogger): Promise<void> {
  logger.info(`(${LoggingPrefix}) ensuring non-admin users`);

  const nonAdminUsers = toPairs(moduleOptions.users).filter(x => x[0] !== 'admin');
  const usersData = [] as UserData[];
  for(let i = 0; i < nonAdminUsers.length; i++) {
    const userInfo = nonAdminUsers[i][1];
    const userType = nonAdminUsers[i][0] as keyof IAcsysOptions['users'];
    let role: UserRoleEnum;
    switch(userType) {
      case 'admin':
        role = UserRoleEnum.Administrator;
        break;
      case 'standard':
        role = UserRoleEnum.Standard;
        break;
      case 'viewer':
        role = UserRoleEnum.Viewer;
        break;
      default: 
        logger.error(`(${LoggingPrefix}) unexpected user type in module config: ${userType}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'invalid user type in acsys configuration', 'error-page');
    }
    usersData.push({
      email: userInfo.email,
      mode: role,
      role: role,
      password: userInfo.password,
      username: userInfo.name
    });
  }

  for(let i = 0; i < usersData.length; i++) {
    await acsysClient.createUser(usersData[i]);
  }

  logger.info(`(${LoggingPrefix}) non-admin users ensured, count=${usersData.length}`);
}

async function isConnected(acsysClient: IAcsysClientBase): Promise<boolean> {
  return await acsysClient.isConnected();
}

async function sendInitialLocalDatabaseConfig(acsysClient: IAcsysClientBase, moduleOptions: IAcsysOptions, logger: IAppLogger): Promise<boolean> {
  logger.debug(`(${LoggingPrefix}) sending initial local database config`);
  const result = await acsysClient.sendInitialLocalDatabaseConfig(moduleOptions.projectName);
  logger.debug(`(${LoggingPrefix}) initial local database config sent, result=${result}`);
  return result;
}

async function hasAdmin(acsysClient: IAcsysClientBase, logger: IAppLogger): Promise<boolean> {
  logger.debug(`(${LoggingPrefix}) has admin check`);
  const result = await acsysClient.hasAdmin();
  logger.debug(`(${LoggingPrefix}) has admin check completed, result=${result}`);
  return result;
}

async function sendRegisterAdminRequest(acsysClient: IAcsysClientBase, adminUser: UserData, logger: IAppLogger): Promise<boolean> {
  logger.debug(`(${LoggingPrefix}) sending register admin request, username=${adminUser.username}`);
  const result = await acsysClient.register(adminUser);
  logger.debug(`(${LoggingPrefix}) register admin request completed, result=${result}`);
  return result;
}

async function ensureAdminUser(acsysClient: IAcsysClientBase, moduleOptions: IAcsysOptions, logger: IAppLogger): Promise<void> {
  logger.verbose(`(${LoggingPrefix}) ensuring admin user`);
  let connected = await isConnected(acsysClient);
  if(!connected) {
    logger.verbose(`(${LoggingPrefix}) not connected, performing inital configuration`);
    if(isSqlite()) {
      const initialized = await sendInitialLocalDatabaseConfig(acsysClient, moduleOptions, logger);
      if(!initialized) {
        logger.error(`(${LoggingPrefix}) failed to send initial local database config request`);
        throw new Error('inital configuration failed');  
      }
    } else {
      logger.error(`(${LoggingPrefix}) setting inital config for non-SQLite db has not been implmented yet`);
      throw new Error('inital configuration for non-SQLite not implmeneted');
    }

    connected = await isConnected(acsysClient);
    if(!connected) {
      logger.error(`(${LoggingPrefix}) not connected event after inital config`);
      throw new Error('not connected');
    }
  }

  const usersInitialized = await hasAdmin(acsysClient, logger);
  if(!usersInitialized) {
    const adminUsers = toPairs(moduleOptions.users).filter(x => x[0] === 'admin');
    logger.info(`(${LoggingPrefix}) creating admin users, count=${adminUsers.length}`);
    const userData = [] as UserData[];
    for(let i = 0; i < adminUsers.length; i++) {
      const userInfo = adminUsers[i][1];
      const userType = adminUsers[i][0] as keyof IAcsysOptions['users'];
      let role: UserRoleEnum;
      switch(userType) {
        case 'admin':
          role = UserRoleEnum.Administrator;
          break;
        case 'standard':
          role = UserRoleEnum.Standard;
          break;
        case 'viewer':
          role = UserRoleEnum.Viewer;
          break;
        default: 
          logger.error(`(${LoggingPrefix}) unexpected user type in module config: ${userType}`);
          throw new Error('unexpected user type');
      }
      userData.push({
        email: userInfo.email,
        mode: role,
        role,
        password: userInfo.password,
        username: userInfo.name
      });
    }

    if(userData.length === 0) {
      logger.error(`(${LoggingPrefix}) cannot obtain admin user data from module configuration`);
      throw new Error('admin user data missed');
    }

    const data = userData[0]; // only 1 admin user is possible
    const result = await sendRegisterAdminRequest(acsysClient, data, logger);
    if(!result) {
      logger.error(`(${LoggingPrefix}) failed to register admin user: ${data.username}`);
      throw new Error('failed to register admin user');
    }
  }
}

async function ensureAcsysSystemObjects(serviceLocator: IAcsysServerServicesLocator, moduleOptions: IAcsysOptions, logger: IAppLogger): Promise<void> {
  const acsysClientProvider = serviceLocator.getAcsysClientProvider();
  const adminClient = acsysClientProvider.getClient(UserRoleEnum.Administrator);
  await ensureAdminUser(adminClient, moduleOptions, logger);
  await ensureNonAdminUsers(adminClient, moduleOptions, logger);
  acsysClientProvider.onClientUsersReady();
  await ensureViews(adminClient, serviceLocator, logger);
}
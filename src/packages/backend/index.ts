import { type IAppLogger } from '@golobe-demo/shared';
import { ServerLogger } from './common-services/logging';
import { type IHtmlPageModelMetadata } from './types';
import { HtmlPageModelMetadata } from './common-services/html-page-model-metadata';

export { buildBackendServicesLocator } from './service-locators';
export function createLogger(): IAppLogger {
  return new ServerLogger();
}

export function createHtmlPageModelMetadata(): IHtmlPageModelMetadata {
  return new HtmlPageModelMetadata(createLogger());
}

export type { 
  IInitializableOnStartup,
  IServerServicesLocator, 
  IAppAssetsProvider,
  IHtmlPageCacheCleaner,
  IUserLogic,
  IImageBytesProvider,
  IImageLogic,
  IImageCategoryLogic,
  IAuthFormImageLogic,
  IEmailSender,
  IMailTemplateLogic,
  ITokenLogic,
  IEntityCacheLogic,
  IGeoLogic,
  IAirplaneLogic,
  IAirportLogic,
  IFlightsLogic,
  IStaysLogic,
  IAirlineCompanyLogic,
  ICitiesLogic,
  ICompanyReviewsLogic,
  IBookingLogic,
  IServerI18n,
  IDocumentCreator,
  IHtmlPageModelMetadata,
  IChangeDependencyTracker,
  IEntityChangeNotificationTask,
  IDataSeedingLogic
} from './types';
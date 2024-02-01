import { type IServerI18n } from '../server-logic/helpers/i18n';
import { type IAppLogger } from './applogger';
import { type IAirportLogic, type IMailTemplateLogic, type ISessionLogic, type IUserSession, type IUserSessionClient, type IUserSessionServer, type IUserLogic, type IImageBytesProvider, type IImageLogic, type IImageCategoryLogic, type IEmailSender, type ITokenLogic, type ICitiesLogic, type ICompanyReviewsLogic, type IEntityCache, type IEntityCacheLogic, type IGeoLogic } from './interfaces';

export interface ICommonServicesLocator {
  getLogger() : IAppLogger,
  /**
   * For internal use only. Call {@link useUserSession} composable instead
   */
  getUserSession(): IUserSession
}

export interface IServerServicesLocator extends ICommonServicesLocator {
  getSessionLogic(): ISessionLogic,
  getUserLogic(): IUserLogic,
  getImageBytesProvider(): IImageBytesProvider,
  getImageLogic(): IImageLogic,
  getImageCategoryLogic(): IImageCategoryLogic,
  /**
   * For internal use only. Call {@link useUserSession} composable instead
   */
  getUserSession(): IUserSessionServer,
  getEmailSender(): IEmailSender,
  getMailTemplateLogic(): IMailTemplateLogic,
  getTokenLogic(): ITokenLogic,
  getServerI18n(): IServerI18n,
  getEntityCacheLogic(): IEntityCacheLogic,
  getGeoLogic(): IGeoLogic,
  getAirportLogic(): IAirportLogic,
  getCitiesLogic(): ICitiesLogic,
  getCompanyReviewsLogic(): ICompanyReviewsLogic
}

export interface IClientServicesLocator extends ICommonServicesLocator {
  appMounted: boolean,
  /**
   * For internal use only. Call {@link useUserSession} composable instead
   */
  getUserSession(): IUserSessionClient,
  getEntityCache(): IEntityCache
}

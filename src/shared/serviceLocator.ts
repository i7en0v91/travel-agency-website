import { type IServerI18n } from '../server-logic/helpers/i18n';
import { type IAppLogger } from './applogger';
import { type IAirplaneLogic, type IAirportLogic, type IStaysLogic, type IFlightsLogic, type IAirlineCompanyLogic, type IMailTemplateLogic, type IUserLogic, type IImageBytesProvider, type IImageLogic, type IImageCategoryLogic, type IEmailSender, type ITokenLogic, type ICitiesLogic, type ICompanyReviewsLogic, type IEntityCache, type IEntityCacheLogic, type IGeoLogic, type IAppAssetsProvider } from './interfaces';

export interface ICommonServicesLocator {
  getLogger() : IAppLogger,
}

export interface IServerServicesLocator extends ICommonServicesLocator {
  getAssetsProvider(): IAppAssetsProvider,
  getUserLogic(): IUserLogic,
  getImageBytesProvider(): IImageBytesProvider,
  getImageLogic(): IImageLogic,
  getImageCategoryLogic(): IImageCategoryLogic,
  getEmailSender(): IEmailSender,
  getMailTemplateLogic(): IMailTemplateLogic,
  getTokenLogic(): ITokenLogic,
  getServerI18n(): IServerI18n,
  getEntityCacheLogic(): IEntityCacheLogic,
  getGeoLogic(): IGeoLogic,
  getAirplaneLogic(): IAirplaneLogic,
  getAirportLogic(): IAirportLogic,
  getFlightsLogic(): IFlightsLogic,
  getStaysLogic(): IStaysLogic,
  getAirlineCompanyLogic(): IAirlineCompanyLogic,
  getCitiesLogic(): ICitiesLogic,
  getCompanyReviewsLogic(): ICompanyReviewsLogic
}

export interface IClientServicesLocator extends ICommonServicesLocator {
  appMounted: boolean,
  getEntityCache(): IEntityCache
}

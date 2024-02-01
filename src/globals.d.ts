import type { IClientServicesLocator, ICommonServicesLocator, IServerServicesLocator } from './shared/serviceLocator';

declare global {
  let ClientServicesLocator: IClientServicesLocator;
  let ServerServicesLocator : IServerServicesLocator;
  let CommonServicesLocator: ICommonServicesLocator;
}
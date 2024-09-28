import type { IServerServicesLocator } from "./../types";
import type { ICommonServicesLocator } from "@golobe-demo/shared";

export function getCommonServices(): ICommonServicesLocator {
  return (globalThis as any).CommonServicesLocator as ICommonServicesLocator;
}

export function getServerServices(): IServerServicesLocator {
  return (globalThis as any).ServerServicesLocator as IServerServicesLocator;
}
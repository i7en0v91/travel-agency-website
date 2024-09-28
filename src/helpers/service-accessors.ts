import type { IServerServicesLocator } from "@golobe-demo/backend";
import type { ICommonServicesLocator } from "@golobe-demo/shared";
import type { IClientServicesLocator } from "../types";

export function getCommonServices(): ICommonServicesLocator {
  return (globalThis as any).CommonServicesLocator as ICommonServicesLocator;
}

export function getClientServices(): IClientServicesLocator {
  return (globalThis as any).ClientServicesLocator as IClientServicesLocator;
}

export function getServerServices(): IServerServicesLocator | undefined {
  return (globalThis as any).ServerServicesLocator as IServerServicesLocator | undefined;
}
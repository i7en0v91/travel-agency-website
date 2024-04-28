import keys from 'lodash-es/keys';
import { destr } from 'destr';
import type { NuxtApp } from '#app';
import type { IAppLogger } from './applogger';

function getLogger (): IAppLogger | undefined {
  return ((globalThis as any)?.CommonServicesLocator as any)?.getLogger() as IAppLogger;
}

export function addPayload<TPayload extends NonNullable<unknown> = NonNullable<unknown>> (nuxtApp: NuxtApp, key: string, payload: TPayload | null) {
  const logger = getLogger();
  if (import.meta.client) {
    logger?.warn(`adding payload is not possible on client side, key=${key}`);
    return;
  }
  if (payload !== undefined) {
    logger?.debug(`adding payload, key=${key}`);
    nuxtApp.payload[key] = payload;
  } else {
    logger?.debug(`removing payload, key=${key}`);
    nuxtApp.payload[key] = undefined;
  }
}

export function getPayload<TPayload extends NonNullable<unknown> = any> (nuxtApp: NuxtApp, key: string): TPayload | null | undefined {
  const logger = getLogger();
  logger?.debug(`get payload, key=${key}`);
  if (!nuxtApp.payload) {
    logger?.verbose(`get payload - empty, payload is not initialized, key=${key}`);
    return undefined;
  }

  if (keys(nuxtApp.payload).includes(key)) {
    const result = (destr<TPayload>(nuxtApp.payload[key])) ?? null;
    logger?.debug(`get payload - key in payload, key=${key}, result=${!!result}`);
    return result;
  } else if (nuxtApp.payload.data && keys(nuxtApp.payload.data).includes(key)) {
    const result = (destr<TPayload>(nuxtApp.payload.data[key])) ?? null;
    logger?.debug(`get payload - key in payload.data, key=${key}, result=${!!result}`);
    return result;
  }

  logger?.debug(`get payload - not present, key=${key}`);
  return undefined;
}

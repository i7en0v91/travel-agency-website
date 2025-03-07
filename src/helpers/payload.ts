import keys from 'lodash-es/keys';
import { destr } from 'destr';
import type { NuxtPayload } from 'nuxt/app';
import { getCommonServices } from './service-accessors';


export function addPayload<TPayload extends NonNullable<unknown> = NonNullable<unknown>> (nuxtPayload: NuxtPayload, key: string, payload: TPayload | null) {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'Payload' });
  if (import.meta.client) {
    logger.warn('adding payload is not possible on client side', undefined, key);
    return;
  }
  if (payload !== undefined) {
    logger.debug('adding', key);
    nuxtPayload[key] = payload;
  } else {
    logger.debug('removing', key);
    nuxtPayload[key] = undefined;
  }
}

export function getPayload<TPayload extends NonNullable<unknown> = any> (nuxtPayload: NuxtPayload, key: string): TPayload | null | undefined {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'Payload' });
  logger.debug('get', key);
  if (!nuxtPayload) {
    logger.verbose('get - empty, payload is not initialized', key);
    return undefined;
  }

  if (keys(nuxtPayload).includes(key)) {
    const result = (destr<TPayload>(nuxtPayload[key])) ?? null;
    logger.debug('get - key in payload', { key, result: !!result });
    return result;
  } else if (nuxtPayload.data && keys(nuxtPayload.data).includes(key)) {
    const result = (destr<TPayload>(nuxtPayload.data[key])) ?? null;
    logger.debug('get - key in payload.data', { key, result: !!result });
    return result;
  }

  logger.debug('get - not present', key);
  return undefined;
}

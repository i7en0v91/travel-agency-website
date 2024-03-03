import isString from 'lodash-es/isString';
import { type HTTPMethod } from 'h3';
import { FetchError } from 'ofetch';
import { destr } from 'destr';
import { AppException, AppExceptionCodeEnum, defaultErrorHandler } from '../shared/exceptions';
import { type IApiErrorDto } from '../server/dto';

/**
 * all exceptions from fetch responses are converted into {@link AppException} retaining all
 * of it's properties sent from server in response dto (e.g. code, appearance, msg e.t.c)
 * Modes:
 * default - default application handler will be used (e.g. showing user notifications, navigating to error page e.t.c). It is the default behavior
 * throw - {@link AppException} will be thrown
 */
export type FetchErrorHandlingMode = 'default' | 'throw';

async function doFetch<TReq, TResp> (method: HTTPMethod, route: string, query?: any, body?: TReq, cache?: RequestCache, errorHandling?: FetchErrorHandlingMode) {
  const logger = CommonServicesLocator.getLogger();
  errorHandling ??= 'default';

  let headers: HeadersInit | undefined;
  const isText = body && isString(body);
  const isArr = body && body instanceof Uint8Array;
  if (body) {
    headers = {
      'Content-Type': isArr ? 'application/octet-stream' : (isText ? 'text/plain' : 'application/json')
    };
  }

  try {
    logger.verbose(`(api-client) sending ${method}: route=${route}, query=${JSON.stringify(query)}, cache=${cache}`);
    const response = await $fetch<TResp>(route,
      {
        method,
        cache,
        body: body ? ((isArr || isText) ? body : JSON.stringify(body)) : undefined,
        query,
        headers,
        parseResponse: destr
      });
    logger.verbose(`(api-client) ${method} completed: route=${route}, query=${JSON.stringify(query)}, cache=${cache}`);
    return response;
  } catch (err: any) {
    logger.warn(`(api-client) failed to send ${method}: route=${route}, query=${JSON.stringify(query)}, cache=${cache}`, err);
    await handleFetchError(err, errorHandling);
  }
}

function handleFetchError (err: any, errorHandling: FetchErrorHandlingMode) {
  let appException: AppException;

  if (err instanceof FetchError) {
    const fetchError = err as FetchError;
    const errorDto = destr<IApiErrorDto>(fetchError.data);
    // simple check that reponse is a well-known error (AppException)
    if (errorDto?.code >= AppExceptionCodeEnum.UNKNOWN) {
      appException = new AppException(
        errorDto.code,
        errorDto.internalMsg,
        errorDto.appearance,
        errorDto.params);
    } else {
      appException = new AppException(
        AppExceptionCodeEnum.UNKNOWN,
        'recevied error response from api client',
        'error-stub');
    }
  } else if (AppException.isAppException(err)) {
    appException = err as AppException;
  } else {
    appException = new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'recevied unexpected error response from api client',
      'error-stub');
  }

  if (errorHandling === 'default') {
    defaultErrorHandler(appException);
  } else {
    throw appException;
  }
}

export async function post<TReq, TResp> (route: string, query?: any, body?: TReq, errorHandling?: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch('POST', route, query, body, 'no-cache', errorHandling);
}

export async function del (route: string, query?: any, errorHandling?: FetchErrorHandlingMode) {
  return await doFetch('DELETE', route, query, null, 'no-cache', errorHandling);
}

export async function get<TResp> (route: string, query?: any, cache?: RequestCache, errorHandling?: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch('GET', route, query, null, cache, errorHandling);
}

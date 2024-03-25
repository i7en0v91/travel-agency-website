import isString from 'lodash-es/isString';
import { splitCookiesString } from 'h3';
import { FetchError } from 'ofetch';
import { destr } from 'destr';
import flatten from 'lodash-es/flatten';
import isArray from 'lodash-es/isArray';
import { AppException, AppExceptionCodeEnum, defaultErrorHandler } from './exceptions';
import { type IApiErrorDto } from './../server/dto';
import type { IAppLogger } from './../shared/applogger';
import { HeaderNames, CookieNames } from './../shared/constants';

/**
 * all exceptions from fetch responses are converted into {@link AppException} retaining all
 * of it's properties sent from server in response dto (e.g. code, appearance, msg e.t.c)
 * Modes:
 * default - default application handler will be used (e.g. showing user notifications, navigating to error page e.t.c). It is the default behavior
 * throw - {@link AppException} will be thrown
 */
export type FetchErrorHandlingMode = 'default' | 'throw';

type HTTPMethod = 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE';

function getCurrentAuthCookies (logger: IAppLogger): string[] | null {
  logger.debug('(api-client) get current auth cookies');

  const authCookieNames = [CookieNames.AuthCallbackUrl, CookieNames.AuthCsrfToken, CookieNames.AuthSessionToken];

  let inputCookies: string | undefined;
  let inputAuthCookies: string[] | undefined;

  let errReadFromRequest: any;
  let errReadViaHeaders: any;
  try {
    const requestEvent = useRequestEvent();
    if (requestEvent) {
      logger.debug('(api-client) reading cookies from request event');
      const allHeaders = requestEvent.node.req.headers;
      inputCookies = allHeaders[HeaderNames.Cookies];
    }
  } catch (err: any) {
    logger.debug(`(api-client) exception while reading cookies from request event, msg=${err?.message}`);
    errReadFromRequest = err;
  }

  if (inputCookies === undefined) {
    try {
      const requestHeaders = useRequestHeaders();
      if (requestHeaders) {
        logger.debug('(api-client) reading cookies via headers');
        inputCookies = requestHeaders[HeaderNames.Cookies];
      }
    } catch (err: any) {
      logger.debug(`(api-client) exception while reading cookies via headers, msg=${err?.message}`);
      errReadViaHeaders = err;
    }
  }

  if (inputCookies !== undefined && inputCookies.length > 0) {
    const allCookies = flatten(inputCookies.split(';').map(c => c.trim()));
    inputAuthCookies = allCookies.filter(c => authCookieNames.some(ac => c.trim().startsWith(ac)));
  } else if (errReadFromRequest && errReadViaHeaders) {
    logger.warn('(api-client) error while trying to get current auth cookies', errReadFromRequest);
    logger.warn('(api-client) error while trying to get current auth cookies', errReadViaHeaders);
    throw new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'cannot access request cookies',
      'error-page');
  }

  if ((inputAuthCookies?.length ?? 0) === 0) {
    logger.debug('(api-client) get current auth cookies, count=0');
    return null;
  }

  logger.debug(`(api-client) get current auth cookies, count=${inputAuthCookies!.length}`);
  return inputAuthCookies!;
}

async function doFetch<TReq, TResp> (method: HTTPMethod, route: string, query?: any, body?: TReq, cache?: RequestCache, addAuthCookies?: boolean, errorHandling?: FetchErrorHandlingMode) {
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
  if (addAuthCookies ?? false) {
    const authCookies = getCurrentAuthCookies(logger);
    if ((authCookies?.length ?? 0) > 0) {
      headers = {
        ...(headers ?? {}),
        cookie: authCookies!.join('; ')
      };
    }
  }

  try {
    logger.verbose(`(api-client) sending ${method}: route=${route}, query=${JSON.stringify(query)}, addAuthCookies=${addAuthCookies}, cache=${cache}`);
    const response = await $fetch<TResp>(route,
      {
        method,
        cache,
        body: body ? ((isArr || isText) ? body : JSON.stringify(body)) : undefined,
        query,
        headers,
        parseResponse: destr
      });
    logger.verbose(`(api-client) ${method} completed: route=${route}, query=${JSON.stringify(query)}, addAuthCookies=${addAuthCookies}, cache=${cache}`);
    return response;
  } catch (err: any) {
    logger.warn(`(api-client) failed to send ${method}: route=${route}, query=${JSON.stringify(query)}, addAuthCookies=${addAuthCookies}, cache=${cache}`, err);
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

export async function post<TReq, TResp> (route: string, query?: any, body?: TReq, addAuthCookies?: boolean, errorHandling?: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch('POST', route, query, body, 'no-cache', addAuthCookies ?? false, errorHandling);
}

export async function del (route: string, query?: any, addAuthCookies?: boolean, errorHandling?: FetchErrorHandlingMode) {
  return await doFetch('DELETE', route, query, null, 'no-cache', addAuthCookies ?? false, errorHandling);
}

export async function get<TResp> (route: string, query?: any, cache?: RequestCache, addAuthCookies?: boolean, errorHandling?: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch('GET', route, query, null, cache, addAuthCookies ?? false, errorHandling);
}

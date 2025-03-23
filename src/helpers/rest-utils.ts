import { type PreviewMode, PreviewModeParamEnabledValue, QueryPagePreviewModeParam, HeaderAppVersion, CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken, HeaderCookies, type IAppLogger, HostUrl, AppConfig, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import type { IApiErrorDto } from '../server/api-definitions';
import { type H3Event, getRequestHeader } from 'h3';
import isString from 'lodash-es/isString';
import { FetchError } from 'ofetch';
import { destr } from 'destr';
import flatten from 'lodash-es/flatten';
import fromPairs from 'lodash-es/fromPairs';
import set from 'lodash-es/set';
import { parseQuery } from 'ufo';
import { usePreviewState } from './../composables/preview-state';
import { getCommonServices } from './service-accessors';
import once from 'lodash-es/once';

/**
 * all exceptions from fetch responses are converted into {@link AppException} retaining all
 * of it's properties sent from server in response dto (e.g. code, appearance, msg e.t.c)
 * Modes:
 * default - default application handler will be used (e.g. showing user notifications, navigating to error page e.t.c). It is the default behavior
 * throw - {@link AppException} will be thrown
 */
export type FetchErrorHandlingMode = 'default' | 'throw';

type HTTPMethod = 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE';

const getLogger = once(() => getCommonServices().getLogger().addContextProps({ component: 'ApiClient' }));

function getCurrentAuthCookies (event: H3Event | undefined, logger?: IAppLogger): string[] | null {
  logger?.debug('get current auth cookies', { event: !!event });

  const authCookieNames = [CookieAuthCallbackUrl, CookieAuthCsrfToken, CookieAuthSessionToken];

  let inputCookies: string | undefined;
  let inputAuthCookies: string[] | undefined;

  if(event?.context?.authCookies) {
    inputAuthCookies = event?.context.authCookies;
    logger?.debug('returning current auth cookies for middleware', { count: inputAuthCookies!.length });
    return inputAuthCookies;
  }

  let errReadFromRequest: any;
  let errReadViaHeaders: any;
  try {
    logger?.debug('reading cookies from request event');
    inputCookies = event ? (getRequestHeader(event, HeaderCookies) ?? (event.node.req.headers.cookie)) : undefined;
    if(!inputCookies) {
      event = useRequestEvent();
      inputCookies = event ? (getRequestHeader(event, HeaderCookies) ?? (event.node.req.headers.cookie)) : undefined;
    }
   
  } catch (err: any) {
    logger?.debug('exception while reading cookies from request event', { msg: err?.message });
    errReadFromRequest = err;
  }

  if (inputCookies === undefined) {
    try {
      const requestHeaders = useRequestHeaders();
      if (requestHeaders) {
        logger?.debug('reading cookies via headers');
        inputCookies = requestHeaders[HeaderCookies];
      }
    } catch (err: any) {
      logger?.debug('exception while reading cookies via headers', { msg: err?.message });
      errReadViaHeaders = err;
    }
  }

  if (inputCookies !== undefined && inputCookies.length > 0) {
    const allCookies = flatten(inputCookies.split(';').map(c => c.trim()));
    inputAuthCookies = allCookies.filter(c => authCookieNames.some(ac => c.trim().startsWith(ac)));
  } else if (errReadFromRequest && errReadViaHeaders) {
    logger?.warn('exception while trying to get current auth cookies', errReadFromRequest);
    logger?.warn('exception while trying to get current auth cookies', errReadViaHeaders);
    throw new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'cannot access request cookies',
      'error-page');
  }

  if ((inputAuthCookies?.length ?? 0) === 0) {
    logger?.debug('get current auth cookies, empty');
    return null;
  }

  logger?.debug('get current auth cookies', { count: inputAuthCookies!.length });
  return inputAuthCookies!;
}

function getCurrentPreviewMode(event: H3Event | undefined, logger?: IAppLogger): PreviewMode {
  logger?.debug('get current auth preview mode', { event: !!event });

  let result: PreviewMode | undefined = undefined;
  if(event) {
    result = event.context.preview.mode;
  } 
  
  if(result === undefined) {
    try {
      const { enabled } = usePreviewState();
      result = enabled;
    } catch(err: any) {
      // probably nuxt instance access required
      console.warn(err);
    }
  }

  if(result === undefined && window) {
    if(window?.location?.search) {
      try {
        const urlQuery = parseQuery(window!.location.search);
        result = urlQuery && urlQuery[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue;
      } catch(err: any) {
        logger?.warn('failed to detect current preview mode state - url parse exception', err, { event: !!event });  
      }
    } else {
      result = false;
    }
  }

  if(result === undefined) {
    logger?.warn('failed to detect current preview mode state', undefined, { event: !!event });  
  }
  logger?.debug('get current auth preview mode', { previewMode: result, event: !!event });
  return result ?? false;
}

async function doFetch<TReq, TResp> (method: HTTPMethod, route: string, query: any,  body: TReq | undefined, headers: HeadersInit | undefined, cache: RequestCache, addAuthCookies: boolean, event: H3Event | undefined, errorHandling: FetchErrorHandlingMode, isByteResponse: boolean): Promise<TResp | undefined> {
  const logger = getLogger();
  errorHandling ??= 'default';

  let outgoingHeaders: HeadersInit = {
    Host: HostUrl,
    ...(fromPairs([[HeaderAppVersion, AppConfig.versioning.appVersion]])),
    ...(headers ?? {})
  };
  const isText = body && isString(body);
  const isArr = body && body instanceof Uint8Array;
  if (body) {
    outgoingHeaders = {
      ...outgoingHeaders,
      'Content-Type': isArr ? 'application/octet-stream' : (isText ? 'text/plain' : 'application/json')
    };
  }
  if (addAuthCookies && import.meta.server) {
    const authCookies = getCurrentAuthCookies(event, logger);
    if ((authCookies?.length ?? 0) > 0) {
      outgoingHeaders = {
        ...outgoingHeaders,
        cookie: authCookies!.join('; ')
      };
    }
  }

  if(getCurrentPreviewMode(event, logger)) {
    query = set(query ?? {}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue);
  }

  try {
    logger?.verbose('sending', { method, route, query, addAuthCookies, cache, event: !!event });
    const response = await $fetch(route,
      {
        method,
        cache,
        body: body ? ((isArr || isText) ? body : JSON.stringify(body)) : undefined,
        query,
        headers: outgoingHeaders,
        responseType: isByteResponse ? 'blob' : undefined,
        parseResponse: isByteResponse ? undefined : destr
      }) as TResp;
    logger?.verbose('completed', { method, route, query, addAuthCookies, cache });
    return response;
  } catch (err: any) {
    await handleFetchError(err, errorHandling, (appErr) => {
      logger?.warn('failed to send', appErr, { method, route, query, addAuthCookies, cache });
    });
  }
}

function handleFetchError (err: any, errorHandling: FetchErrorHandlingMode, logFn: (err: AppException) => void) {
  let appException: AppException;

  try {
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
  } catch (innerErr: any) {
    logFn(err);
    logFn(innerErr);
    return;
  }

  logFn(appException);
  if (errorHandling === 'default') {
    defaultErrorHandler(appException, {});
  } else {
    throw appException;
  }
}

export async function post<TReq, TResp> (route: string, query: any, body: TReq | undefined, headers: HeadersInit | undefined, addAuthCookies: boolean, event: H3Event | undefined, errorHandling: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch<TReq, TResp>('POST', route, query, body, headers, 'no-cache', addAuthCookies, event, errorHandling, false);
}

export async function del (route: string, query: any, addAuthCookies: boolean, errorHandling: FetchErrorHandlingMode) {
  return await doFetch('DELETE', route, query, null, undefined, 'no-cache', addAuthCookies, undefined, errorHandling, false);
}

export async function getObject<TResp> (route: string, query: any, cache: RequestCache, addAuthCookies: boolean, event: H3Event | undefined, errorHandling: FetchErrorHandlingMode) : Promise<TResp | undefined> {
  return await doFetch<null, TResp>('GET', route, query, null, undefined, cache, addAuthCookies, event, errorHandling, false);
}

export async function getBytes (route: string, query: any, headers: HeadersInit | undefined, cache: RequestCache, addAuthCookies: boolean, event: H3Event | undefined, errorHandling: FetchErrorHandlingMode) : Promise<Buffer | undefined> {
  const result = await doFetch<null, Blob>('GET', route, query, null, headers, cache, addAuthCookies, event, errorHandling, true);
  if (!result) {
    return undefined;
  }
  return Buffer.from((await (result as Blob).arrayBuffer()));
}
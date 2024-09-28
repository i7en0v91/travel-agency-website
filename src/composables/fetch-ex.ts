import { AppException, AppExceptionCodeEnum, type AppExceptionAppearance, AppConfig, type IAppLogger, HeaderAppVersion } from '@golobe-demo/shared';
import { defaultErrorHandler } from './../helpers/exceptions';
import type { FetchResponse, FetchContext } from 'ofetch';
import type { AvailableRouterMethod as _AvailableRouterMethod } from 'nitropack';
import { destr } from 'destr';
import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import { type IApiErrorDto } from '../server/api-definitions';

export type FetchExOptions = {
  defautAppExceptionAppearance: AppExceptionAppearance
};

function addHeader(headers: HeadersInit, name: string, value: string) {
  if (Array.isArray(headers)) {
    headers.push([name, value]);
  } else if (headers instanceof Headers) {
    headers.set(name, value);
  } else {
    headers[name] = value;
  }
}

function createAppException (errorDto: IApiErrorDto | undefined, defautAppExceptionAppearance: AppExceptionAppearance): AppException {
  let appException: AppException;

  if (errorDto) {
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
        'recevied error response to fetch request',
        defautAppExceptionAppearance);
    }
  } else {
    appException = new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'recevied unexpected error response to fetch request',
      defautAppExceptionAppearance);
  }

  return appException;
}

async function extractErrorDtoFromResponse (response: FetchResponse<any>, logger: IAppLogger) : Promise<IApiErrorDto | string | undefined> {
  const data = response._data;
  if (!data) {
    return undefined;
  }

  try {
    // simple check that reponse is a well-known error (AppException)
    if (isNumber((data as any)?.code) && (data as any).code >= AppExceptionCodeEnum.UNKNOWN) {
      return data as IApiErrorDto;
    } else if ((data as any)?.text) {
      return destr<IApiErrorDto>(await (data as Blob).text());
    } else if (isString(data)) {
      return data as string;
    } else {
      return JSON.stringify(data);
    }
  } catch (err: any) {
    logger.warn(`(fetch-ex) failed to obtain error response data, url=${response.url.toString()}`, err);
  }
}

export function createFetch(options: FetchExOptions, nuxtApp: ReturnType<typeof useNuxtApp>, logger: IAppLogger) {
  return $fetch.create({
    baseURL: nuxtApp.$nuxtSiteConfig.url!,
    onRequest(ctx: FetchContext) {
      const headers = ctx.options.headers ||= useRequestHeaders(['cookie']) || {};
      addHeader(headers, HeaderAppVersion, AppConfig.versioning.appVersion.toString());
    },
    onRequestError (ctx) {
      logger.warn(`(fetch-ex) fetch exception occured in fetch request, url=${ctx.request.toString()}`, ctx.error);
      const caughtAppException = createAppException(undefined, options.defautAppExceptionAppearance);
      ctx.error = caughtAppException;
      defaultErrorHandler(caughtAppException, nuxtApp);
    },
    async onResponseError (ctx) {
      const errorInfo = await extractErrorDtoFromResponse(ctx.response, logger);
      let caughtAppException: AppException | undefined;
      if (!errorInfo) {
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${ctx.request.toString()}, status=${ctx.response.status}, text=${ctx.response.statusText}`, ctx.error);
        caughtAppException = createAppException(undefined, options.defautAppExceptionAppearance!);
      } else if (isString(errorInfo)) {
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${ctx.request.toString()}, status=${ctx.response.status}, text=${ctx.response.statusText}, msg=${errorInfo}`, ctx.error);
        caughtAppException = createAppException(undefined, options.defautAppExceptionAppearance!);
      } else {
        const apiErrorDto = errorInfo as IApiErrorDto;
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${ctx.request.toString()}, status=${ctx.response.status} text=${ctx.response.statusText}`, ctx.error, apiErrorDto);
        caughtAppException = createAppException(apiErrorDto, options.defautAppExceptionAppearance!);
      }
      defaultErrorHandler(caughtAppException, nuxtApp);
    }
  });
}
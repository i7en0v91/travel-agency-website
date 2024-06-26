import type { FetchError, FetchResponse } from 'ofetch';
import type { NitroFetchRequest, AvailableRouterMethod as _AvailableRouterMethod } from 'nitropack';
import { destr } from 'destr';
import isString from 'lodash-es/isString';
import isNumber from 'lodash-es/isNumber';
import type { KeysOf, PickFrom, AsyncDataExecuteOptions } from '#app/composables/asyncData.js';
import type { UseFetchOptions } from '#app/composables';
import { type IApiErrorDto } from '../server/dto';
import { AppException, AppExceptionCodeEnum, type AppExceptionAppearance, defaultErrorHandler } from './exceptions';
import { HeaderAppVersion } from './../shared/constants';
import AppConfig from './../appconfig';

type AvailableRouterMethod<R extends NitroFetchRequest> = _AvailableRouterMethod<R> | Uppercase<_AvailableRouterMethod<R>>;

type _FetchResultT = ReturnType<typeof useFetch>;
type _FetchResultOpProps = Pick<_FetchResultT, 'pending' | 'status' | 'refresh'>;

export type SSRAwareFetchResult<TFetchResult> = {
  data: Ref<TFetchResult>,
  error: Ref<AppException | undefined>,
  query: Ref<any>,
  body: Ref<any>,
  execute: (opts?: AsyncDataExecuteOptions) => Promise<void>,
} & _FetchResultOpProps & {
  throwIfErrorOnSSR(): void
};

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

async function extractErrorInfoFromResponse (response: FetchResponse<any>) : Promise<IApiErrorDto | string | undefined> {
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
    CommonServicesLocator.getLogger().warn(`(fetch-ex) failed to obtain error response data, url=${response.url.toString()}`, err);
  }
}

async function useFetchExInner<TDto, DataT, DefaultT = null, Method extends AvailableRouterMethod<NitroFetchRequest> = AvailableRouterMethod<NitroFetchRequest>, PickKeys extends KeysOf<DataT> = KeysOf<DataT>> (request: Ref<NitroFetchRequest> | NitroFetchRequest | (() => NitroFetchRequest), defautAppExceptionAppearance: AppExceptionAppearance, opts?: UseFetchOptions<TDto, DataT, PickKeys, DefaultT, NitroFetchRequest, Method>, ignoreAbortedRequestErrors?: boolean): Promise<SSRAwareFetchResult<PickFrom<DataT, PickKeys> | DefaultT>> {
  const logger = CommonServicesLocator.getLogger();
  ignoreAbortedRequestErrors ??= false;

  const headers: HeadersInit = import.meta.server ? useRequestHeaders(['cookie']) : {};
  headers[HeaderAppVersion] = AppConfig.versioning.appVersion.toString();
  const caughtAppException = ref<AppException | undefined>();
  const innerFetchQuery = ref<any>(undefined);
  const innerFetchBody = ref<any>(undefined);
  const innerFetch = await useFetch<TDto, FetchError, NitroFetchRequest, Method, TDto, DataT, PickKeys, DefaultT>(request, {
    query: innerFetchQuery,
    body: innerFetchBody,
    headers,
    ...opts,
    onRequestError (ctx) {
      console.error(ctx.error);
      const isRequestAborted = ctx.error?.name === 'AbortError';
      if (isRequestAborted && ignoreAbortedRequestErrors) {
        logger.info(`(fetch-ex) abort request exception occured, configured behavior is to ignore it, url=${request.toString()}`);
        innerFetch.status.value = 'success';
        innerFetch.data.value = opts?.default ? unref(opts?.default()) : (null as any);
        return;
      }
      logger.warn(`(fetch-ex) fetch exception occured in fetch request, url=${request.toString()}`, ctx.error);
      caughtAppException.value = createAppException(undefined, defautAppExceptionAppearance!);
      if (caughtAppException.value) {
        triggerRef(caughtAppException);
        if (import.meta.client) {
          defaultErrorHandler(caughtAppException.value);
        }
      }
    },
    async onResponseError (ctx) {
      console.error(ctx.error);
      const errorInfo = await extractErrorInfoFromResponse(ctx.response);
      if (!errorInfo) {
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${request.toString()}, status=${ctx.response.status}, text=${ctx.response.statusText}`);
        caughtAppException.value = createAppException(undefined, defautAppExceptionAppearance!);
      } else if (isString(errorInfo)) {
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${request.toString()}, status=${ctx.response.status}, text=${ctx.response.statusText}, msg=${errorInfo}`);
        caughtAppException.value = createAppException(undefined, defautAppExceptionAppearance!);
      } else {
        const apiErrorDto = errorInfo as IApiErrorDto;
        logger.warn(`(fetch-ex) fetch exception occured in fetch response, url=${request.toString()}, status=${ctx.response.status} text=${ctx.response.statusText}`, apiErrorDto);
        caughtAppException.value = createAppException(apiErrorDto, defautAppExceptionAppearance!);
      }
      if (caughtAppException.value) {
        triggerRef(caughtAppException);
        if (import.meta.client) {
          defaultErrorHandler(caughtAppException.value);
        }
      }
    }
  });

  const fetchState: SSRAwareFetchResult<PickFrom<DataT, PickKeys> | DefaultT> =
  {
    data: innerFetch.data,
    error: caughtAppException,
    pending: innerFetch.pending,
    refresh: innerFetch.refresh,
    execute: innerFetch.execute,
    status: innerFetch.status,
    query: innerFetchQuery,
    body: innerFetchBody,
    throwIfErrorOnSSR: () => {
      if (import.meta.server && caughtAppException.value) {
        defaultErrorHandler(caughtAppException.value);
      }
    }
  };

  return fetchState;
};

export function useFetchEx<TDto, DataT, DefaultT = null, Method extends AvailableRouterMethod<NitroFetchRequest> = AvailableRouterMethod<NitroFetchRequest>, PickKeys extends KeysOf<DataT> = KeysOf<DataT>> (request: Ref<NitroFetchRequest> | NitroFetchRequest | (() => NitroFetchRequest), defautAppExceptionAppearance: AppExceptionAppearance, opts?: UseFetchOptions<TDto, DataT, PickKeys, DefaultT, NitroFetchRequest, Method>, ignoreAbortedRequestErrors?: boolean): Promise<SSRAwareFetchResult<PickFrom<DataT, PickKeys> | DefaultT>> {
  const doCall = useFetchExInner<TDto, DataT, DefaultT, Method, PickKeys>(request, defautAppExceptionAppearance, opts, ignoreAbortedRequestErrors);
  return doCall.then((result) => {
    result.throwIfErrorOnSSR();
    return result;
  });
}

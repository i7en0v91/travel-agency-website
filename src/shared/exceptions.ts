import { type NuxtError } from 'nuxt/app';
import isObject from 'lodash-es/isObject';
import { type I18nResName, getI18nResName2 } from './i18n';
import { UserNotificationLevel } from './constants';
import { consola } from 'consola';

export enum AppExceptionCodeEnum {
  UNKNOWN = 12000,
  BAD_REQUEST = 12001,
  OBJECT_NOT_FOUND = 12003,
  UNAUTHENTICATED = 12004,
  CAPTCHA_VERIFICATION_FAILED = 12005,
  EMAILING_DISABLED = 12006,
  FORBIDDEN = 12007,
  DOCUMENT_GENERATION_FAILED = 12008,
  ACSYS_INTEGRATION_ERROR = 12009
}
export type AppExceptionCode = keyof typeof AppExceptionCodeEnum;

export type AppExceptionAppearance = 'error-page' | 'error-stub';
export class AppException extends Error {
  code: AppExceptionCodeEnum;
  internalMsg: string;
  appearance: AppExceptionAppearance;
  params?: any;

  constructor (code: AppExceptionCodeEnum, internalMsg: string, appearance: AppExceptionAppearance, params?: any) {
    super(internalMsg);
    this.code = code;
    this.internalMsg = internalMsg;
    this.appearance = appearance;
    this.params = params;
  }

  static isAppException (err: any) : err is AppException {
    return err && isObject(err) && 'appearance' in err;
  }
}

export function lookupAppExceptionCode (errCode: any): AppExceptionCode | undefined {
  if (!errCode) {
    return undefined;
  }

  const errEnumLookup = Object.entries(AppExceptionCodeEnum).filter(e => e[1].valueOf() === errCode.valueOf()).map(e => e[0].toUpperCase());
  if (errEnumLookup.length === 0) {
    return undefined;
  }
  return errEnumLookup[0].toUpperCase() as AppExceptionCode;
}

export class DbConcurrentUpdateException extends Error {
  public dbException: Error;

  constructor (message: string, dbException: Error) {
    super(message);
    this.dbException = dbException;
  }
}

export class UntypedJsException extends Error {
  public untypedException: any;

  constructor (message: string, untypedException: any) {
    super(message);
    this.untypedException = untypedException;
  }
}

export function wrapExceptionIfNeeded (err: any | undefined) : Error {
  if (!err) {
    return new Error('unknown exception');
  }

  if (err instanceof Error) {
    return err;
  }

  return new UntypedJsException('exception occured', err);
}

export function flattenError (err: Error) : any {
  return {
    stack: err.stack,
    name: err.name,
    cause: err.cause,
    message: err.message,
    untypedException: (err as any)?.untypedException || (err instanceof UntypedJsException) ? (err as UntypedJsException).untypedException : null
  };
}

export function mapAppExceptionToHttpStatus (code: AppExceptionCodeEnum) {
  switch (code) {
    case AppExceptionCodeEnum.BAD_REQUEST:
      return 400;
    case AppExceptionCodeEnum.UNAUTHENTICATED:
      return 401;
    case AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED:
    case AppExceptionCodeEnum.FORBIDDEN:
      return 403;
    case AppExceptionCodeEnum.OBJECT_NOT_FOUND:
      return 404;
  }
  return 500;
}

export function getUsrMsgResName (code: AppExceptionCodeEnum): I18nResName {
  switch (code) {
    case AppExceptionCodeEnum.BAD_REQUEST:
      return getI18nResName2('appErrors', 'badRequest');
    case AppExceptionCodeEnum.OBJECT_NOT_FOUND:
      return getI18nResName2('appErrors', 'objectNotFound');
    case AppExceptionCodeEnum.CAPTCHA_VERIFICATION_FAILED:
      return getI18nResName2('appErrors', 'captchaError');
    case AppExceptionCodeEnum.EMAILING_DISABLED:
      return getI18nResName2('appErrors', 'emailingDisabled');
    case AppExceptionCodeEnum.FORBIDDEN:
      return getI18nResName2('appErrors', 'forbidden');
    case AppExceptionCodeEnum.DOCUMENT_GENERATION_FAILED:
      return getI18nResName2('appErrors', 'documentGenerationFailed');
    case AppExceptionCodeEnum.ACSYS_INTEGRATION_ERROR:
      return getI18nResName2('appErrors', 'acsysIntegrationError');
  }
  return getI18nResName2('appErrors', 'unknown');
}

export function defaultErrorHandler (err: any, nuxtApp?: ReturnType<typeof useNuxtApp>) {
  if (isNuxtError(err)) {
    // this means that createError has been called recently
    // and it can only happen from main error handling flow
    // so ignore this call to prevent error handling duplication
    return;
  }

  let appException: AppException;
  if (AppException.isAppException(err)) {
    appException = err as AppException;
  } else {
    appException = new AppException(
      AppExceptionCodeEnum.UNKNOWN,
      'unhandled exception occured',
      'error-stub');
  }
  defaultAppExceptionHandler(appException, nuxtApp);
}

export function createNuxtError(appException: AppException): Partial<NuxtError> {
  return createError({
    message: appException.internalMsg,
    fatal: false,
    statusCode: mapAppExceptionToHttpStatus(appException.code),
    data: {
      code: appException.code,
      params: appException.params
    }
  });
};

function addExceptionToErrorPageHandler(appException: AppException, nuxtApp?: ReturnType<typeof useNuxtApp>) {
  if(!import.meta.server) {
    return;
  }

  if(!nuxtApp) {
    try {
      nuxtApp = useNuxtApp();
    } catch(err: any) {
      consola.error('failed to access nuxt app (in addExceptionToErrorPageHandler)', appException);
      return;
    }
  }
  if(!nuxtApp.ssrContext?.event?.context) {
    return;
  }

  nuxtApp.ssrContext.event.context.appException = appException;
}

function defaultAppExceptionHandler (appException: AppException, nuxtApp?: ReturnType<typeof useNuxtApp>) {
  if (appException.code === AppExceptionCodeEnum.UNAUTHENTICATED) {
    if(import.meta.server) {
      appException.code = AppExceptionCodeEnum.FORBIDDEN;
      appException.appearance = 'error-page';
      // KB: auth protection for pages must be set via auth middleware config
      consola.error('unexpected unauthenticated exception handling on server side');
    } else {
      try {
        const { signIn } = useAuth();
        signIn('credentials');
        return;
      } catch (err: any) {
        consola.warn('error occured while redirecting user to login page', err);
        appException.code = AppExceptionCodeEnum.FORBIDDEN;
        appException.appearance = 'error-page';
      }
    }
  }

  if (import.meta.client) {
    // normally client code should't reach that point as AppException must be handled via ErrorHelm component,
    // so this is a "fallback" place
    if (appException.appearance === 'error-page') {
      showError(createNuxtError(appException));
    } else {
      // showing stubs cannot be implemented here, so only notification is possible
      const notification: IUserNotificationParams = {
        level: UserNotificationLevel.ERROR,
        resName: getUsrMsgResName(appException.code)
      };
      const userNotificationStore = useUserNotificationStore();
      userNotificationStore.show(notification);
    }
  } else {
    addExceptionToErrorPageHandler(appException, nuxtApp);
    // KB: to prevent caching pages rendered with errors only redirection to error-page is used during SSR
    throw createNuxtError(appException);
  }
}

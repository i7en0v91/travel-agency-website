import { type NuxtError } from 'nuxt/app';
import isObject from 'lodash-es/isObject';
import { type I18nResName, getI18nResName2 } from './i18n';
import { UserNotificationLevel } from './constants';

export enum AppExceptionCodeEnum {
  UNKNOWN = 12000,
  BAD_REQUEST = 12001,
  OBJECT_NOT_FOUND = 12003,
  UNAUTHORIZED = 12004,
  CAPTCHA_VERIFICATION_FAILED = 12005,
  EMAILING_DISABLED = 12006,
  FORBIDDEN = 12007,
  DOCUMENT_GENERATION_FAILED = 12008
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

  return new UntypedJsException('untyped JavaScript exception occured', err);
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
    case AppExceptionCodeEnum.UNAUTHORIZED:
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
  }
  return getI18nResName2('appErrors', 'unknown');
}

export function defaultErrorHandler (err: any) {
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
  defaultAppExceptionHandler(appException);
}

function defaultAppExceptionHandler (appException: AppException) {
  if (appException.code === AppExceptionCodeEnum.UNAUTHORIZED) {
    try {
      const { signIn } = useAuth();
      signIn('credentials');
      return;
    } catch (err: any) {
      console.log('error occured while redirecting user to login page', err);
    }
  }

  const createNuxtError = (appException: AppException): Partial<NuxtError> => {
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
    // during SSR only redirection to error-page is possible
    // (and api endpoints wont reach this method, so it's SSR)
    showError(createNuxtError(appException));
  }
}

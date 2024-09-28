import { getUsrMsgResName, mapAppExceptionToHttpStatus, AppException, AppExceptionCodeEnum, UserNotificationLevel } from '@golobe-demo/shared';
import { type IUserNotificationParams } from './../stores/user-notification-store';
import { type NuxtError } from 'nuxt/app';
import { consola } from 'consola';

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

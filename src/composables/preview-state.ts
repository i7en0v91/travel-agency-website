import { type H3Event } from 'h3';
import { type IAppLogger } from "./../shared/applogger";
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, UserNotificationLevel } from './../shared/constants';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';
import { parseURL, parseQuery } from 'ufo';
import { getI18nResName1 } from './../shared/i18n';
import { type IUserNotificationStore } from './../stores/user-notification-store';

let _Enabled: boolean | undefined = undefined;

async function onRequestUserAction(isPreviewMode: boolean, userNotificationStore: IUserNotificationStore, logger: IAppLogger): Promise<boolean> {
  logger.verbose(`(preview-state) user action check requested, isPreviewMode=${isPreviewMode}`);
  if(isPreviewMode) {
    logger.info(`(preview-state) preventing user action, isPreviewMode=${isPreviewMode}`);
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName1('notAllowedInPreviewMode')
    });
    return false;
  }
  return true;
}

export function usePreviewState(event: H3Event | undefined = undefined): { enabled: boolean, requestUserAction: () => Promise<boolean> } {
  const nuxtApp = useNuxtApp();
  const userNotificationStore = useUserNotificationStore();

  const logger: IAppLogger = CommonServicesLocator.getLogger();
  const requestUserAction = async (): Promise<boolean> => { 
    return await onRequestUserAction(_Enabled ?? false, userNotificationStore, logger);
  };
  if(_Enabled === true || 
    (nuxtApp.ssrContext?.event?.context.preview.mode ?? false) // in case executing nested request
  ) {    
    // KB: once entered in preview mode it remains constant, the only way to change it is to reload the app
    _Enabled = true;
    logger.debug(`(preview-state) returning cached value, preview=${_Enabled}`);
    return { enabled: _Enabled, requestUserAction };
  }
  
  logger.debug('(preview-state) checking preview state...');
  let query: any;
  try {
    if(import.meta.client) {
      query = useRoute().query; 
    } else {
      if(event) {
        if(event.context.preview.mode) {
          _Enabled = true;
          logger.debug(`(preview-state) updating preview state value from context, preview=${_Enabled}`);
          return { enabled: _Enabled, requestUserAction };
        }
        query = event.node.req.url ? parseQuery(parseURL(event.node.req.url!).search ?? '') : undefined;
      } else {
        query = useNuxtApp().$router.currentRoute.value.query;
      }
      
    }
  } catch(err: any) {
    logger.warn(`(preview-state) failed to initialize preview state`, err);
    if(_Enabled === undefined) {
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to initialize preview state', 'error-page');  
    }
    return { enabled: _Enabled, requestUserAction };
  }
  
  _Enabled = !!query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue;
  logger.debug(`(preview-state) updating preview state value, preview=${_Enabled}`);
  return { enabled: _Enabled, requestUserAction };
}
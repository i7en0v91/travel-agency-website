import { lookupPageByUrl, getI18nResName1, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, UserNotificationLevel, AppException, AppExceptionCodeEnum, type IAppLogger, SystemPage } from "@golobe-demo/shared";
import type { H3Event } from 'h3';
import { parseURL, parseQuery } from 'ufo';
import type { useUserNotificationStore } from './../stores/user-notification-store';
import { getCommonServices } from "../helpers/service-accessors";

let _Enabled: boolean | undefined = undefined;
type UserNotificationStore = ReturnType<typeof useUserNotificationStore>;

async function onRequestUserAction(isPreviewMode: boolean, userNotificationStore: UserNotificationStore, logger: IAppLogger): Promise<boolean> {
  logger.verbose('user action check requested', isPreviewMode);
  if(isPreviewMode) {
    logger.info('preventing user action', isPreviewMode);
    userNotificationStore.show({
      level: UserNotificationLevel.WARN,
      resName: getI18nResName1('notAllowedInPreviewMode')
    });
    return false;
  }
  return true;
}

export function usePreviewState(event: H3Event | undefined = undefined): { enabled: boolean, requestUserAction: (notificationStore: UserNotificationStore) => Promise<boolean> } {
  const nuxtApp = useNuxtApp();

  const logger: IAppLogger = getCommonServices().getLogger().addContextProps({ component: 'UsePreviewState' });
  const requestUserAction = async (notificationStore: UserNotificationStore): Promise<boolean> => { 
    return await onRequestUserAction(_Enabled ?? false, notificationStore, logger);
  };
  if(_Enabled === true || 
    (nuxtApp.ssrContext?.event?.context.preview.mode ?? false) // in case executing nested request
  ) {    
    // KB: once entered in preview mode it remains constant, the only way to change it is to reload the app
    _Enabled = true;
    logger.debug('returning cached value', { preview: _Enabled });
    return { enabled: _Enabled, requestUserAction };
  }
  
  logger.debug('checking preview state');
  let query: any;
  try {
    if(import.meta.client) {
      query = useRoute().query; 
    } else {
      if(event) {
        if(event.context.preview.mode) {
          _Enabled = true;
          logger.debug('updating preview state value from context', { preview: _Enabled });
          return { enabled: _Enabled, requestUserAction };
        }
        query = event.node.req.url ? parseQuery(parseURL(event.node.req.url!).search ?? '') : undefined;
      } else {
        query = (nuxtApp.$router as any).currentRoute.value.query;
      }
      
    }
  } catch(err: any) {
    logger.warn('failed to initialize preview state', err);
    if(_Enabled === undefined) {
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to initialize preview state', 'error-page');  
    }
    return { enabled: _Enabled, requestUserAction };
  }
  
  _Enabled = (!!query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue);
  if(!_Enabled) {
    const page = lookupPageByUrl(useRoute().path);
    if(page === SystemPage.Drafts)  {
      _Enabled = true;
    }
  }
  logger.debug('updating preview state value', { preview: _Enabled });
  return { enabled: _Enabled, requestUserAction };
}
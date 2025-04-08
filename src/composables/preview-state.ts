import { lookupPageByUrl, getI18nResName1, QueryPagePreviewModeParam, PreviewModeParamEnabledValue, UserNotificationLevel, AppException, AppExceptionCodeEnum, type IAppLogger, SystemPage } from "@golobe-demo/shared";
import type { H3Event } from 'h3';
import { parseURL, parseQuery } from 'ufo';
import type { useUserNotificationStore } from './../stores/user-notification-store';
import { getCommonServices } from "../helpers/service-accessors";
import once from 'lodash-es/once';

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

const getLogger = once(() => getCommonServices().getLogger().addContextProps({ component: 'PreviewState' }));
export function usePreviewState(event: H3Event | undefined = undefined): { enabled: boolean, requestUserAction: (notificationStore: UserNotificationStore) => Promise<boolean> } {
  const requestUserAction = async (notificationStore: UserNotificationStore): Promise<boolean> => { 
    return await onRequestUserAction(_Enabled ?? false, notificationStore, getLogger());
  };
  if(_Enabled === true || 
    ((import.meta.server && (event ?? useRequestEvent())?.context.preview.mode) ?? false) // in case executing nested request
  ) {    
    // KB: once entered in preview mode it remains constant, the only way to change it is to reload the app
    _Enabled = true;
    return { enabled: _Enabled, requestUserAction };
  }
  
  let query: any;
  try {
    if(import.meta.client) {
      query = parseQuery(window.location.search);
    } else {
      if(event) {
        if(event.context.preview.mode) {
          _Enabled = true;
          return { enabled: _Enabled, requestUserAction };
        }
        query = event.node.req.url ? parseQuery(parseURL(event.node.req.url!).search ?? '') : undefined;
      } else {
        query = parseQuery(parseURL(useRequestEvent()!.node.req.url).search);
      }
    }
  } catch(err: any) {
    if(_Enabled === undefined) {
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to initialize preview state', 'error-page');  
    }
    return { enabled: _Enabled, requestUserAction };
  }
  
  _Enabled = (!!query && query[QueryPagePreviewModeParam] === PreviewModeParamEnabledValue);
  if(!_Enabled) {
    const page = lookupPageByUrl(
        import.meta.client ? 
          window.location.pathname : 
          (parseURL((event ?? useRequestEvent())?.node.req.url).pathname)
      );
    if(page === SystemPage.Drafts)  {
      _Enabled = true;
    }
  }
  return { enabled: _Enabled, requestUserAction };
}
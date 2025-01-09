import { isElectronBuild, AppException, AppExceptionCodeEnum, isDevOrTestEnv, UserNotificationLevel, type I18nResName } from '@golobe-demo/shared';
import { TYPE, useToast } from 'vue-toastification';
import { getCommonServices } from '../helpers/service-accessors';
import { getDialogsFacade } from '../helpers/electron';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

export interface IUserNotificationStore {
  show: (params: IUserNotificationParams) => void;
};

export const useUserNotificationStore = defineStore('userNotificationStore', () => {
  const { t } = useI18n();

  const toastManager = (import.meta.client && !isElectronBuild()) ? useToast() : undefined;

  const doShowOnClient = (params: IUserNotificationParams) => {
    const msg = t(params.resName, params.resArgs);
    if(isElectronBuild()) {    
      const dialogsFacade = getDialogsFacade(t);
      switch (params.level) {
        case UserNotificationLevel.INFO:
          dialogsFacade!.showNotification('info', msg);
          break;
        case UserNotificationLevel.WARN:
          dialogsFacade!.showNotification('warning', msg);
          break;
        case UserNotificationLevel.ERROR:
          dialogsFacade!.showNotification('error', msg);
          break;
      }
    } else {
      switch (params.level) {
        case UserNotificationLevel.INFO:
          toastManager!.info(msg, { type: TYPE.INFO });
          break;
        case UserNotificationLevel.WARN:
          toastManager!.warning(msg, { type: TYPE.WARNING });
          break;
        case UserNotificationLevel.ERROR:
          toastManager!.error(msg, { type: TYPE.ERROR });
          break;
      }
    }
  };

  const show = (params: IUserNotificationParams) => {
    const logger = getCommonServices().getLogger();
    if (import.meta.client) {
      logger.verbose('(user-notification-store): showing new notification', params);
      doShowOnClient(params);
    } else {
      // TODO: implement passing notification data in payload, but in this case preventing page from being cached (in Nitro cache also)
      logger.warn('(user-notification-store): showing notification from server side is not implemented', params);
      if(isDevOrTestEnv()) {
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'showing notification from server side is not implemented', 'error-page');
      }
    }
  };

  return {
    show
  } as IUserNotificationStore;
});
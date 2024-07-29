import { TYPE, useToast } from 'vue-toastification';
import { type I18nResName } from '../shared/i18n';
import { UserNotificationLevel } from '../shared/constants';
import { isDevOrTestEnv } from './../shared/constants';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

export interface IUserNotificationStore {
  show: (params: IUserNotificationParams) => void;
};

export const useUserNotificationStore = defineStore('userNotificationStore', () => {
  const logger = CommonServicesLocator.getLogger();
  const { t } = useI18n();

  const toastManager = import.meta.client ? useToast() : undefined;

  const doShowOnClient = (params: IUserNotificationParams) => {
    const msg = t(params.resName, params.resArgs);
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
  };

  const show = (params: IUserNotificationParams) => {
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

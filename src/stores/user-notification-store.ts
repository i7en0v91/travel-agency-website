import { AppConfig, AppException, AppExceptionCodeEnum, isDevOrTestEnv, UserNotificationLevel, type I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../helpers/service-accessors';
import { murmurHash } from 'ohash';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

export interface IUserNotificationStore {
  show: (params: IUserNotificationParams) => void;
};

type NotificationId = string;
export const useUserNotificationStore = defineStore('userNotificationStore', () => {
  const logger = getCommonServices().getLogger();
  const { t } = useI18n();

  const toastManager = import.meta.client ? useToast() : undefined;

  const pendingNotificationIds = new Set<NotificationId>();
  const doShowOnClient = (params: IUserNotificationParams) => {
    const msg = t(params.resName, params.resArgs);
    const notificationId: NotificationId = murmurHash(msg, AppConfig.userNotifications.filterDuplicates ? 0 : new Date().getTime()).toString();
    if(AppConfig.userNotifications.filterDuplicates) {
      const isPending = pendingNotificationIds.has(notificationId);
      if(isPending) {
        logger.verbose(`(user-notification-store): notification is pending - refreshing timeout, notificationId=${notificationId}`, params);
        toastManager!.update(notificationId, { timeout: AppConfig.userNotifications.timeoutMs });
        return;
      }
    }

    if(AppConfig.userNotifications.maxItems && pendingNotificationIds.size >= AppConfig.userNotifications.maxItems) {
      logger.warn(`(user-notification-store): cannot show new notification - maximum pending notifications count limit reached, notificationId=${notificationId}, limit=${AppConfig.userNotifications.maxItems}`, params);
      return;
    }

    logger.verbose(`(user-notification-store): showing new notification, notificationId=${notificationId}`, params);
    try {
      toastManager!.add({
        id: notificationId,
        description: msg,
        timeout: AppConfig.userNotifications.timeoutMs,
        color: params.level === UserNotificationLevel.INFO ? 'primary' : 
            (params.level === UserNotificationLevel.WARN) ? 'yellow' : 'red',
        icon: params.level === UserNotificationLevel.INFO ? 'i-heroicons-check-circle' : 
        (params.level === UserNotificationLevel.WARN) ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-exclamation-circle-solid',
        callback: () => {
          logger.debug(`(user-notification-store): removing notification from pending list, notificationId=${notificationId}`, params);
          if(!pendingNotificationIds.delete(notificationId)) {
            logger.warn(`(user-notification-store): cannot remove notification from pending list - not found, notificationId=${notificationId}`, params);
            return;
          }   
        }
      });
      pendingNotificationIds.add(notificationId);
    } catch(err: any) {
      logger.warn(`(user-notification-store): failed to showing new notification, notificationId=${notificationId}`, err, params);
    }
  };

  const show = (params: IUserNotificationParams) => {
    if (import.meta.client) {
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

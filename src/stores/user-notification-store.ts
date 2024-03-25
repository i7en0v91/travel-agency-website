import { TYPE, useToast } from 'vue-toastification';
import { type I18nResName } from '../shared/i18n';
import { UserNotificationLevel, NuxtDataKeys } from '../shared/constants';
import AppConfig from './../appconfig';
import { getPayload, addPayload } from './../shared/payload';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

export const useUserNotificationStore = defineStore('userNotificationStore', () => {
  const logger = CommonServicesLocator.getLogger();
  const { t } = useI18n();
  const nuxtApp = useNuxtApp();

  const notificationsToHydate: IUserNotificationParams[] = [];
  const toastManager = process.client ? useToast() : undefined;
  let isMounted = false;

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

  const handleAppMount = () => {
    if (isMounted) {
      logger.verbose('(useUserNotificationStore): appMount handler is called multiple times');
      return;
    }
    isMounted = true;

    const nuxtApp = useNuxtApp();
    const notifications = getPayload<IUserNotificationParams[]>(nuxtApp, NuxtDataKeys.UserNotifications);
    notifications?.forEach(n => doShowOnClient(n));
  };

  const show = (params: IUserNotificationParams) => {
    if (process.client) {
      logger.verbose('(useUserNotificationStore): showing new notification', params);
      doShowOnClient(params);
    } else {
      logger.verbose('(useUserNotificationStore): saving new notification on server for restoring on client', params);
      if (notificationsToHydate.length >= AppConfig.userNotifications.maxItems) {
        logger.warn('(useUserNotificationStore): cannot add new notification on server, maximum number of items exceeded', null, params);
        return;
      }
      notificationsToHydate.push(params);
      addPayload(nuxtApp, NuxtDataKeys.UserNotifications, notificationsToHydate);
    }
  };

  return {
    handleAppMount,
    show
  };
});

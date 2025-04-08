import { isElectronBuild, AppConfig, UserNotificationLevel, type I18nResName } from '@golobe-demo/shared';
import { StoreKindEnum } from './../helpers/constants';
import { getCommonServices } from '../helpers/service-accessors';
import { murmurHash } from 'ohash';
import { getDialogsFacade } from '../helpers/electron';
import { buildStoreDefinition, type PublicStore } from './../helpers/stores/pinia';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

type NotificationId = string;

const StoreId = StoreKindEnum.UserNotification;

/** 
 * KB: at the moment doesn't have any state or patches, but is imported by 
 * infrastructure code like global exception handlers where not all plugins &
 * composables are available. This may result into dependency resolution issues
 * and probably it will be better to use more flexible Setup API store definition 
 * instead of Options API (see https://pinia.vuejs.org/core-concepts/#Setup-Stores)
 */
const storeDefBuilder = () => buildStoreDefinition(StoreId, 
  (clientSideOptions) => {
    const nuxtApp = clientSideOptions!.nuxtApp;
    const localizer = () => nuxtApp.$i18n as ReturnType<typeof useI18n>;
    const toastManager = !isElectronBuild() ? useToast() : undefined;
    const pendingNotificationIds = new Set<NotificationId>();

    return {
      localizer,
      toastManager,
      pendingNotificationIds
    };
  },
  {
    state: () => { return {}; },
    getters: { },
    actions: {
      /**
       * Shows notification to user
       */
      show(params: IUserNotificationParams) {
        if(!import.meta.client) {
          return;
        }

        const { localizer } = this.clientSetupVariables();
        const { t } = localizer();
        const msg = t(params.resName, params.resArgs);
        const logger = getCommonServices().getLogger();
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
          const notificationId: NotificationId = murmurHash(msg, AppConfig.userNotifications.filterDuplicates ? 0 : new Date().getTime()).toString();
          const pendingNotificationIds = this.clientSetupVariables().pendingNotificationIds;
          const toastManager = this.clientSetupVariables().toastManager;
          if(AppConfig.userNotifications.filterDuplicates) {
            const isPending = pendingNotificationIds.has(notificationId);
            if(isPending) {
              logger.verbose('notification is pending - refreshing timeout', { ...params, notificationId });
              toastManager!.update(notificationId, { timeout: AppConfig.userNotifications.timeoutMs });
              return;
            }
          }

          if(AppConfig.userNotifications.maxItems && pendingNotificationIds.size >= AppConfig.userNotifications.maxItems) {
            logger.warn('cannot show new notification - maximum pending notifications count limit reached', undefined, { ...params, notificationId, limit: AppConfig.userNotifications.maxItems });
            return;
          }

          logger.verbose('showing new notification', { ...params, notificationId });
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
                logger.debug('removing notification from pending list', { ...params, notificationId });
                if(!pendingNotificationIds.delete(notificationId)) {
                  logger.warn('cannot remove notification from pending list - not found', undefined, { ...params, notificationId });
                  return;
                }   
              }
            });
            pendingNotificationIds.add(notificationId);
          } catch(err: any) {
            logger.warn('failed to showing new notification', err, { ...params, notificationId });
          }
        }
      }
    },
    patches: { }
  }
);
const StoreDef = storeDefBuilder();

const useUserNotificationStoreInternal = defineStore(StoreId, StoreDef);
export declare type UserNotificationStoreInternal = ReturnType<typeof useUserNotificationStoreInternal>;
export declare type UserNotificationStore = ReturnType<PublicStore<typeof storeDefBuilder>>;
export const useUserNotificationStore = useUserNotificationStoreInternal as PublicStore<typeof storeDefBuilder>;
import { AppConfig } from '@golobe-demo/shared';
import Toast, { type PluginOptions, POSITION as ToastPosition } from 'vue-toastification';
import { getClientServices, getCommonServices } from '../helpers/service-accessors';
import type { UserAccountStoreInternal } from './../stores/user-account-store';

let _ToastPluginUsed = false;

export async function usePageSetup(): Promise<void> {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'PageSetup' });
  logger.verbose('entered');

  const nuxtApp = useNuxtApp();

  if(!_ToastPluginUsed) {
    logger.verbose('adding toast plugin');
    const toastOptions : PluginOptions = {
      maxToasts: AppConfig.userNotifications.maxItems,
      timeout: AppConfig.userNotifications.timeoutMs,
      position: ToastPosition.TOP_CENTER,
      hideProgressBar: true,
      containerClassName: 'user-notification-container mt-xs-2',
      toastClassName: 'user-notification-toast mb-xs-2 brdr-2',
      closeButtonClassName: 'user-notification-button',
      filterBeforeCreate: filterNotificationDuplicates
    };
    nuxtApp.vueApp.use(Toast, toastOptions);
    _ToastPluginUsed = true;
    logger.verbose('toast plugin added');
  }
  
  if(import.meta.client) {
    getClientServices().userNotificationStore = useUserNotificationStore();
  }
  const systemConfigurationStore = useSystemConfigurationStore();
  await systemConfigurationStore.loadImageCategories();
  useEntityCacheStore();
  if(import.meta.client) {
    const userAccountStore = useUserAccountStore();
    getClientServices().userAccountStore = userAccountStore;
    // start syncing store & user personal info in case auth status = 'authenticated'
    (userAccountStore as UserAccountStoreInternal).triggerAuthStatusSync();
  }

  logger.verbose('completed');
}

function filterNotificationDuplicates (
  toast: any,
  toasts: any[]
): any {
  if (AppConfig.userNotifications.filterDuplicates) {
    if (toasts.filter(t => t.content.toString() === toast.content.toString()).length !== 0) {
      return false;
    }
  }
  return toast;
}
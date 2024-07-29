import Toast, { type PluginOptions, POSITION as ToastPosition } from 'vue-toastification';
import AppConfig from './../appconfig';

let _ToastPluginUsed = false;

export async function usePageSetup(): Promise<void> {
  const logger = CommonServicesLocator.getLogger();
  logger.verbose('(page-setup) entered');

  const nuxtApp = useNuxtApp();

  if(!_ToastPluginUsed) {
    logger.verbose('(page-setup) adding toast plugin');
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
    logger.verbose('(page-setup) toast plugin added');
  }
  
  const systemConfigurationStore = useSystemConfigurationStore();
  await systemConfigurationStore.initialize();

  logger.verbose('(page-setup) completed');
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
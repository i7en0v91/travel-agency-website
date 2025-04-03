import { getClientServices, getCommonServices } from '../helpers/service-accessors';
import type { UserAccountStoreInternal } from './../stores/user-account-store';

export async function usePageSetup(): Promise<void> {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'PageSetup' });
  logger.verbose('entered');
  
  if(import.meta.client) {
    getClientServices().lazy = {
      userNotificationStore: useUserNotificationStore(),
      controlValuesStore: useControlValuesStore(),
      userAccountStore: useUserAccountStore()
    };
  }
  const systemConfigurationStore = useSystemConfigurationStore();
  await systemConfigurationStore.loadImageCategories();
  useEntityCacheStore();
  if(import.meta.client) {
    const userAccountStore = useUserAccountStore();
    // start syncing store & user personal info in case auth status = 'authenticated'
    (userAccountStore as UserAccountStoreInternal).triggerAuthStatusSync();
  }

  logger.verbose('completed');
}
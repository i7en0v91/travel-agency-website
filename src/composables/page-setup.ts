import { getClientServices, getCommonServices } from '../helpers/service-accessors';

export async function usePageSetup(): Promise<void> {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'PageSetup' });
  logger.verbose('entered');
  
  if(import.meta.client) {
    getClientServices().lazy = {
      userNotificationStore: useUserNotificationStore(),
      controlValuesStore: useControlValuesStore()
    };
  }
  const systemConfigurationStore = useSystemConfigurationStore();
  await systemConfigurationStore.loadImageCategories();
  useEntityCacheStore();

  logger.verbose('completed');
}
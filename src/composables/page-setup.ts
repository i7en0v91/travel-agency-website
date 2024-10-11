import { getCommonServices } from '../helpers/service-accessors';

export async function usePageSetup(): Promise<void> {
  const logger = getCommonServices().getLogger();
  logger.verbose('(page-setup) entered');
  
  const systemConfigurationStore = useSystemConfigurationStore();
  await systemConfigurationStore.initialize();

  logger.verbose('(page-setup) completed');
}
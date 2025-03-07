import { getCommonServices } from "../../../../../helpers/service-accessors";

export default defineWebApiEventHandler(() => {
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  logger.info('enter');
  return Promise.resolve({ status: 'OK ' });
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart', 'electron'] });

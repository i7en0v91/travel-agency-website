import { getLogger as getWebApiLogger } from '../../../../utils/webapi-event-handler';

export default defineWebApiEventHandler(() => {
  const logger = getWebApiLogger();
  logger.info('enter');
  return Promise.resolve({ status: 'OK ' });
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart', 'electron'] });

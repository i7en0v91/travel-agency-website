export default defineWebApiEventHandler(() => {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(oauth-stub:logout) enter');
  return Promise.resolve({ status: 'OK ' });
}, { logResponseBody: true, authorizedOnly: false, allowedEnvironments: ['test', 'development', 'quickstart'] });

import { type IAppLogger } from '../../shared/applogger';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (err) => {
    const logger = ((globalThis as any).CommonServicesLocator as any)?.getLogger() as IAppLogger;
    if (logger) {
      logger.error('(nitro:error) serious app error occured', err);
    }
  });
});

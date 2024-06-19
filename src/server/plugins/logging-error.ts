import { type IAppLogger } from '../../shared/applogger';
import { checkNeedSuppressServerMsg } from '../../shared/applogger';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (err) => {
    if(checkNeedSuppressServerMsg(err.message, err)) {
      return;
    }
    const logger = ((globalThis as any).CommonServicesLocator as any)?.getLogger() as IAppLogger;
    logger?.error('(nitro:error) error occured', err);
  });
});

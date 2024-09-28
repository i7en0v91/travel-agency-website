import { checkNeedSuppressServerMsg } from '@golobe-demo/shared';
import { getCommonServices } from '../../helpers/service-accessors';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (err) => {
    if(checkNeedSuppressServerMsg(err.message, err)) {
      return;
    }
    const logger = getCommonServices()?.getLogger();
    logger?.error('(nitro:error) error occured', err);
  });
});

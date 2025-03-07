import { AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { getActivePinia } from 'pinia';
import { ControlValuesStoreCustomReset, SystemConfigurationStoreResetWarning, CommonStoreProperties } from '../helpers/stores/plugins';
import { getCommonServices } from '../helpers/service-accessors';

export default defineNuxtPlugin({
  name: 'pinia-plugins',
  parallel: false,
  setup () {
    const pinia = getActivePinia();
    if(!pinia) {
      const CommonLogProps = { component: 'PiniaPlugins' };
      const logger = getCommonServices().getLogger();
      logger.error('failed to acquire pinia instance', undefined, CommonLogProps);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to acquire pinia instance', 'error-page');
    }

    pinia.use(CommonStoreProperties);
    pinia.use(SystemConfigurationStoreResetWarning);
    pinia.use(ControlValuesStoreCustomReset);
  }
});

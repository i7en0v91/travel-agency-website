import type { PiniaPlugin } from 'pinia';
import { StoreKindEnum } from './../../helpers/constants';
import { defaultErrorHandler } from '../exceptions';
import { consola } from 'consola';
import type { ControlValueKey } from '../../stores/control-values-store';
import type { IAppLogger } from '@golobe-demo/shared';
import { getCommonServices } from '../service-accessors';
import { getStoreLoggingPrefix } from './pinia';

function isControlValuesStore(store: any): store is ReturnType<typeof useControlValuesStore> {
  return store.$id === StoreKindEnum.ControlValues;
}

export const CommonStoreProperties: PiniaPlugin = ({ store }) => {
  let storeLogger: IAppLogger | undefined;
  store.displayError = markRaw((err: any) => {
    defaultErrorHandler(err, import.meta.client ? { nuxtApp: useNuxtApp() } : {});
  });
  store.getLogger = markRaw((): IAppLogger => {
    if(!storeLogger) {
      storeLogger = getCommonServices().getLogger().addContextProps({ component: getStoreLoggingPrefix(store.$id) });
    };
    return storeLogger;
  });
};

export const SystemConfigurationStoreResetWarning: PiniaPlugin = ({ store }) => {
  if(store.$id !== StoreKindEnum.SystemConfiguration) {
    return;
  }

  const originalReset = store.$reset.bind(store);
  return {
    $reset() {
      originalReset();
      store.s_imagesConfig = store.clientSetupVariables().fallbackImageCategories;
      consola.warn(`resetting [${StoreKindEnum.SystemConfiguration}] store state is not desired`);
    },
    displayError: store.displayError,
    getLogger: store.getLogger
  };
};

export const ControlValuesStoreCustomReset: PiniaPlugin = ({ store }) => {
  if(!isControlValuesStore(store)) {
    return;
  }

  const evalControlValue = (value : any) => 
    (value && (typeof value === 'function')) ? (value()) : value;  

  return {
    $reset() {
      const timestamp = new Date().getTime();;
      for(const fe of store.s_controlValues.entries()) {
        const key: ControlValueKey = fe[1].fullKey;
        const value = { 
          ...fe[1],
          ...{
            agentUpdateTimestamp: timestamp,
            modelValue: evalControlValue(fe[1].initialOverwrite ?? fe[1].defaultValue)
          },
          valueKind: fe[1].kind
        };
        store.updateControlValue({ key, value });
      };
    },
    displayError: store.displayError,
    getLogger: store.getLogger
  };
};

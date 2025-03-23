import type { IAppLogger } from '@golobe-demo/shared';
import { getCommonServices } from './../service-accessors';
import type { PiniaPlugin } from 'pinia';
import{ getStoreLoggingPrefix } from './pinia';
import { StoreKindEnum } from './../../helpers/constants';
import { defaultErrorHandler } from '../exceptions';
import { consola } from 'consola';
import type { useControlValuesStore } from '../../stores/control-values-store';
import type { useSystemConfigurationStore } from '../../stores/system-configuration-store';

function isControlValuesStore(store: any): store is ReturnType<typeof useControlValuesStore> {
  return store.$id === StoreKindEnum.ControlValues;
}

function isSystemConfigurationStore(store: any): store is ReturnType<typeof useSystemConfigurationStore> {
  return store.$id === StoreKindEnum.SystemConfiguration;
}

export const CommonStoreProperties: PiniaPlugin = ({ store }) => {
  let storeLogger: IAppLogger | undefined;
  store.$onAction(({
    name,
    store,
    args
  }) => {
    if(store.nuxtApp) {
      return;
    }
    let nuxtApp: ReturnType<typeof useNuxtApp>;
    try {
      nuxtApp = useNuxtApp();  
    } catch(err: any) {
      store.getLogger().warn(`failed to acquire Nuxt app instance`, err, { action: name, args });
      return;
    }
    store.getLogger().verbose(`injecting Nuxt app instance`, { action: name, args });
    store.nuxtApp = markRaw(nuxtApp);
  });

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
  if(!isSystemConfigurationStore(store)) {
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
    getLogger: store.getLogger,
    nuxtApp: store.nuxtApp
  };
};

export const ControlValuesStoreCustomReset: PiniaPlugin = ({ store }) => {
  if(!isControlValuesStore(store)) {
    return;
  }

  return {
    $reset() {
      const allKeys = [...store.values.values()].map(ev => ev.fullKey);
      for(const key of allKeys) {
        store.resetToDefault(key);
      }
    },
    displayError: store.displayError,
    getLogger: store.getLogger,
    nuxtApp: store.nuxtApp
  };
};

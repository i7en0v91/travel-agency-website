import type { PiniaPlugin } from 'pinia';
import { StoreKindEnum } from './../../helpers/constants';
import { defaultErrorHandler } from '../exceptions';
import { consola } from 'consola';
import type { ControlValuesStoreInternal } from '../../stores/control-values-store';
import type { SystemConfigurationStoreInternal } from '../../stores/system-configuration-store';
import type { UserAccountStoreInternal } from '../../stores/user-account-store';
import type { IAppLogger } from '@golobe-demo/shared';
import { getCommonServices } from '../service-accessors';
import { getStoreLoggingPrefix } from './pinia';

function isControlValuesStore(store: any): store is ControlValuesStoreInternal {
  return store.$id === StoreKindEnum.ControlValues;
}

function isSystemConfigurationStore(store: any): store is SystemConfigurationStoreInternal {
  return store.$id === StoreKindEnum.SystemConfiguration;
}

function isUserAccountStore(store: any): store is UserAccountStoreInternal {
  return store.$id === StoreKindEnum.UserAccount;
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
  store.setLoggingProps = markRaw((props: Record<string, any>): void => {
    storeLogger = getCommonServices().getLogger().addContextProps({ 
      component: getStoreLoggingPrefix(store.$id),
      ...props
    });
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
    setLoggingProps: store.setLoggingProps,
    nuxtApp: store.nuxtApp
  };
};

export const ControlValuesStoreCustomReset: PiniaPlugin = ({ store }) => {
  if(!isControlValuesStore(store)) {
    return;
  }

  const originalReset = store.$reset.bind(store);
  return {
    $reset() {
      const allKeys = [...store.values.values()].map(ev => ev.fullKey);
      originalReset();
      for(const key of allKeys) {
        store.resetToDefault(key);
      }
    },
    displayError: store.displayError,
    getLogger: store.getLogger,
    setLoggingProps: store.setLoggingProps,
    nuxtApp: store.nuxtApp
  };
};

export const UserAccountStoreCustomReset: PiniaPlugin = ({ store }) => {
  if(!isUserAccountStore(store)) {
    return;
  }

  const originalReset = store.$reset.bind(store);
  return {
    $reset() {
      if(import.meta.server) {
        originalReset();
        return;  
      }
      
      const userId = store.isAuthenticated && store.userId;
      originalReset();
      if(userId) {
        store.$patch((s) => {
          s.s_userId = userId;
        });
      }
      store.triggerAuthStatusSync();
    },
    displayError: store.displayError,
    getLogger: store.getLogger,
    setLoggingProps: store.setLoggingProps,
    nuxtApp: store.nuxtApp
  };
};
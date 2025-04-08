import type { PiniaPlugin } from 'pinia';
import { StoreKindEnum } from './../../helpers/constants';
import { consola } from 'consola';
import type { ControlValuesStoreInternal } from '../../stores/control-values-store';
import type { SystemConfigurationStoreInternal } from '../../stores/system-configuration-store';
import type { UserAccountStoreInternal } from '../../stores/user-account-store';

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
      return;
    }
    store.nuxtApp = markRaw(nuxtApp);
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

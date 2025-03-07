import type { StateTree, DefineStoreOptions } from 'pinia';
import type { PatchKey, PatchFn, IStoreWithPatchSematics, Patches } from './types';
import merge from 'lodash-es/merge';
import { type IAppLogger, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { getCommonServices } from '../service-accessors';
import camelCase from 'lodash-es/camelCase';

declare type GettersWithCommons<Id extends string, S extends StateTree, ClientSetupVars, G, A> = 
  DefineStoreOptions<Id, S & ClientSetupVars, G, A>['getters'];
declare type ActionsWithCommonsAndPatches<Id extends string, S extends StateTree, ClientSetupVars, Patches, G, A> = 
  DefineStoreOptions<Id, S & ClientSetupVars & Patches, G, A>['actions'];

declare type StoreCommonMethods<ClientSetupVars> = {
  /**
   * Methods & variables defined during {@link buildStoreDefinition} method for store's internal usage, 
   * defined on global scope outside of Pinia
   * @returns accessor to value returned from {@link clientSetup} method
   */
  clientSetupVariables: () => ClientSetupVars
}

declare type ClientSideOptions = {
  nuxtApp: ReturnType<typeof useNuxtApp>,
  fetchEx: ReturnType<typeof useNuxtApp>['$fetchEx']
};

export function getStoreLoggingPrefix(storeId: string) { 
  const camelized = camelCase(`${storeId}-store`);
  return `${camelized[0].toUpperCase()}${camelized.substring(1)}`;
};

/**
 * @param clientSetup Client-side store setup function which may optionally return 
 * local variables for subsequent use in actions & patches. 
 * Receives additional infrastructure objects in {@link clientSideOptions} argument.
 * 
 * Added for convenience when using Options API.
 * Since Pinia also handles SSR cases and {@link StoreCommonMethods.clientSetupVariables} is defined 
 * on global scope and not tracked by Pinia, {@link clientSetup} is called only on client and 
 * disabled on server to prevent sharing state between different requests 
 * (see https://vuejs.org/guide/scaling-up/ssr.html#cross-request-state-pollution)
 */
export function buildStoreDefinition<
  Id extends string, 
  S extends StateTree, 
  ClientSetupVars, G, A, P extends Record<PatchKey, PatchFn>
>(
    id: Id,
    clientSetup: (clientSideOptions: ClientSideOptions) => ClientSetupVars, 
    store: IStoreWithPatchSematics<
      Id, S,
      GettersWithCommons<Id, S, StoreCommonMethods<ClientSetupVars>, G, A>,
      ActionsWithCommonsAndPatches<Id, S, StoreCommonMethods<ClientSetupVars>, P, G, A>,
      Patches<Id, S & StoreCommonMethods<ClientSetupVars>, G, P>
    >
): DefineStoreOptions<
  Id, 
  StateTree, // private state, getters & actions should be used to access it from outside
  G, A
> {
  let clientSetupVariables: ClientSetupVars | undefined;
  try {
    if(import.meta.client) {
      const nuxtApp = useNuxtApp();
      const fetchEx = (options: FetchExOptions) => {
        let logger: IAppLogger | undefined;
        const getLogger = () => {
          if(!logger) {
            logger = getCommonServices().getLogger().addContextProps({ component: 'CustomFetch' });
          }
          return logger;
        };
        return options.defautAppExceptionAppearance === 'error-page' ? 
          createFetch({ defautAppExceptionAppearance: 'error-page' }, nuxtApp, getLogger) : 
          createFetch({ defautAppExceptionAppearance: 'error-stub' }, nuxtApp, getLogger);
      };
      clientSetupVariables = clientSetup({
        nuxtApp,
        fetchEx
      });
    }
  } catch(err: any) {
    const logger = getCommonServices()?.getLogger();
    logger?.error('store setup method failed', err, { component: getStoreLoggingPrefix(id) });
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown error', 'error-page');
  }

  const commonMethods: StoreCommonMethods<ClientSetupVars> = {
    clientSetupVariables: () => {
      if(!import.meta.client) {
        throw new Error('setup method method is available only on client');
      }
      return clientSetupVariables!;
    }
  };

  return {
    id,
    state: store.state,
    actions: merge(store.actions, store.patches ?? {}, commonMethods),
    getters: store.getters
  };
}
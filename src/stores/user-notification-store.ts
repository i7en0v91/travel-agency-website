import { isElectronBuild, UserNotificationLevel, type I18nResName } from '@golobe-demo/shared';
import { StoreKindEnum } from './../helpers/constants';
import { TYPE, useToast } from 'vue-toastification';
import { getDialogsFacade } from '../helpers/electron';
import { buildStoreDefinition } from './../helpers/stores/pinia';

export interface IUserNotificationParams {
  level: UserNotificationLevel;
  resName: I18nResName;
  resArgs?: any
}

const StoreId = StoreKindEnum.UserNotification;

/** 
 * KB: at the moment doesn't have any state or patches, but is imported by 
 * infrastructure code like global exception handlers where not all plugins &
 * composables are available. This may result into dependency resolution issues
 * and probably it will be better to use more flexible Setup API store definition 
 * instead of Options API (see https://pinia.vuejs.org/core-concepts/#Setup-Stores)
 */
const StoreDef = buildStoreDefinition(StoreId, 
  (clientSideOptions) => {
    const toastManager = !isElectronBuild() ? useToast() : undefined;
    const nuxtApp = clientSideOptions!.nuxtApp;
    const localizer = () => nuxtApp.$i18n as ReturnType<typeof useI18n>;
    
    return {
      localizer,
      toastManager
    };
  },
  {
    state: () => { return {}; },
    getters: { },
    actions: {
      /**
       * Shows notification to user
       */
      show(params: IUserNotificationParams) {
        if(!import.meta.client) {
          return;
        }

        const logger = this.getLogger();
        logger.verbose(`showing new notification`, { params });

        const { localizer } = this.clientSetupVariables();
        const { t } = localizer();
        const msg = t(params.resName, params.resArgs);

        if(isElectronBuild()) {    
          const dialogsFacade = getDialogsFacade(t);
          switch (params.level) {
            case UserNotificationLevel.INFO:
              dialogsFacade!.showNotification('info', msg);
              break;
            case UserNotificationLevel.WARN:
              dialogsFacade!.showNotification('warning', msg);
              break;
            case UserNotificationLevel.ERROR:
              dialogsFacade!.showNotification('error', msg);
              break;
          }
        } else {
          const { toastManager } = this.clientSetupVariables();
          switch (params.level) {
            case UserNotificationLevel.INFO:
              toastManager!.info(msg, { type: TYPE.INFO });
              break;
            case UserNotificationLevel.WARN:
              toastManager!.warning(msg, { type: TYPE.WARNING });
              break;
            case UserNotificationLevel.ERROR:
              toastManager!.error(msg, { type: TYPE.ERROR });
              break;
          }
        }
      }
    },
    patches: { }
  }
);

export const useUserNotificationStore = defineStore(StoreId, StoreDef);

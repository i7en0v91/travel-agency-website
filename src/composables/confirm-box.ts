import { UserNotificationLevel, AppException, AppExceptionCodeEnum, type I18nResName, getI18nResName2, isElectronBuild } from '@golobe-demo/shared';
import { updateTabIndices, TabIndicesUpdateDefaultTimeout } from './../helpers/dom';
import { useModal } from 'vue-final-modal';
import { type ConfirmBoxButton } from './../types';
import ConfirmBox from './../components/confirm-box.vue';
import { getCommonServices } from '../helpers/service-accessors';
import { getDialogsFacade } from '../helpers/electron';

interface IConfirmBox {
  confirm: (ctrlKey: string, buttons: ConfirmBoxButton[], msgResName: I18nResName, msgResArgs?: any) => Promise<ConfirmBoxButton>
}

function useConfirmBoxComponent(userNotificationStore: ReturnType<typeof useUserNotificationStore>): IConfirmBox {
  const attrCtrlKey = ref('');
  const attrButtons = ref<ConfirmBoxButton[]>([]);
  const attrMsgResName = ref<I18nResName>('');
  const attrMsgResArgs = ref();

  const result = ref<ConfirmBoxButton | ''>('');
  let isOpened = false;
  let completeCallback: ((value: ConfirmBoxButton | PromiseLike<ConfirmBoxButton>) => void) | undefined;

  const { open } = useModal({
    component: ConfirmBox,
    attrs: {
      ctrlKey: attrCtrlKey,
      buttons: attrButtons,
      msgResName: attrMsgResName,
      msgResArgs: attrMsgResArgs,
      setResultCallback: (button: ConfirmBoxButton) => { result.value = button; },
      clickToClose: false,
      escToClose: true,
      onOpened () {
        isOpened = true;
      },
      onClosed () {
        const logger = getCommonServices().getLogger();
        let resultButton = result.value;
        logger.verbose(`(user-confirm-box) closing confirm box: ctrlKey=${attrCtrlKey.value}, buttons=${JSON.stringify(attrButtons.value)}, msgResName=${attrMsgResName.value}, result=${resultButton}`);
        if (!resultButton) {
          logger.warn(`(user-confirm-box) result was not set: ctrlKey=${attrCtrlKey.value}, buttons=${JSON.stringify(attrButtons.value)}, msgResName=${attrMsgResName.value}, result=${resultButton}`);
          userNotificationStore.show({
            level: UserNotificationLevel.ERROR,
            resName: getI18nResName2('appErrors', 'unknown')
          });
          resultButton = 'cancel';
        }
        isOpened = false;
        completeCallback!(resultButton);
        setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
      }
    }
  });

  return {
    confirm: (ctrlKey: string, buttons: ConfirmBoxButton[], msgResName: I18nResName, msgResArgs?: any): Promise<ConfirmBoxButton> => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(user-confirm-box) opening confirm box: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, msgResName=${msgResName}`);
      if (isOpened) {
        logger.warn(`(user-confirm-box) cannot open another confirm box: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, msgResName=${msgResName}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to open modal window', 'error-stub');
      }
      attrCtrlKey.value = ctrlKey;
      attrButtons.value = buttons;
      attrMsgResArgs.value = msgResArgs;
      attrMsgResName.value = msgResName;
      result.value = '';
      completeCallback = undefined;

      return new Promise((resolve) => {
        completeCallback = resolve;
        open();
      });
    }
  };
}

function useConfirmBoxElectron(localizer: (ReturnType<typeof useI18n>)['t'] | undefined): IConfirmBox {
  const dialogsFacade = getDialogsFacade(localizer);

  return {
    confirm: async (ctrlKey: string, buttons: ConfirmBoxButton[], msgResName: I18nResName, msgResArgs?: any): Promise<ConfirmBoxButton> => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(user-confirm-box) opening confirm box: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, msgResName=${msgResName}`);
      const msg = localizer(msgResName, msgResArgs);
      return await dialogsFacade.showConfirmBox(msg, buttons);
    }
  };
}

export function useConfirmBox (): IConfirmBox {
  if(!isElectronBuild()) {
    const userNotificationStore = useUserNotificationStore();
    return useConfirmBoxComponent(userNotificationStore);
  } else {
    const localizer = (useNuxtApp().$i18n as any).t;
    return useConfirmBoxElectron(localizer);
  }
}

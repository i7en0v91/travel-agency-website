import { AppException, AppExceptionCodeEnum, isElectronBuild, type I18nResName } from '@golobe-demo/shared';
import type { ConfirmBoxButton } from './../types';
import { getCommonServices } from '../helpers/service-accessors';
import type { ComponentInstance, Ref } from 'vue';
import { getDialogsFacade } from '../helpers/electron';

interface IModalDialogResult<TResult> {
  show: () => Promise<TResult>
}

function useConfirmBoxElectron(localizer: (ReturnType<typeof useI18n>)['t'] | undefined, buttons: ConfirmBoxButton[], defaultResult: ConfirmBoxButton, msgResName: I18nResName, msgResArgs?: any): IModalDialogResult<ConfirmBoxButton> {
  const dialogsFacade = getDialogsFacade(localizer);

  return {
    show: async (): Promise<ConfirmBoxButton> => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(user-confirm-box) opening confirm box: buttons=${JSON.stringify(buttons)}, msgResName=${msgResName}`);
      const msg = localizer(msgResName, msgResArgs);
      const result = await dialogsFacade.showConfirmBox(msg, buttons);
      return result === 'cancel' ? defaultResult : result;
    }
  };
}

function useConfirmBoxComponent<TResult>(modalRef: Ref<ComponentInstance<any>>, 
  refs: { 
    open: Ref<boolean>, 
    result: Ref<TResult | undefined> 
  },
  defaultResult: TResult
) {
  const result = ref<TResult | undefined>();

  const ctrlKey = modalRef.value.$props.ctrlKey;
  
  return {
    show: (): Promise<TResult> => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(modal-dialog-result) show: ctrlKey=${ctrlKey}`);
      if(refs.open.value) {
        logger.warn(`(modal-dialog-result) cannot open another modal dialog: ctrlKey=${ctrlKey}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to open modal window', 'error-stub');
      }
      result.value = defaultResult;

      return new Promise((resolve) => {
        logger.debug(`(modal-dialog-result) opening modal: ctrlKey=${ctrlKey}`);
        refs.open.value = true;

        const disposeWatch = watch([refs.open, refs.result], () => {
          logger.debug(`(modal-dialog-result) state changed: ctrlKey=${ctrlKey}, open=${refs.open.value}, result=${refs.result.value}`);
          if(!refs.open.value) {
            logger.verbose(`(modal-dialog-result) closed: ctrlKey=${ctrlKey}, open=${refs.open.value}, result=${refs.result.value}`);
            try {
              let modalResult = refs.result.value;
              if(!modalResult) {
                modalResult = defaultResult;
                logger.debug(`(modal-dialog-result) result was not set, default will be used: ctrlKey=${ctrlKey}, open=${refs.open.value}, result=${refs.result.value}`);
              }
              resolve(modalResult);
            } finally {
              disposeWatch();
            }
          }
        });
      });
    }
  };
}

export function useModalDialogResult<TResult> (
  modalRef: Ref<ComponentInstance<any>>, 
  refs: { 
    open: Ref<boolean>, 
    result: Ref<TResult | undefined> 
  },
  defaultResult: TResult
): IModalDialogResult<TResult> {
  return useConfirmBoxComponent(modalRef, refs, defaultResult);
}

export function useConfirmDialogResult(
  modalRef: Ref<ComponentInstance<any>>, 
  refs: { 
    open: Ref<boolean>, 
    result: Ref<ConfirmBoxButton | undefined> 
  },
  buttons: ConfirmBoxButton[],
  defaultResult: ConfirmBoxButton,
  msgResName: I18nResName, 
  msgResArgs?: any
): IModalDialogResult<ConfirmBoxButton> {
  if(!isElectronBuild()) {
    return useConfirmBoxComponent(modalRef, refs, defaultResult);
  } else {
    const localizer = (useNuxtApp().$i18n as any).t;
    return useConfirmBoxElectron(localizer, buttons, defaultResult, msgResName, msgResArgs);
  }
}
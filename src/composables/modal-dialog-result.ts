import { UserNotificationLevel, AppException, AppExceptionCodeEnum, getI18nResName2 } from '@golobe-demo/shared';
import { getCommonServices } from '../helpers/service-accessors';
import type { ComponentInstance, Ref } from 'vue';

interface IModalDialogResult<TResult> {
  show: () => Promise<TResult>
}

export function useModalDialogResult<TResult> (
  modalRef: Ref<ComponentInstance<any>>, 
  refs: { 
    open: Ref<boolean>, 
    result: Ref<TResult | undefined> 
  },
  defaultResult: TResult
): IModalDialogResult<TResult> {
  const userNotificationStore = useUserNotificationStore();

  const result = ref<TResult | undefined>();

  const ctrlKey = modalRef.value.$props.ctrlKey;
  //const buttons = boxRef.value.$props.buttons;
  
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
              const modalResult = refs.result.value;
              if(!modalResult) {
                logger.warn(`(modal-dialog-result) result was not set: ctrlKey=${ctrlKey}, open=${refs.open.value}, result=${refs.result.value}`);
                userNotificationStore.show({
                  level: UserNotificationLevel.ERROR,
                  resName: getI18nResName2('appErrors', 'unknown')
                });
              }
              resolve(modalResult ?? defaultResult);
            } finally {
              disposeWatch();
            }
          }
        });
      });
    }
  };
}
import { UserNotificationLevel, AppException, AppExceptionCodeEnum, getI18nResName2 } from '@golobe-demo/shared';
import { type ConfirmBoxButton } from './../types';
import type ConfirmBox from './../components/confirm-box.vue';
import { getCommonServices } from '../helpers/service-accessors';
import type { ComponentInstance, Ref } from 'vue';

interface IUseConfirmBoxResult {
  confirm: () => Promise<ConfirmBoxButton>
}

export function useConfirmBoxResult (
  boxRef: Ref<ComponentInstance<typeof ConfirmBox>>, 
  refs: { 
    open: Ref<boolean>, 
    result: Ref<ConfirmBoxButton | undefined> 
  } 
): IUseConfirmBoxResult {
  const userNotificationStore = useUserNotificationStore();

  const result = ref<ConfirmBoxButton | ''>('');

  const ctrlKey = boxRef.value.$props.ctrlKey;
  const buttons = boxRef.value.$props.buttons;
  
  return {
    confirm: (): Promise<ConfirmBoxButton> => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(user-confirm-box) confirming: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}`);
      if(refs.open.value) {
        logger.warn(`(user-confirm-box) cannot open another confirm box: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}`);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'failed to open modal window', 'error-stub');
      }
      result.value = 'cancel';

      return new Promise((resolve) => {
        logger.debug(`(user-confirm-box) opening modal: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}`);
        refs.open.value = true;

        const disposeWatch = watch([refs.open, refs.result], () => {
          logger.debug(`(user-confirm-box) state changed: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, open=${refs.open.value}, result=${refs.result.value}`);
          if(!refs.open.value) {
            logger.verbose(`(user-confirm-box) closed: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, open=${refs.open.value}, result=${refs.result.value}`);
            try {
              const modalResult = refs.result.value;
              if(!modalResult) {
                logger.warn(`(user-confirm-box) result was not set: ctrlKey=${ctrlKey}, buttons=${JSON.stringify(buttons)}, open=${refs.open.value}, result=${refs.result.value}`);
                userNotificationStore.show({
                  level: UserNotificationLevel.ERROR,
                  resName: getI18nResName2('appErrors', 'unknown')
                });
              }
              resolve(modalResult ?? 'cancel');
            } finally {
              disposeWatch();
            }
          }
        });
      });
    }
  };
}
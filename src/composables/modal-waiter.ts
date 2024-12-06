import { getCommonServices } from '../helpers/service-accessors';
import type ModalWaitingIndicator from '../components/modal-waiting-indicator.vue';
import type { ComponentInstance, Ref } from 'vue';

export interface IModalWaiter {
  show: (isVisible: boolean) => void
}

export function useModalWaiter (modalWaiterRef: Ref<ComponentInstance<typeof ModalWaitingIndicator>>, openRef: Ref<boolean>): IModalWaiter {
  const ctrlKey = modalWaiterRef.value.$props.ctrlKey; 
  return {
    show: (isVisible: boolean) => {
      const logger = getCommonServices().getLogger();
      logger.verbose(`(modal-waiter) show: ctrlKey=${ctrlKey}, isVisible=${isVisible}, current=${openRef.value}`);
      openRef.value = isVisible;
    }
  };
}
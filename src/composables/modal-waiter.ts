import { getCommonServices } from '../helpers/service-accessors';
import type ModalWaitingIndicator from '../components/forms/modal-waiting-indicator.vue';
import type { ComponentInstance, Ref } from 'vue';

export interface IModalWaiter {
  show: (isVisible: boolean) => void
}

export function useModalWaiter (modalWaiterRef: Ref<ComponentInstance<typeof ModalWaitingIndicator>>, openRef: Ref<boolean>): IModalWaiter {
  const ctrlKey = modalWaiterRef.value.$props.ctrlKey; 
  const logger = getCommonServices().getLogger().addContextProps({ component: 'UseModalWaiter' });
  return {
    show: (isVisible: boolean) => {
      logger.verbose('show', { ctrlKey, isVisible, current: openRef.value });
      openRef.value = isVisible;
    }
  };
}
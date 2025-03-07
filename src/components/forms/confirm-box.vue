<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import type { ConfirmBoxButton } from '../../types';
import { getCommonServices } from '../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  buttons: ConfirmBoxButton[],
  msgResName: I18nResName,
  msgResArgs?: any
}

defineShortcuts({
  escape: {
    usingInput: true,
    handler: () => { 
      const closeResultBtn = buttons.includes('cancel') ? 'cancel' : (buttons.includes('no') ? 'no' : undefined);
      if(!closeResultBtn) {
        logger.debug('ignoring escape btn close, no cancel result is not expected', ctrlKey);
        return;
      }
      setResultAndClose(closeResultBtn);
    }
  },
});

const { ctrlKey, buttons, msgResName, msgResArgs } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'ConfirmBox' });

const open = defineModel<boolean>('open');
const result = defineModel<ConfirmBoxButton | undefined>('result');

function setResultAndClose (value: ConfirmBoxButton | undefined) {
  if (!value) {
    value = 'cancel';
  }
  result.value = value;
  open.value = false;
}

function onClosed () {
  if (!result.value) {
    result.value = 'cancel';
  }
}

function onButtonClick (button: ConfirmBoxButton) {
  logger.verbose('button clicked', { ctrlKey, button });
  setResultAndClose(button);
}

const uiStyling = { 
  container: 'items-center',
  width: 'w-fit',
  height: 'h-auto' 
};

</script>

<template>
  <UModal v-model="open" :ui="uiStyling" @closed="onClosed">
    <ClientOnly>
      <div class="w-full h-auto p-4 sm:p-6">
        <h3 class="font-semibold text-xl mb-2 sm:mb-6">
          {{ $t(msgResName, msgResArgs) }}
        </h3>  
        <div class="flex flex-row flex-wrap justify-end mt-6 gap-2">
          <UButton v-if="buttons.includes('yes')" size="lg" icon="i-heroicons-check" variant="solid" color="primary" @click="() => onButtonClick('yes')">
            {{ $t(getI18nResName2('confirmBox', 'btnYes')) }}
          </UButton>
          <UButton v-if="buttons.includes('no')" size="lg" icon="i-mdi-close" variant="outline" color="gray" @click="() => onButtonClick('no')">
            {{ $t(getI18nResName2('confirmBox', 'btnNo')) }}
          </UButton>
          <UButton v-if="buttons.includes('cancel')" size="lg" icon="mdi-close-circle-outline" variant="outline" color="gray" @click="() => onButtonClick('cancel')">
            {{ $t(getI18nResName2('confirmBox', 'btnCancel')) }}
          </UButton>
        </div>
      </div>
    </ClientOnly>
  </UModal>
</template>

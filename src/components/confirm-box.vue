<script setup lang="ts">
import { type I18nResName, getI18nResName2 } from '@golobe-demo/shared';
import type { ConfirmBoxButton } from './../types';
import { VueFinalModal } from 'vue-final-modal';
import SimpleButton from './forms/simple-button.vue';
import { getCommonServices } from '../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  setResultCallback: (button: ConfirmBoxButton) => void,
  buttons: ConfirmBoxButton[],
  msgResName: I18nResName,
  msgResArgs?: any
}

const { ctrlKey, setResultCallback } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const clickedButton = ref<ConfirmBoxButton>();

const $emit = defineEmits(['update:modelValue']);

function setResultAndClose () {
  if (!clickedButton.value) {
    clickedButton.value = 'cancel';
  }
  setResultCallback(clickedButton.value);
  $emit('update:modelValue', false);
}

function onClosed () {
  if (!clickedButton.value) {
    clickedButton.value = 'cancel';
    setResultCallback(clickedButton.value);
  }
}

function onButtonClick (button: ConfirmBoxButton) {
  logger.verbose(`(ConfirmBox) button clicked: ctrlKey=${ctrlKey}, butotn=${button}`);
  clickedButton.value = button;
  setResultAndClose();
}

</script>

<template>
  <VueFinalModal
    class="modal-window"
    content-class="confirm-box p-xs-3 p-s-4"
    :lock-scroll="false"
    @closed="onClosed"
    @update:model-value="(val: boolean) => $emit('update:modelValue', val)"
  >
    <ClientOnly>
      <div class="confirm-box-msg">
        {{ $t(msgResName, msgResArgs) }}
      </div>
      <div class="confirm-box-buttons mt-xs-4">
        <SimpleButton
          v-if="buttons.includes('yes')"
          :ctrl-key="`${ctrlKey}-btnYes`"
          :label-res-name="getI18nResName2('confirmBox', 'btnYes')"
          kind="support"
          @click="() => onButtonClick('yes')"
        />
        <SimpleButton
          v-if="buttons.includes('no')"
          :ctrl-key="`${ctrlKey}-btnNo`"
          :label-res-name="getI18nResName2('confirmBox', 'btnNo')"
          kind="support"
          @click="() => onButtonClick('no')"
        />
        <SimpleButton
          v-if="buttons.includes('cancel')"
          :ctrl-key="`${ctrlKey}-btnCancel`"
          :label-res-name="getI18nResName2('confirmBox', 'btnCancel')"
          kind="support"
          icon="cross"
          @click="() => onButtonClick('cancel')"
        />
      </div>
    </ClientOnly>
  </VueFinalModal>
</template>

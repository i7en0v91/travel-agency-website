<script setup lang="ts">

import { VueFinalModal } from 'vue-final-modal';
import { type I18nResName, getI18nResName2 } from './../shared/i18n';
import SimpleButton from './forms/simple-button.vue';
import { type ConfirmBoxButton } from './../shared/interfaces';

interface IProps {
  ctrlKey: string,
  setResultCallback: (button: ConfirmBoxButton) => void,
  buttons: ConfirmBoxButton[],
  msgResName: I18nResName,
  msgResArgs?: any
}

const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const clickedButton = shallowRef<ConfirmBoxButton>();

const $emit = defineEmits(['update:modelValue']);

function setResultAndClose () {
  if (!clickedButton.value) {
    clickedButton.value = 'cancel';
  }
  props.setResultCallback(clickedButton.value);
  $emit('update:modelValue', false);
}

function onClosed () {
  if (!clickedButton.value) {
    clickedButton.value = 'cancel';
    props.setResultCallback(clickedButton.value);
  }
}

function onButtonClick (button: ConfirmBoxButton) {
  logger.verbose(`(ConfirmBox) button clicked: ctrlKey=${props.ctrlKey}, butotn=${button}`);
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
        {{ $t(props.msgResName, props.msgResArgs) }}
      </div>
      <div class="confirm-box-buttons mt-xs-4">
        <SimpleButton
          v-if="props.buttons.includes('yes')"
          :ctrl-key="`${props.ctrlKey}-btnYes`"
          :label-res-name="getI18nResName2('confirmBox', 'btnYes')"
          kind="support"
          @click="() => onButtonClick('yes')"
        />
        <SimpleButton
          v-if="props.buttons.includes('no')"
          :ctrl-key="`${props.ctrlKey}-btnNo`"
          :label-res-name="getI18nResName2('confirmBox', 'btnNo')"
          kind="support"
          @click="() => onButtonClick('no')"
        />
        <SimpleButton
          v-if="props.buttons.includes('cancel')"
          :ctrl-key="`${props.ctrlKey}-btnCancel`"
          :label-res-name="getI18nResName2('confirmBox', 'btnCancel')"
          kind="support"
          icon="cross"
          @click="() => onButtonClick('cancel')"
        />
      </div>
    </ClientOnly>
  </VueFinalModal>
</template>

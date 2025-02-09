<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { VueFinalModal } from 'vue-final-modal';
import range from 'lodash-es/range';
import SimpleButton from './../../forms/simple-button.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  setResultCallback: (result: number | 'cancel') => void
}

const { ctrlKey, setResultCallback } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const hoveredScore = ref<number>();

let resultSet = false;

const $emit = defineEmits(['update:modelValue']);

function setResultAndClose (result: number | 'cancel') {
  logger.debug(`(ReviewScorePicker) setResultAndClose, ctrlKey=${ctrlKey}, resultSet=${resultSet}`);
  if (!resultSet) {
    resultSet = true;
    setResultCallback(result);
  }
  $emit('update:modelValue', false);
}

function onClosed () {
  logger.debug(`(ReviewScorePicker) onClosed, ctrlKey=${ctrlKey}, resultSet=${resultSet}`);
  if (!resultSet) {
    resultSet = true;
    setResultCallback('cancel');
    $emit('update:modelValue', false);
  }
}

function onPickerItemHovered (score: number) {
  logger.debug(`(ReviewScorePicker) picker item hovered, ctrlKey=${ctrlKey}, score=${score}`);
  hoveredScore.value = score;
}

function onPickerItemUnhovered () {
  logger.debug(`(ReviewScorePicker) picker item unhovered, ctrlKey=${ctrlKey}`);
  hoveredScore.value = 0;
}

function onPickerItemClicked (score: number) {
  logger.debug(`(ReviewScorePicker) picker item clicked, ctrlKey=${ctrlKey}, score=${score}`);
  setResultAndClose(score);
}

</script>

<template>
  <VueFinalModal
    class="modal-window"
    content-class="review-score-picker p-xs-3 p-s-4"
    :lock-scroll="false"
    :click-to-close="false"
    :esc-to-close="true"
    @closed="onClosed"
    @update:model-value="(val: boolean) => $emit('update:modelValue', val)"
  >
    <ClientOnly>
      <h2 class="review-score-picker-title mt-xs-3 mt-s-4">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'scorePickerTitle')) }}
      </h2>
      <div class="review-score-picker-div my-xs-5">
        <div
          v-for="(i) in range(0, 5)"
          :key="`${ctrlKey}-ScorePickerItem-${i}`"
          :class="`review-score-picker-item ${ hoveredScore ? (i < hoveredScore ? 'highlight' : '') : '' }`"
          :data-score="i"
          @mouseover="() => { onPickerItemHovered(i + 1); }"
          @mouseleave="() => { onPickerItemUnhovered(); }"
          @click="() => { onPickerItemClicked(i + 1); }"
        />
      </div>
      <SimpleButton
        :ctrl-key="`${ctrlKey}-btnCancel`"
        :label-res-name="getI18nResName2('confirmBox', 'btnCancel')"
        kind="support"
        icon="cross"
        class="review-score-picker-cancel-btn"
        @click="() => setResultAndClose('cancel')"
      />
    </ClientOnly>
  </VueFinalModal>
</template>

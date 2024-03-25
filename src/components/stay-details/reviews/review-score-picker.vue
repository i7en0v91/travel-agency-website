<script setup lang="ts">

import { VueFinalModal } from 'vue-final-modal';
import range from 'lodash-es/range';
import { type I18nResName, getI18nResName2, getI18nResName3 } from './../../../shared/i18n';
import SimpleButton from './../../forms/simple-button.vue';
import { type ConfirmBoxButton } from './../../../shared/interfaces';
import { getLocalizeableValue } from './../../../shared/common';
import { type Locale } from './../../../shared/constants';

interface IProps {
  ctrlKey: string,
  setResultCallback: (result: number | 'cancel') => void
}

const { locale } = useI18n();

const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const hoveredScore = ref<number>();

const htmlRatingItems = ref<InstanceType<typeof HTMLElement>[]>();

let resultSet = false;

const $emit = defineEmits(['update:modelValue']);

function setResultAndClose (result: number | 'cancel') {
  logger.debug(`(ReviewScorePicker) setResultAndClose, ctrlKey=${props.ctrlKey}, resultSet=${resultSet}`);
  if (!resultSet) {
    resultSet = true;
    props.setResultCallback(result);
  }
  $emit('update:modelValue', false);
}

function onClosed () {
  logger.debug(`(ReviewScorePicker) onClosed, ctrlKey=${props.ctrlKey}, resultSet=${resultSet}`);
  if (!resultSet) {
    resultSet = true;
    props.setResultCallback('cancel');
    $emit('update:modelValue', false);
  }
}

function onPickerItemHovered (score: number) {
  logger.debug(`(ReviewScorePicker) picker item hovered, ctrlKey=${props.ctrlKey}, score=${score}`);
  hoveredScore.value = score;
}

function onPickerItemUnhovered () {
  logger.debug(`(ReviewScorePicker) picker item unhovered, ctrlKey=${props.ctrlKey}`);
  hoveredScore.value = 0;
}

function onPickerItemClicked (score: number) {
  logger.debug(`(ReviewScorePicker) picker item clicked, ctrlKey=${props.ctrlKey}, score=${score}`);
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
      <div class="review-score-picker-title mt-xs-3 mt-s-4" role="heading" aria-level="3">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'scorePickerTitle')) }}
      </div>
      <div class="review-score-picker-div my-xs-5">
        <div
          v-for="(i) in range(0, 5)"
          :key="`${$props.ctrlKey}-ScorePickerItem-${i}`"
          ref="htmlRatingItems"
          :class="`review-score-picker-item ${ hoveredScore ? (i < hoveredScore ? 'highlight' : '') : '' }`"
          :data-score="i"
          @mouseover="() => { onPickerItemHovered(i + 1); }"
          @mouseleave="() => { onPickerItemUnhovered(); }"
          @click="() => { onPickerItemClicked(i + 1); }"
        />
      </div>
      <SimpleButton
        :ctrl-key="`${props.ctrlKey}-btnCancel`"
        :label-res-name="getI18nResName2('confirmBox', 'btnCancel')"
        kind="support"
        icon="cross"
        class="review-score-picker-cancel-btn"
        @click="() => setResultAndClose('cancel')"
      />
    </ClientOnly>
  </VueFinalModal>
</template>

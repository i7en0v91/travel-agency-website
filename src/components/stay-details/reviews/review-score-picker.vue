<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import range from 'lodash-es/range';
import { getCommonServices } from '../../../helpers/service-accessors';
import StarSvg from '~/public/img/star.svg';

interface IProps {
  ctrlKey: string
}

const { ctrlKey } = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const hoveredScore = ref<number>();

const result = defineModel<number | 'cancel'>('result');
const open = defineModel<boolean>('open');

defineShortcuts({
  escape: {
    usingInput: true,
    handler: () => { 
      setResultAndClose('cancel');
    }
  },
});

function setResultAndClose (value: number | 'cancel') {
  logger.debug(`(ReviewScorePicker) setResultAndClose, ctrlKey=${ctrlKey}, resultSet=${value}`);
  if (!value) {
    value = 'cancel';
  }
  result.value = value;
  open.value = false;
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

function onClosed () {
  if (!result.value) {
    result.value = 'cancel';
  }
}

const uiStyling = { 
  container: 'items-center',
  width: 'w-fit',
  height: 'h-auto' 
};

</script>

<template>
  <UModal v-model="open" :ui="uiStyling" @closed="onClosed">
    <div class="w-full max-w-[80vw] overflow-x-hidden h-auto p-4 sm:p-6">
      <h2 class="w-full h-auto text-center whitespace-normal font-semibold text-xl">
        {{ $t(getI18nResName3('stayDetailsPage', 'reviews', 'scorePickerTitle')) }}
      </h2>
      <div class="w-full h-auto flex flex-row flex-nowrap items-center justify-center gap-2 sm:gap-4 my-8">
        <StarSvg
          v-for="(i) in range(0, 5)"
          :key="`${ctrlKey}-ScorePickerItem-${i}`"
          :class="`block !w-[50px] !h-[50px] sm:!w-[70px] sm:!h-[70px] flex-initial cursor-pointer ${ hoveredScore ? (i < hoveredScore ? '' : 'grayscale') : 'grayscale' }`"
          :data-score="i"
          filled
          @mouseover="() => { onPickerItemHovered(i + 1); }"
          @mouseleave="() => { onPickerItemUnhovered(); }"
          @click="() => { onPickerItemClicked(i + 1); }"
        />
      </div>
      <div class="w-full h-auto flex flex-row justify-center mt-5">
        <UButton size="lg" icon="i-mdi-close" variant="outline" color="gray" @click="() => setResultAndClose('cancel')">
          {{ $t(getI18nResName2('confirmBox', 'btnCancel')) }}
        </UButton>
      </div>
    </div>
  </UModal>
</template>

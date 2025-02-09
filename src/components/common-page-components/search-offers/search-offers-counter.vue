<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const { ctrlKey, minValue, maxValue } = defineProps<IProps>();
const modelRef = defineModel<number | null | undefined>('value');

const btnDecrement = useTemplateRef('btn-decrement');
const btnIncrement = useTemplateRef('btn-increment');
const hasMounted = ref(false);

const logger = getCommonServices().getLogger();

const displayText = computed(() => {
  return hasMounted.value ? modelRef.value : '';
});

function onIncrementClick () {
  logger.debug(`(SearchOffersCounter) increment clicked: ctrlKey=${ctrlKey}, value=${modelRef.value}`);
  const updatedValue = modelRef.value! + 1;
  if (updatedValue > maxValue) {
    return;
  }
  if (updatedValue === maxValue) {
    logger.debug(`(SearchOffersCounter) disabling increment btn: ctrlKey=${ctrlKey}, max=${maxValue}`);
    btnIncrement.value?.$el.blur();
  }
  modelRef.value = updatedValue;
}

function onDecrementClick () {
  logger.debug(`(SearchOffersCounter) decrement clicked: ctrlKey=${ctrlKey}, value=${modelRef.value}`);
  const updatedValue = modelRef.value! - 1;
  if (updatedValue < minValue) {
    return;
  }
  if (updatedValue === minValue) {
    logger.debug(`(SearchOffersCounter) disabling decrement btn: ctrlKey=${ctrlKey}, min=${minValue}`);
    btnDecrement.value?.$el.blur();
  }
  modelRef.value = updatedValue;
}

onMounted(() => {
  hasMounted.value = true;
});

</script>

<template>
  <div class="text-sm sm:text-base w-full flex flex-row flex-nowrap items-center gap-[32px]">
    <div class="w-full min-w-[100px] text-gray-500 dark:text-gray-400 font-medium">
      {{ $t(labelResName) }}
    </div>
    <div class="flex flex-row flex-nowrap items-center">
      <UButton
        ref="btn-decrement"
        icon="i-ion-remove-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="modelRef! <= minValue"
        @click="onDecrementClick"
      />
      <div class="min-w-[20px] text-center">
        {{ displayText }}
      </div>
      <UButton
        ref="btn-increment"
        icon="i-ion-add-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="modelRef! >= maxValue"
        @click="onIncrementClick"
      />
    </div>
  </div>
</template>

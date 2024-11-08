<script setup lang="ts">
import { type I18nResName } from '@golobe-demo/shared';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const props = defineProps<IProps>();

const btnDecrement = shallowRef();
const btnIncrement = shallowRef();
const hasMounted = ref(false);

const logger = getCommonServices().getLogger();
const modelRef = defineModel<number | null | undefined>('value');

const displayText = computed(() => {
  return hasMounted.value ? modelRef.value : '';
});

function onIncrementClick () {
  logger.debug(`(SearchOffersCounter) increment clicked: ctrlKey=${props.ctrlKey}, value=${modelRef.value}`);
  const updatedValue = modelRef.value! + 1;
  if (updatedValue > props.maxValue) {
    return;
  }
  if (updatedValue === props.maxValue) {
    logger.debug(`(SearchOffersCounter) disabling increment btn: ctrlKey=${props.ctrlKey}, max=${props.maxValue}`);
    btnIncrement.value?.$el.blur();
  }
  modelRef.value = updatedValue;
}

function onDecrementClick () {
  logger.debug(`(SearchOffersCounter) decrement clicked: ctrlKey=${props.ctrlKey}, value=${modelRef.value}`);
  const updatedValue = modelRef.value! - 1;
  if (updatedValue < props.minValue) {
    return;
  }
  if (updatedValue === props.minValue) {
    logger.debug(`(SearchOffersCounter) disabling decrement btn: ctrlKey=${props.ctrlKey}, min=${props.minValue}`);
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
      {{ $t(props.labelResName) }}
    </div>
    <div class="flex flex-row flex-nowrap items-center">
      <UButton
        ref="btnDecrement"
        icon="i-ion-remove-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="modelRef! <= props.minValue"
        @click="onDecrementClick"
      />
      <div class="min-w-[20px] text-center">
        {{ displayText }}
      </div>
      <UButton
        ref="btnIncrement"
        icon="i-ion-add-circle"
        size="sm"
        color="gray"
        variant="soft"
        class="ring-0 text-gray-500 dark:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400  bg-transparent hover:bg-gray-100 disabled:bg-transparent aria-disabled:bg-transparent dark:bg-transparent dark:hover:bg-gray-950 dark:disabled:!bg-transparent dark:aria-disabled:!bg-transparent"
        :disabled="modelRef! >= props.maxValue"
        @click="onIncrementClick"
      />
    </div>
  </div>
</template>

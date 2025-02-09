<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import SimpleButton from './../../forms/simple-button.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  value?: number,
  defaultValue: number,
  initiallySelectedValue?: number | null | undefined,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const { ctrlKey, value, defaultValue, initiallySelectedValue, minValue, maxValue } = defineProps<IProps>();

const btnDecrement = useTemplateRef('btn-decrement');
const btnIncrement = useTemplateRef('btn-increment');
const hasMounted = ref(false);

const logger = getCommonServices().getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<number>(ctrlKey, defaultValue, true);
if (initiallySelectedValue) {
  controlValueSetting.value = initiallySelectedValue;
} else if (initiallySelectedValue === null) {
  controlValueSetting.value = defaultValue;
}
const currentValue = ref<number | undefined>();

const $emit = defineEmits<{(event: 'update:value', value: number): void}>();

const displayText = computed(() => {
  return hasMounted.value ? (value ?? defaultValue) : '';
});

function fireValueChanged () {
  logger.debug(`(SearchOffersCounter) value changed: ctrlKey=${ctrlKey}, value=${currentValue.value}`);
  controlValueSetting.value = currentValue.value;
  $emit('update:value', currentValue.value!);
}

function onIncrementClick () {
  const updatedValue = value! + 1;
  if (updatedValue > maxValue) {
    return;
  }
  if ((updatedValue === maxValue) || (updatedValue === 2)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === maxValue) {
    btnIncrement.value?.$el.blur();
  }
  currentValue.value = updatedValue;
  fireValueChanged();
}

function onDecrementClick () {
  const updatedValue = value! - 1;
  if (updatedValue < minValue) {
    return;
  }
  if ((updatedValue === minValue) || (updatedValue === maxValue - 1)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === minValue) {
    btnDecrement.value?.$el.blur();
  }
  currentValue.value = updatedValue;
  fireValueChanged();
}

onBeforeMount(() => {
  if (controlValueSetting.value) {
    currentValue.value = controlValueSetting.value!;
  }
});
onMounted(() => {
  hasMounted.value = true;
  fireValueChanged();
});

</script>

<template>
  <div class="search-offers-counter">
    <ClientOnly>
      <div class="search-offers-counter-caption">
        {{ $t(labelResName) }}
      </div>
      <div class="search-offers-counter-controls">
        <SimpleButton
          ref="btn-decrement"
          class="search-offers-counter-btn mr-xs-2"
          :ctrl-key="`${ctrlKey}-BtnDecrement`"
          kind="icon"
          icon="decrement"
          :enabled="(value ?? defaultValue) > minValue"
          @click="onDecrementClick"
        />
        <div class="search-offers-counter-value">
          {{ displayText }}
        </div>
        <SimpleButton
          ref="btn-increment"
          class="search-offers-counter-btn ml-xs-2"
          :ctrl-key="`${ctrlKey}-BtnIncrement`"
          kind="icon"
          icon="increment"
          :enabled="(value ?? defaultValue) < maxValue"
          @click="onIncrementClick"
        />
      </div>
    </ClientOnly>
  </div>
</template>

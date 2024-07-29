<script setup lang="ts">
import { updateTabIndices } from './../../../shared/dom';
import { type I18nResName } from './../../../shared/i18n';
import SimpleButton from './../../forms/simple-button.vue';
import { TabIndicesUpdateDefaultTimeout } from './../../../shared/constants';
import { type ComponentInstance } from 'vue';

interface IProps {
  ctrlKey: string,
  value?: number,
  defaultValue: number,
  initiallySelectedValue?: number | null | undefined,
  minValue: number,
  maxValue: number,
  labelResName: I18nResName
}

const props = withDefaults(defineProps<IProps>(), {
  value: undefined,
  initiallySelectedValue: undefined
});

const btnDecrement = shallowRef<ComponentInstance<typeof SimpleButton>>();
const btnIncrement = shallowRef<ComponentInstance<typeof SimpleButton>>();
const hasMounted = ref(false);

const logger = CommonServicesLocator.getLogger();

const controlSettingsStore = useControlSettingsStore();
const controlValueSetting = controlSettingsStore.getControlValueSetting<number>(props.ctrlKey, props.defaultValue, true);
if (props.initiallySelectedValue) {
  controlValueSetting.value = props.initiallySelectedValue;
} else if (props.initiallySelectedValue === null) {
  controlValueSetting.value = props.defaultValue;
}
const currentValue = ref<number | undefined>();

const $emit = defineEmits<{(event: 'update:value', value: number): void}>();

const displayText = computed(() => {
  return hasMounted.value ? (props.value ?? props.defaultValue) : '';
});

function fireValueChanged () {
  logger.debug(`(SearchOffersCounter) value changed: ctrlKey=${props.ctrlKey}, value=${currentValue.value}`);
  controlValueSetting.value = currentValue.value;
  $emit('update:value', currentValue.value!);
}

function onIncrementClick () {
  const updatedValue = props.value! + 1;
  if (updatedValue > props.maxValue) {
    return;
  }
  if ((updatedValue === props.maxValue) || (updatedValue === 2)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === props.maxValue) {
    btnIncrement.value?.$el.blur();
  }
  currentValue.value = updatedValue;
  fireValueChanged();
}

function onDecrementClick () {
  const updatedValue = props.value! - 1;
  if (updatedValue < props.minValue) {
    return;
  }
  if ((updatedValue === props.minValue) || (updatedValue === props.maxValue - 1)) {
    setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  }
  if (updatedValue === props.minValue) {
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
        {{ $t(props.labelResName) }}
      </div>
      <div class="search-offers-counter-controls">
        <SimpleButton
          ref="btnDecrement"
          class="search-offers-counter-btn mr-xs-2"
          :ctrl-key="`${ctrlKey}-BtnDecrement`"
          kind="icon"
          icon="decrement"
          :enabled="(props.value ?? props.defaultValue) > props.minValue"
          @click="onDecrementClick"
        />
        <div class="search-offers-counter-value">
          {{ displayText }}
        </div>
        <SimpleButton
          ref="btnIncrement"
          class="search-offers-counter-btn ml-xs-2"
          :ctrl-key="`${ctrlKey}-BtnIncrement`"
          kind="icon"
          icon="increment"
          :enabled="(props.value ?? props.defaultValue) < props.maxValue"
          @click="onIncrementClick"
        />
      </div>
    </ClientOnly>
  </div>
</template>

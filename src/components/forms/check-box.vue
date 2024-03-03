<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';

const elInput = ref<HTMLInputElement>();

interface IProps {
  ctrlKey: string,
  labelResName?: I18nResName,
  value: string | boolean,
  modelValue: any,
  trueValue?: any,
  falseValue?: any,
  tabbableGroupId?: string
}
const props = withDefaults(defineProps<IProps>(), {
  trueValue: true,
  falseValue: false,
  labelResName: undefined,
  tabbableGroupId: undefined
});

const isChecked = computed(() => {
  if (props.modelValue instanceof Array) {
    return props.modelValue.includes(props.value);
  }
  return props.modelValue === props.trueValue;
});

const $emit = defineEmits(['update:modelValue']);

function updateInput () {
  const isChecked = elInput.value!.checked;
  if (props.modelValue instanceof Array) {
    const newValue = [...props.modelValue];
    if (isChecked) {
      newValue.push(props.value);
    } else {
      newValue.splice(newValue.indexOf(props.value), 1);
    }
    $emit('update:modelValue', newValue);
  } else {
    $emit('update:modelValue', isChecked ? props.trueValue : props.falseValue);
  }
}

function onKeypress () {
  elInput.value!.checked = !elInput.value!.checked;
  updateInput();
}

const htmlId = useId();

</script>

<template>
  <div :class="`checkbox brdr-1 ${tabbableGroupId ? `tabbable-group-${tabbableGroupId}` : ''}`" role="checkbox" :aria-checked="isChecked" @keyup.space="onKeypress" @keyup.enter="onKeypress">
    <div :class="`checkbox-checkmark brdr-1`" @click="onKeypress">
      <span :class="isChecked ? 'checkmark-checked' : 'checkmark-unchecked'" />
    </div>
    <input
      :id="htmlId"
      ref="elInput"
      class="checkbox-input-val"
      type="checkbox"
      :checked="isChecked"
      :value="isChecked ? value : ''"
      @change="updateInput"
    >
    <div v-if="labelResName" :for="htmlId">
      {{ $t(labelResName) }}
    </div>
    <div v-else>
      <slot />
    </div>
  </div>
</template>

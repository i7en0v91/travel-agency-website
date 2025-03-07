<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';

const inputField = useTemplateRef<HTMLInputElement>('input-field');

interface IProps {
  ctrlKey: ControlKey,
  labelResName?: I18nResName,
  value: string | boolean,
  modelValue: any,
  trueValue?: any,
  falseValue?: any,
  tabbableGroupId?: string
}
const { modelValue, value, falseValue = false, trueValue = true } = defineProps<IProps>();

const isChecked = computed(() => {
  if (modelValue instanceof Array) {
    return modelValue.includes(value);
  }
  return modelValue === trueValue;
});

const $emit = defineEmits(['update:modelValue']);

function updateInput () {
  const isChecked = inputField.value!.checked;
  if (modelValue instanceof Array) {
    const newValue = [...modelValue];
    if (isChecked) {
      newValue.push(value);
    } else {
      newValue.splice(newValue.indexOf(value), 1);
    }
    $emit('update:modelValue', newValue);
  } else {
    $emit('update:modelValue', isChecked ? trueValue : falseValue);
  }
}

function onKeypress () {
  inputField.value!.checked = !inputField.value!.checked;
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
      ref="input-field"
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

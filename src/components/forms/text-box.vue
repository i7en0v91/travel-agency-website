<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';
import FieldFrame from './field-frame.vue';

const { t } = useI18n();

interface IProps {
  ctrlKey: string,
  captionResName?: I18nResName,
  placeholderResName?: I18nResName,
  type?: string,
  modelValue?: string,
  maxLength?: number
}
withDefaults(defineProps<IProps>(), {
  type: 'text',
  modelValue: undefined,
  maxLength: 256,
  captionResName: undefined,
  placeholderResName: undefined
});

const $emit = defineEmits(['update:modelValue']);

</script>

<template>
  <FieldFrame :text-res-name="captionResName">
    <input
      :type="type"
      class="input-field p-xs-1 brdr-1"
      :placeholder="placeholderResName ? t(placeholderResName) : ''"
      :value="modelValue"
      :maxLength="256"
      :autocomplete="type === 'password' ? 'on' : 'off'"
      @input="(e: Event) => { $emit('update:modelValue', (e.target as HTMLInputElement).value); }"
    >
  </FieldFrame>
</template>

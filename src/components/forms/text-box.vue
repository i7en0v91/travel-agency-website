<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { I18nResName } from '@golobe-demo/shared';
import FieldFrame from './field-frame.vue';

const { t } = useI18n();

interface IProps {
  ctrlKey: ControlKey,
  captionResName?: I18nResName,
  placeholderResName?: I18nResName,
  type?: string,
  modelValue?: string,
  maxLength?: number
}
const { maxLength = 256, type = 'text' } = defineProps<IProps>();

const $emit = defineEmits(['update:modelValue']);
const htmlId = useId();

</script>

<template>
  <FieldFrame :text-res-name="captionResName" :input-html-id="htmlId">
    <input
      :id="htmlId"
      :type="type"
      class="input-field p-xs-1 brdr-1"
      :placeholder="placeholderResName ? t(placeholderResName) : ''"
      :value="modelValue"
      :maxLength="maxLength"
      :autocomplete="type === 'password' ? 'on' : 'off'"
      @input="(e: Event) => { $emit('update:modelValue', (e.target as HTMLInputElement).value); }"
    >
  </FieldFrame>
</template>

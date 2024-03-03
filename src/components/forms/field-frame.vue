<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';

const { t } = useI18n();

interface IProps {
  textResName?: I18nResName,
  inputHtmlId?: string
}

withDefaults(defineProps<IProps>(), {
  textResName: undefined,
  inputHtmlId: undefined
});

</script>

<template>
  <div class="field-frame brdr-1">
    <label v-if="textResName" :for="inputHtmlId" class="field-frame-label px-xs-1">
      {{ t(textResName) }}
    </label>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { I18nResName } from '@golobe-demo/shared';

const { t } = useI18n();

interface IProps {
  textResName?: I18nResName,
  inputHtmlId?: string
}
defineProps<IProps>();

</script>

<template>
  <div class="field-frame brdr-1">
    <label v-if="textResName" :for="inputHtmlId" class="field-frame-label px-xs-1">
      {{ t(textResName) }}
    </label>
    <slot />
  </div>
</template>

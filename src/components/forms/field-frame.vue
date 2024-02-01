<script setup lang="ts">

import { type I18nResName } from './../../shared/i18n';

const { t } = useI18n();

interface IProps {
  textResName?: I18nResName
}
defineProps<IProps>();

</script>

<template>
  <div class="field-frame brdr-1">
    <div v-if="textResName" class="field-frame-label px-xs-1">
      {{ t(textResName) }}
    </div>
    <slot />
  </div>
</template>

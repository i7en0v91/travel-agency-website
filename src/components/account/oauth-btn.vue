<script setup lang="ts">
import  { AuthProvider, type I18nResName } from '@golobe-demo/shared';

interface IProps {
  ctrlKey: string,
  provider: AuthProvider,
  ariaLabelResName?: I18nResName,
  enabled: boolean
}
const props = withDefaults(defineProps<IProps>(), { ariaLabelResName: undefined });

const $emit = defineEmits(['click']);
function onClick () {
  if (!props.enabled) {
    return;
  }

  $emit('click');
}

let iconName = 'grommet-icons-settings-option';
switch(props.provider) {
  case AuthProvider.GitHub:
    iconName = 'logos-github-icon';
    break;    
  case AuthProvider.Google:
    iconName = 'logos-google-icon';
    break;
}

const uiStyling = {
  base: `py-4 w-[100px] h-auto *:mx-auto ${props.provider === AuthProvider.GitHub ? 'dark:*:invert' : ''}`
};

</script>

<template>
  <UButton :ui="uiStyling" size="xl" :icon="iconName" :disabled="!enabled" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''" variant="outline" @click="onClick"/>
</template>

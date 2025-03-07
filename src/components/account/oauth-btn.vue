<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import { AuthProvider, type I18nResName } from '@golobe-demo/shared';
import { LocatorClasses } from '../../helpers/constants';

interface IProps {
  ctrlKey: ControlKey,
  provider: AuthProvider,
  ariaLabelResName?: I18nResName,
  ui?: string,
  enabled: boolean
}
const { enabled, provider, ui } = defineProps<IProps>();

const $emit = defineEmits(['click']);
function onClick () {
  if (!enabled) {
    return;
  }

  $emit('click');
}

let iconName = 'grommet-icons-settings-option';
switch(provider) {
  case AuthProvider.GitHub:
    iconName = 'logos-github-icon';
    break;    
  case AuthProvider.Google:
    iconName = 'logos-google-icon';
    break;
}

const uiStyling = {
  base: `py-4 w-full h-auto *:mx-auto ${provider === AuthProvider.GitHub ? 'dark:*:invert' : ''} ${ui ?? ''} ${provider === AuthProvider.TestLocal ? LocatorClasses.TestLocalOAuthBtn : ''}`
};

</script>

<template>
  <UButton :ui="uiStyling" size="xl" :icon="iconName" :disabled="!enabled" :aria-label="ariaLabelResName ? $t(ariaLabelResName) : ''" variant="outline" @click="onClick"/>
</template>

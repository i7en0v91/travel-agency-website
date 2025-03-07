<script setup lang="ts">
import { toShortForm, type ControlKey } from './../../helpers/components';
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, SessionLocaleKey } from '@golobe-demo/shared';
import { getCommonServices } from './../../helpers/service-accessors';
import { LocatorClasses } from './../../helpers/constants';
import isString from 'lodash-es/isString';
import set from 'lodash-es/set';
import { withQuery } from 'ufo';
import { usePreviewState } from './../../composables/preview-state';

const switchLocalePath = useSwitchLocalePath();
const { locale, locales } = useI18n();
const { enabled } = usePreviewState();

interface IProps {
  ctrlKey: ControlKey
}
const { ctrlKey } = defineProps<IProps>();
const dropdownOpen = ref(false);

const logger = getCommonServices().getLogger().addContextProps({ component: 'LocaleSwitcher' });

type LocaleObject = {
  code: string,
  name: string
};
const availableLocales = locales.value.filter(l => !isString(l)).map(l => l as LocaleObject);
const items = computed(() => {
  return [availableLocales.map((l) => {
    return {
      label: l.name,
      to: withQuery(switchLocalePath(l.code), enabled ? (set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : {}),
      click: switchClicked
    };
  })];
});

const $emit = defineEmits(['changed']);

if (import.meta.client) {
  watch(locale, () => {
    const newLocale = locale.value;
    const oldLocale = localStorage.getItem(SessionLocaleKey) as string;
    if (oldLocale !== newLocale) {
      localStorage.setItem(SessionLocaleKey, locale.value.toString());
    }
  });

  watch(dropdownOpen, () => {
    logger.debug('dropdown opened state changed', { ctrlKey, open: dropdownOpen.value });
    switchClicked();
  });
}

function switchClicked () {
  $emit('changed');
}

</script>


<template>
  <UDropdown
    v-model:open="dropdownOpen"
    :items="items"
    :popper="{ placement: 'bottom-start' }"
  >
    <UButton :label="locale.toUpperCase()" square color="gray" :class="LocatorClasses.LocaleToggler"/> 
  </UDropdown>
</template>

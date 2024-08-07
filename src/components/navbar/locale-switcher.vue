<script setup lang="ts">
import type { Dropdown } from 'floating-vue';
import { QueryPagePreviewModeParam, PreviewModeParamEnabledValue, SessionLocaleKey, TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import { updateTabIndices } from './../../shared/dom';
import isString from 'lodash-es/isString';
import set from 'lodash-es/set';
import { withQuery } from 'ufo';
import { usePreviewState } from './../../composables/preview-state';

type LocaleObject = {
  code: string,
  name: string
};

const switchLocalePath = useSwitchLocalePath();
const { locale, locales } = useI18n();
const { enabled } = usePreviewState();

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

if (import.meta.client) {
  watch(locale, () => {
    const newLocale = locale.value;
    const oldLocale = localStorage.getItem(SessionLocaleKey) as string;
    if (oldLocale !== newLocale) {
      localStorage.setItem(SessionLocaleKey, locale.value.toString());
    }
  });
}

const availableLocales = locales.value.filter(l => !isString(l)).map(l => l as LocaleObject);
const elBtn = shallowRef<HTMLElement>();
const dropdown = shallowRef<InstanceType<typeof Dropdown>>();

function onMenuShown () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function onMenuHide () {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

function switchClicked () {
  hideDropdown();
  $emit('changed');
}

function hideDropdown () {
  dropdown.value?.hide();
}

const $emit = defineEmits(['changed']);

</script>

<template>
  <div class="nav-item locale-switcher-nav-item" @keyup.escape="hideDropdown">
    <VDropdown
      ref="dropdown"
      v-floating-vue-hydration="{ tabIndex: 0 }"
      :ctrl-key="`${ctrlKey}-DropDownWrapper`"
      :aria-id="`${ctrlKey}-DropDownWrapper`"
      :distance="6"
      :hide-triggers="(triggers: any) => [...triggers, 'click']"
      placement="bottom"
      :flip="false"
      :boundary="elBtn"
      theme="default-dropdown"
      @apply-show="onMenuShown"
      @apply-hide="onMenuHide"
    >
      <button :id="`nav-locale-switcher-${ctrlKey}`" ref="elBtn" class="locale-switcher-btn brdr-1 px-xs-1" type="button" @keyup.escape="hideDropdown">
        {{ locale.toUpperCase() }}
      </button>
      <template #popper>
        <ul class="dropdown-list locale-switcher-list" :data-popper-anchor="`nav-locale-switcher-${ctrlKey}`">
          <li v-for="l in availableLocales" :key="l.code" class="dropdown-list-item pl-xs-2 pr-xs-3">
            <NuxtLink :id="`locale-switch-link-${l.code!.toLowerCase()}`" :to="withQuery(switchLocalePath(l.code), enabled ? (set({}, QueryPagePreviewModeParam, PreviewModeParamEnabledValue)) : {})" class="nav-link locale-switcher-link brdr-1" @click="switchClicked">
              {{ l.name }}
            </NuxtLink>
          </li>
        </ul>
      </template>
    </VDropdown>
  </div>
</template>

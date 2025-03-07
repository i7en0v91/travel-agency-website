<script setup lang="ts">
import type { ControlKey } from './../../helpers/components';
import type { Locale, I18nResName } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';
import { getCommonServices } from '../../helpers/service-accessors';

const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

interface IProps {
  ctrlKey: ControlKey,
  to: string,
  textResName: I18nResName,
  icon?: string,
  linkClass?: string,
  isActive?: boolean,
  hardLink: boolean
}
const { ctrlKey, linkClass, icon, isActive = false } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'NavLink' });

function getClass (): string {
  if (!icon) {
    return `nav-link brdr-1 ${linkClass ?? ''}`;
  }
  return `nav-link nav-link-icon nav-icon-common nav-link-icon-${icon} brdr-1  ${linkClass ?? ''}`;
}

function onClick () {
  logger.debug('on click', ctrlKey);
  $emit('click');
}

const $emit = defineEmits(['click']);

</script>

<template>
  <div :class="`nav-page-link-cell ${isActive ? 'active' : ''}`">
    <div class="nav-item nav-page-link mx-l-2 my-xs-2 py-l-2 my-l-0">
      <NuxtLink :class="getClass()" :to="navLinkBuilder.buildLink(to, locale as Locale)" :external="hardLink" @click="onClick">
        {{ $t(textResName) }}
      </NuxtLink>
    </div>
  </div>
</template>

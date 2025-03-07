<script setup lang="ts">
import { lookupPageByUrl } from '@golobe-demo/shared';
import PageSection from './../../components/common-page-components/page-section.vue';
import type { ControlKey } from '../../helpers/components';

interface IProps {
  btnLabel?: string,
  linkUrl?: string,
  padded?: boolean,
  spaced?: boolean,
  centered?: boolean
};
const { btnLabel, padded = true, spaced = true, centered = false } = defineProps<IProps>();

const route = useRoute();
const currentPage = lookupPageByUrl(route.path)!;
const ctrlKey: ControlKey = [currentPage, 'MdcContentSection'];

</script>

<template>
  <PageSection
    :ctrl-key="ctrlKey"
    :btn-label="btnLabel"
    :padded="padded"
    :spaced="spaced"
    :centered="centered"
    :link-url="linkUrl"
    >
    <template #header>
      <slot name="header"/>
    </template>

    <template #subtext>
      <slot name="subtext"/>
    </template>

    <div v-if="centered" class="flex flex-row flex-wrap justify-between *:flex-1 *:mx-auto gap-[24px]">
      <slot />
    </div>
    <slot v-else />
  </PageSection>
</template>

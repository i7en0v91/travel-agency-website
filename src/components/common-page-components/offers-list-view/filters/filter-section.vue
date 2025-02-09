<script setup lang="ts">
import { getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { SearchOffersFilterTabGroupId } from './../../../../helpers/constants';
import CollapsableSection from './../../../collapsable-section.vue';

interface IProps {
  ctrlKey: string,
  captionResName: I18nResName,
  showNoResultsStub: boolean
}

const { ctrlKey, captionResName } = defineProps<IProps>();

const isCollapsed = ref(false);

</script>

<template>
  <div class="filter-section pb-xs-5 mr-m-3 mt-xs-5">
    <CollapsableSection v-model:collapsed="isCollapsed" :ctrl-key="`${ctrlKey}-CollapseWrapper`" :collapse-enabled="true" :tabbable-group-id="SearchOffersFilterTabGroupId">
      <template #head>
        <h3 class="filter-section-caption">
          {{ $t(captionResName) }}
        </h3>
      </template>
      <template #content>
        <div v-if="!showNoResultsStub" class="filter-section-content">
          <slot />
        </div>
        <div v-else class="filter-noresults-stub mt-xs-2">
          {{ $t(getI18nResName3('searchOffers', 'filters', 'noResultsStub')) }}
        </div>
      </template>
    </CollapsableSection>
  </div>
</template>

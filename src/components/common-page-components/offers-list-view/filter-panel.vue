<script setup lang="ts">
import { toShortForm, type ArbitraryControlElementMarker, type ControlKey, getFunctionalElementKey } from './../../../helpers/components';
import { getI18nResName3, type OfferKind } from '@golobe-demo/shared';
import { LOADING_STATE, SearchOffersFilterTabGroupId } from './../../../helpers/constants';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import CollapsableSection from './../../collapsable-section.vue';
import RangeFilter from './filters/range-filter.vue';
import ChecklistFilter from './filters/checklist-filter.vue';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const searchOffersStore = useSearchOffersStore();
const logger = getCommonServices().getLogger().addContextProps({ component: 'FilterPanel' });

const isError = ref(false);
const isCollapsed = ref(false);

const searchResultsEmpty = computed(() => {
  return searchOffersStore.items[offersKind] !== LOADING_STATE && 
        searchOffersStore.items[offersKind].length === 0;
});

const filters = computed(() => { 
  return searchOffersStore.filterInfo[offersKind] !== LOADING_STATE ? 
    (searchOffersStore.filterInfo[offersKind]) : [];
});

function onApplyBtnClick () {
  logger.debug('apply btn click', { ctrlKey, type: offersKind });
  searchOffersStore.load(offersKind);
}

function onResetBtnClick () {
  logger.debug('reset btn click', { ctrlKey, type: offersKind });
  searchOffersStore.resetFilters(offersKind);
}

</script>

<template>
  <section :class="`filter-panel pt-xs-2 pt-m-5 pr-m-2 mb-xs-5 mb-m-0 tabbable-group-${SearchOffersFilterTabGroupId}`">
    <ErrorHelm v-model:is-error="isError">
      <ClientOnly>
        <CollapsableSection v-model:collapsed="isCollapsed" :ctrl-key="[...ctrlKey, 'CollapsableSection']" collapseable persistent :tabbable-group-id="SearchOffersFilterTabGroupId">
          <template #head>
            <h2 class="filter-panel-header">
              {{ $t(getI18nResName3('searchOffers', 'filters', 'panelHeader')) }}
            </h2>
          </template>
          <template #content>
            <div class="filter-panel-div">
              <PerfectScrollbar
                :options="{
                  suppressScrollX: true,
                  wheelPropagation: true
                }"
                :watch-options="false"
                tag="div"
                class="filter-panel-scrollcontainer"
              >
                <div class="filter-panel-content mx-xs-2 mx-m-0">
                  <FilterSection
                    v-for="(filter) in filters"
                    :key="`${toShortForm(ctrlKey)}FilterSection${filter.filterId}`"
                    :ctrl-key="[...ctrlKey, filter.filterId as ArbitraryControlElementMarker]"
                    :caption-res-name="filter.captionResName"
                    :show-no-results-stub="searchResultsEmpty"
                  >
                    <RangeFilter v-if="filter.type === 'range'" :ctrl-key="getFunctionalElementKey({ filterId: filter.filterId })" :filter-params="filter" />
                    <ChecklistFilter v-else-if="filter.type === 'checklist'" :ctrl-key="getFunctionalElementKey({ filterId: filter.filterId })" :filter-params="filter" :max-collapsed-list-items-count="(filter.display === 'list' && (filter.variants?.length ?? 0) > 5) ? 4 : undefined" />
                  </FilterSection>
                </div>
              </PerfectScrollbar>
              <div class="filter-panel-buttons-div">
                <SimpleButton
                  kind="accent"
                  class="apply-filter-btn mt-xs-2 mt-s-3"
                  :ctrl-key="[...ctrlKey, 'Btn', 'Apply']"
                  :tabbable-group-id="SearchOffersFilterTabGroupId"
                  icon="magnifier"
                  :label-res-name="getI18nResName3('searchFlights', 'filters', 'applyBtn')"
                  @click="onApplyBtnClick"
                />
                <SimpleButton
                  kind="default"
                  class="reset-filter-btn mt-xs-2 mt-s-3 px-xs-2"
                  :ctrl-key="[...ctrlKey, 'Btn', 'Reset']"
                  :tabbable-group-id="SearchOffersFilterTabGroupId"
                  icon="cross"
                  :label-res-name="getI18nResName3('searchFlights', 'filters', 'resetBtn')"
                  @click="onResetBtnClick"
                />
              </div>
            </div>
          </template>
        </CollapsableSection>
        <template #fallback>
          <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" class="mb-xs-2 mb-m-5" />
        </template>
      </ClientOnly>
    </ErrorHelm>
  </section>
</template>

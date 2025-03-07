<script setup lang="ts">
import { toShortForm, type ArbitraryControlElementMarker, type ControlKey } from './../../../helpers/components';
import { getI18nResName3, type OfferKind } from '@golobe-demo/shared';
import type { ISearchOffersChecklistFilterProps, ISearchOffersRangeFilterProps } from './../../../types';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import { SearchOffersFilterTabGroupId } from './../../../helpers/constants';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import orderBy from 'lodash-es/orderBy';
import isEqual from 'lodash-es/isEqual';
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

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger().addContextProps({ component: 'FilterPanel' });

const isError = ref(false);
const isCollapsed = ref(false);

const filters = reactive([] as {
  params: ISearchOffersChecklistFilterProps | ISearchOffersRangeFilterProps,
  value: any
}[]);

const searchResultsEmpty = computed(() => (searchOffersStore?.viewState.displayOptions.totalCount ?? 0) === 0);

function refreshFilterParams () {
  logger.debug('refershing filter params', { ctrlKey, type: offersKind });
  if (!searchOffersStore || !searchOffersStore.viewState.currentSearchParams.filters) {
    logger.debug('filter params wont refresh, not initialized', { ctrlKey, type: offersKind });
    return;
  }

  const filtersOrdered = orderBy(searchOffersStore.viewState.currentSearchParams.filters, ['displayOrder'], ['asc']);
  if (filters.length === 0) {
    logger.verbose('initializing filters list', { ctrlKey, type: offersKind, count: filtersOrdered.length });
    for (let i = 0; i < filtersOrdered.length; i++) {
      const filterParams = filtersOrdered[i];
      if (filterParams.type === 'checklist') {
        filters.push({
          params: filterParams,
          value: []
        });
      } else if (filterParams.type === 'range') {
        filters.push({
          params: filterParams,
          value: {
            min: (filterParams as ISearchOffersRangeFilterProps).valueRange.min,
            max: (filterParams as ISearchOffersRangeFilterProps).valueRange.max
          }
        });
      } else {
        throw new Error('unknown filter');
      }
    }
    logger.verbose('filters list initialized', { ctrlKey, type: offersKind, count: filtersOrdered.length });
  } else {
    for (let i = 0; i < filtersOrdered.length; i++) {
      filters[i].params = filtersOrdered[i];
    }
  }
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
  logger.debug('filter params refreshed', { ctrlKey, type: offersKind });
}
if (import.meta.server) {
  refreshFilterParams();
}

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
  watch(() => searchOffersStore?.viewState.currentSearchParams.filters, () => {
    refreshFilterParams();
  });
  refreshFilterParams();

  watch(() => searchOffersStore.resultState.status, () => {
    refetchIfNotLatestFilterValues();
  });
});

function refetchIfNotLatestFilterValues () {
  logger.debug('checking for refetch if not latest filter values were used', { ctrlKey, type: offersKind });
  if (searchOffersStore.resultState.status !== 'fetched' && searchOffersStore.resultState.status !== 'error') {
    logger.debug('checking for refetch skipped, as fetch is in progress', { ctrlKey, type: offersKind });
    return;
  }

  let filtersChanged = false;
  for (let i = 0; i < filters.length; i++) {
    const filterId = filters[i].params.filterId;
    const fetchUsedValue = searchOffersStore.resultState.usedSearchParams!.filters!.find(f => f.filterId === filterId)!.currentValue;
    const lastUserValue = searchOffersStore.viewState.currentSearchParams.filters!.find(f => f.filterId === filterId)!.currentValue;
    if (!isEqual(fetchUsedValue, lastUserValue)) {
      logger.verbose('filter values have been changed by user during fetch', { ctrlKey, type: offersKind, filterId, fetchValue: fetchUsedValue, lastUserValue });
      filtersChanged = true;
    }
  }

  if (!filtersChanged) {
    logger.debug('checked for refetch - not needed', { ctrlKey, type: offersKind });
    return;
  }
  setTimeout(() => searchOffersStore.fetchData('filter-refetch'), 0);
}

function applyFiltersAndRefetchData () {
  logger.debug('applying filters', { ctrlKey, type: offersKind });
  for (let i = 0; i < filters.length; i++) {
    const inputState = filters[i];
    const storeState = searchOffersStore.viewState.currentSearchParams.filters!.find(f => f.filterId === inputState.params.filterId)!;
    logger.debug('setting filter value in store', { ctrlKey, filterId: inputState.params.filterId, value: inputState.value });
    storeState.currentValue = inputState.value;
  }
  if (searchOffersStore.resultState.status !== 'fetched' && searchOffersStore.resultState.status !== 'error') {
    logger.debug('fetching data was postponed as fetch is in progress', { ctrlKey, type: offersKind });
    return;
  }
  logger.debug('fetching data with applied filters', { ctrlKey, type: offersKind });
  setTimeout(() => searchOffersStore.fetchData('filter-refetch'), 0);
}

function onApplyBtnClick () {
  logger.debug('apply btn click', { ctrlKey, type: offersKind });
  applyFiltersAndRefetchData();
}

function onResetBtnClick () {
  logger.debug('reset btn click', { ctrlKey, type: offersKind });
  for (let i = 0; i < filters.length; i++) {
    const filter = searchOffersStore.viewState.currentSearchParams.filters!.find(f => f.filterId === filters[i].params.filterId)!;
    if (filter.type === 'range') {
      const rangeFilter = filter as ISearchOffersRangeFilterProps;
      logger.debug('resetting range filter value in store', { ctrlKey, filterId: filter.filterId, value: rangeFilter.valueRange });
      rangeFilter.currentValue = rangeFilter.valueRange;
    } else if (filter.type === 'checklist') {
      const checklistFilter = filter as ISearchOffersChecklistFilterProps;
      logger.debug('resetting checklist filter value in store', { ctrlKey, filterId: filter.filterId });
      checklistFilter.currentValue = [];
    } else {
      throw new Error('unknown filter');
    }
    filters.find(f => f.params.filterId === filter.filterId)!.value = filter.currentValue;
  }
  setTimeout(() => searchOffersStore.fetchData('filter-refetch'), 0);
}

</script>

<template>
  <section :class="`filter-panel pt-xs-2 pt-m-5 pr-m-2 mb-xs-5 mb-m-0 tabbable-group-${SearchOffersFilterTabGroupId}`">
    <ErrorHelm v-model:is-error="isError">
      <ClientOnly>
        <!-- TODO: found SSR-aware UI components & remove ClientOnly -->
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
                    :key="`${toShortForm(ctrlKey)}FilterSection${filter.params.filterId}`"
                    :ctrl-key="[...ctrlKey, filter.params.filterId as ArbitraryControlElementMarker]"
                    :caption-res-name="filter.params.captionResName"
                    :show-no-results-stub="searchResultsEmpty"
                  >
                    <RangeFilter v-if="filter.params.type === 'range'" v-model:value="filter.value" :ctrl-key="[...ctrlKey, 'Filter', filter.params.filterId as ArbitraryControlElementMarker]" :filter-params="filter.params" />
                    <ChecklistFilter v-else-if="filter.params.type === 'checklist'" v-model:value="filter.value" :ctrl-key="[...ctrlKey, 'Filter', filter.params.filterId as ArbitraryControlElementMarker]" :filter-params="filter.params" :max-collapsed-list-items-count="(filter.params.display === 'list' && (filter.params.variants?.length ?? 0) > 5) ? 4 : undefined" />
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

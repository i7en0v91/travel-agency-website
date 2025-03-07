<script setup lang="ts">
import { toShortForm, type ArbitraryControlElementMarker, type ControlKey } from './../../../helpers/components';
import { getI18nResName3, type OfferKind } from '@golobe-demo/shared';
import type { IAccordionItemProps, ISearchOffersChecklistFilterProps, ISearchOffersChoiceFilterProps, ISearchOffersRangeFilterProps } from './../../../types';
import orderBy from 'lodash-es/orderBy';
import isEqual from 'lodash-es/isEqual';
import RangeFilter from './filters/range-filter.vue';
import ChecklistFilter from './filters/checklist-filter.vue';
import ChoiceFilter from './filters/choice-filter.vue';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import MyAccordion from '../../forms/my-accordion.vue';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();
const themeSettings = useThemeSettings();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const logger = getCommonServices().getLogger().addContextProps({ component: 'FilterPanel' });

const isError = ref(false);

const filters = reactive([] as {
  params: ISearchOffersChecklistFilterProps | ISearchOffersRangeFilterProps | ISearchOffersChoiceFilterProps,
  availableValues: any
}[]);
const editValues: Ref<any>[] = [];

const searchResultsEmpty = computed(() => (searchOffersStore?.viewState.displayOptions.totalCount ?? 0) === 0);

const accordionItems = computed(() => {
  return filters.map((filter) => {
    const item: IAccordionItemProps = {
      labelResName: filter.params.captionResName,
      slotName: filter.params.filterId
    };
    return item;
  });
});

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
      if (filterParams.type === 'checklist' || filterParams.type === 'choice') {
        filters.push({
          params: filterParams,
          availableValues: []
        });
        editValues.push(ref(filterParams.type === 'checklist' ? [] : undefined));
      } else if (filterParams.type === 'range') {
        filters.push({
          params: filterParams,
          availableValues: {
            min: (filterParams as ISearchOffersRangeFilterProps).valueRange.min,
            max: (filterParams as ISearchOffersRangeFilterProps).valueRange.max
          }
        });
        editValues.push(ref(filters[i].availableValues));
      } else {
        throw new Error('unknown filter');
      }
    }
    logger.verbose('filters list initialized', { ctrlKey, type: offersKind, count: filtersOrdered.length });
  } else {
    for (let i = 0; i < filtersOrdered.length; i++) {
      filters[i].params = filtersOrdered[i];
      const filterType = filters[i].params.type;
      editValues[i].value = 
        filterType === 'range' ? filters[i].availableValues : (
          filterType === 'checklist' ? [] : undefined);
    }
  }
  logger.debug('filter params refreshed', { ctrlKey, type: offersKind });
}
if (import.meta.server) {
  refreshFilterParams();
}

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
  watch(() => searchOffersStore?.viewState.currentSearchParams.filters, () => {
    refreshFilterParams();
  }, { immediate: true });

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
    const filterId = filters[i].params.filterId;
    const inputValue = editValues[i].value;
    const storeState = searchOffersStore.viewState.currentSearchParams.filters!.find(f => f.filterId === filterId)!;
    logger.debug('setting filter value in store', { ctrlKey, filterId, value: inputValue });
    storeState.currentValue = inputValue;
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
    } else if (filter.type === 'choice') {
      const choiceFilter = filter as ISearchOffersChoiceFilterProps;
      logger.debug('resetting choice filter value in store', { ctrlKey, filterId: filter.filterId });
      choiceFilter.currentValue = undefined;
    } else {
      throw new Error('unknown filter');
    }
    
    const idx = filters.findIndex(f => f.params.filterId === filter.filterId)!;
    logger.debug('resetting range filter edit value', { ctrlKey, filterId: filter.filterId, currentValue: editValues[idx].value, resetValue: filter.currentValue });
    editValues[idx].value = filter.currentValue;
  }
  setTimeout(() => searchOffersStore.fetchData('filter-refetch'), 0);
}

const uiCommonStyling = computed(() => { 
  return {
    color: themeSettings.currentTheme.value === 'light' ? 'gray' : 'gray',
    variant: themeSettings.currentTheme.value === 'light' ? 'soft' : 'ghost',
  };
});

const uiFilterSectionStyling = { 
  default: {
    class: '!text-xl font-semibold text-gray-600 dark:text-gray-300 mb-4'
  }
};

</script>

<template>
  <section class="flex flex-row flex-nowrap pt-2 md:pt-8 md:pr-2 md:mb-0 md:min-h-[256px]">
    <div class="flex-1 md:mr-2">
      <ErrorHelm v-model:is-error="isError" :ui="{ stub: 'max-h-[50vh]' }">
        <ClientOnly>
          <MyAccordion
            :ctrl-key="ctrlKey"
            :items="[{
              labelResName: getI18nResName3('searchOffers', 'filters', 'panelHeader'),
              slotName: 'filterSection'
            }]"
            :ui="uiFilterSectionStyling"
            v-bind="uiCommonStyling"
            persistent
          >
            <template #filterSection>
              <MyAccordion :ctrl-key="[...ctrlKey, 'FilterSection']" :items="accordionItems" v-bind="uiCommonStyling" persistent>
                <template
                  v-for="(filter, idx) in filters"
                  #[filter.params.filterId]
                  :key="`${toShortForm(ctrlKey)}FilterSection${filter.params.filterId}`"
                >
                  <div v-if="!searchResultsEmpty">
                    <RangeFilter v-if="filter.params.type === 'range'" v-model:value="editValues[idx].value" :ctrl-key="[...ctrlKey, 'Filter', filter.params.filterId as ArbitraryControlElementMarker]" :filter-params="filter.params" />
                    <ChecklistFilter v-else-if="filter.params.type === 'checklist'" v-model:value="editValues[idx].value" :ctrl-key="[...ctrlKey, 'Filter', filter.params.filterId as ArbitraryControlElementMarker]" :filter-params="filter.params" :max-collapsed-list-items-count="((filter.params.variants?.length ?? 0) > 5) ? 4 : undefined" />
                    <ChoiceFilter v-else v-model:value="editValues[idx].value" :ctrl-key="[...ctrlKey, 'Filter', filter.params.filterId as ArbitraryControlElementMarker]" :filter-params="filter.params" />
                  </div>
                  <div v-else class="w-full text-center mt-2">
                    {{ $t(getI18nResName3('searchOffers', 'filters', 'noResultsStub')) }}
                  </div>
                  <UDivider color="gray" orientation="horizontal" class="w-full mt-8" size="sm"/>
                </template>
              </MyAccordion>
              <div class="w-full h-auto p-2">
                <UButton
                  size="md"
                  color="primary"
                  variant="solid"
                  :ui="{ base: 'w-full justify-center mt-2 sm:mt-4' }"
                  icon="i-heroicons-magnifying-glass-solid"
                  @click="onApplyBtnClick"
                >
                  {{  $t(getI18nResName3('searchFlights', 'filters', 'applyBtn')) }}
                </UButton>

                <UButton
                  size="md"
                  color="gray"
                  variant="outline"
                  :ui="{ base: 'w-full justify-center mt-2 sm:mt-4' }"
                  icon="i-mdi-close"
                  @click="onResetBtnClick"
                >
                  {{  $t(getI18nResName3('searchFlights', 'filters', 'resetBtn')) }}
                </UButton>
              </div>
            </template>
          </MyAccordion>

          <template #fallback>
            <ComponentWaitingIndicator :ctrl-key="[...ctrlKey, 'ClientFallback']" class="my-2 md:my-8" />
          </template>
        </ClientOnly>
      </ErrorHelm>
    </div>
    
    <UDivider color="gray" orientation="vertical" class="flex-initial hidden h-full md:inline" size="sm"/>
  </section>
</template>
<script setup lang="ts">
import { toShortForm, type ControlKey, getFunctionalElementKey } from './../../../helpers/components';
import { getI18nResName3, type OfferKind } from '@golobe-demo/shared';
import type { IAccordionItemProps } from './../../../types';
import { LOADING_STATE } from './../../../helpers/constants';
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

const logger = getCommonServices().getLogger().addContextProps({ component: 'FilterPanel' });
const themeSettings = useThemeSettings();
const searchOffersStore = useSearchOffersStore();

const isError = ref(false);

const searchResultsEmpty = computed(() => {
  return searchOffersStore.items[offersKind] !== LOADING_STATE && 
        searchOffersStore.items[offersKind].length === 0;
});

const filters = computed(() => { 
  return searchOffersStore.filterInfo[offersKind] !== LOADING_STATE ? 
    (searchOffersStore.filterInfo[offersKind]) : [];
});

const accordionItems = computed(() => {
  return filters.value.map((filter) => {
    const item: IAccordionItemProps = {
      labelResName: filter.captionResName,
      slotName: filter.filterId
    };
    return item;
  });
});

function onApplyBtnClick () {
  logger.debug('apply btn click', { ctrlKey, type: offersKind });
  searchOffersStore.load(offersKind);
}

function onResetBtnClick () {
  logger.debug('reset btn click', { ctrlKey, type: offersKind });
  searchOffersStore.resetFilters(offersKind);
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

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
});


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
                  v-for="filter in filters"
                  #[filter.filterId]
                  :key="`${toShortForm(ctrlKey)}FilterSection${filter.params.filterId}`"
                >
                  <div v-if="!searchResultsEmpty">
                    <RangeFilter v-if="filter.type === 'range'" :ctrl-key="getFunctionalElementKey({ filterId: filter.filterId })" :filter-params="filter" />
                    <ChecklistFilter v-else-if="filter.type === 'checklist'" :ctrl-key="getFunctionalElementKey({ filterId: filter.filterId })" :filter-params="filter" :max-collapsed-list-items-count="((filter.variants?.length ?? 0) > 5) ? 4 : undefined" />
                    <ChoiceFilter v-else-if="filter.type === 'choice'" :ctrl-key="getFunctionalElementKey({ filterId: filter.filterId })" :filter-params="filter" />
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
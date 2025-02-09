<script setup lang="ts" generic="TItem extends EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>">
import { StayOffersSortFactorEnum, DefaultStayOffersSorting, type StayOffersSortFactor, type FlightOffersSortFactor, convertTimeOfDay, getI18nResName3, DefaultFlightOffersSorting, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, type OfferKind, type I18nResName } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import ListSortInfo from './list-sort-info.vue';
import FlightsListItemCard from './search-flights-result-card.vue';
import StaysListItemCard from './search-stays-result-card.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useDeviceSize } from '../../../composables/device-size';
import type { FlightOffersDisplayOptionType, ISearchStayOffersParams, ISearchFlightOffersParams, DropdownListValue, IDropdownListItemProps, ITabGroupMenuProps, ISearchFlightOffersDisplayOption, ISearchFlightOffersDisplayOptions, ISearchStayOffersDisplayOptions, ITabProps, TabGroupOtherOptions } from '../../../types';
import { DeviceSizeEnum } from './../../../helpers/constants';

type OptionName = FlightOffersDisplayOptionType | 'hotels' | 'motels' | 'resorts';

interface IDisplayOptionTabProps extends ITabProps {
  optionName: OptionName,
  summary: {
    labelResName: I18nResName,
    icon: string,
    subtext: {
      resName: I18nResName,
      resArgs: any
    }
  }
}

interface IOtherDisplayOptionsTabProps extends TabGroupOtherOptions {
  optionName: OptionName
}

const SearchStaysOptionNames: OptionName[] = ['hotels', 'motels', 'resorts'];
const TabIcons: ReadonlyMap<OptionName, string> = new Map<OptionName, string>([
  ['hotels', 'i-material-symbols-bed'], 
  ['motels', 'i-material-symbols-bed'],
  ['resorts', 'i-material-symbols-bed'],
  ['price', 'material-symbols:attach-money-rounded'],
  ['score', 'i-material-symbols-star'],
  ['duration', 'material-symbols:clock-loader-20']
]);

type WaitingStubMode = 'full' | 'list-only' | 'hide';

interface IProps {
  ctrlKey: string,
  offersKind: OfferKind,
  items: TItem[]
}
const { ctrlKey, offersKind } = defineProps<IProps>();
const logger = getCommonServices().getLogger();

const { current: deviceSize } = useDeviceSize();
const { t } = useI18n();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const isError = ref(false);

const activeTabKey = ref<string | undefined>(getInitialActiveTabKey());

function getOptionCtrlKey (optionName: OptionName): string {
  return `${ctrlKey}-${offersKind}-${optionName}`;
}

function getInitialActiveTabKey () : string {
  if (searchOffersStore.offersKind === 'flights') {
    return getOptionCtrlKey((searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions)?.primaryOptions.find(x => x.isActive)?.type ?? DefaultFlightOffersSorting);
  } else {
    return getOptionCtrlKey(SearchStaysOptionNames[0]);
  }
}

function getOptionResName (optionName: OptionName): I18nResName {
  if (optionName === 'price') {
    return getI18nResName3('searchOffers', 'displayOptions', 'cheapest');
  } else if (optionName === 'score') {
    return getI18nResName3('searchOffers', 'displayOptions', 'best');
  } else if (optionName === 'rating') {
    return getI18nResName3('searchOffers', 'displayOptions', 'rating');
  }

  if (offersKind === 'flights') {
    if (optionName === 'timetodeparture') {
      return getI18nResName3('searchFlights', 'displayOptions', 'timeToDeparture');
    } else if (optionName === 'duration') {
      return getI18nResName3('searchFlights', 'displayOptions', 'quickest');
    }
  }

  if (offersKind === 'stays') {
    if(optionName === 'hotels') {
      return getI18nResName3('searchStays', 'displayOptions', 'hotels');
    } else if (optionName === 'motels') {
      return getI18nResName3('searchStays', 'displayOptions', 'motels');
    } else if (optionName === 'resorts') {
      return getI18nResName3('searchStays', 'displayOptions', 'resorts');
    }
  }

  throw new Error('unexpected sort option');
}

function buildSearchStayOffersTabProps (displayOptions: ISearchStayOffersDisplayOptions): IDisplayOptionTabProps[] {
  logger.debug(`(ResultItemsList) building search stay offers tab props, ctrlKey=${ctrlKey}, displayOptions=${JSON.stringify(displayOptions)}`);

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < SearchStaysOptionNames.length; i++) {
    const optionName = SearchStaysOptionNames[i];
    result.push({
      ctrlKey: getOptionCtrlKey(optionName),
      enabled: true,
      isActive: activeTabKey.value === getOptionCtrlKey(optionName),
      tabName: getOptionCtrlKey(optionName),
      label: {
        slotName: optionName
      },
      optionName,
      summary: {
        labelResName: getI18nResName3('searchStays', 'displayOptions', optionName as any),
        subtext: {
          resName: getI18nResName3('searchStays', 'displayOptions', 'btnSubtext'),
          resArgs: displayOptions.totalCount
        },
        icon: TabIcons.get(optionName)!
      }
    });
  }

  const defaultSortOptionIdx = result.findIndex(r => r.optionName === DefaultStayOffersSorting);
  if(defaultSortOptionIdx > 0) {
    result = [...result.splice(defaultSortOptionIdx, 1), ...result];
  }

  logger.debug(`(ResultItemsList) search stays offers tabs props built, ctrlKey=${ctrlKey}`);
  return result;
}

function buildFlightsDisplayOptionSummaryResArgs (displayOption: ISearchFlightOffersDisplayOption): { price: string, hours: string, minutes: string } | undefined {
  if (displayOption.price === undefined || displayOption.duration === undefined) {
    return undefined;
  }

  const duration = convertTimeOfDay(displayOption.duration!);
  return {
    price: displayOption.price!.toFixed(0),
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

function buildSearchFlightOffersTabProps (displayOptions: ISearchFlightOffersDisplayOptions): IDisplayOptionTabProps[] {
  logger.debug(`(ResultItemsList) building search flight offers tabs props, ctrlKey=${ctrlKey}, displayOptions=${JSON.stringify(displayOptions)}`);

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < displayOptions.primaryOptions.length; i++) {
    const option = displayOptions.primaryOptions[i];

    const summaryShortResArgs = buildFlightsDisplayOptionSummaryResArgs(option);
    result.push({
      ctrlKey: getOptionCtrlKey(option.type),
      enabled: true,
      isActive: activeTabKey.value === getOptionCtrlKey(option.type),
      optionName: option.type,
      label: {
        slotName: option.type
      },
      tabName: getOptionCtrlKey(option.type),
      summary: {
        labelResName: getOptionResName(option.type),
        subtext: {
          resName: getI18nResName3('searchFlights', 'displayOptions', 'shortSummary'),
          resArgs: summaryShortResArgs
        },
        icon: TabIcons.get(option.type)!
      }
    });
  }

  const defaultSortOptionIdx = result.findIndex(r => r.optionName === DefaultFlightOffersSorting);
  if(defaultSortOptionIdx > 0) {
    result = [...result.splice(defaultSortOptionIdx, 1), ...result];
  }

  logger.debug(`(ResultItemsList) search flight offers tabs props built, ctrlKey=${ctrlKey}`);
  return result;
}

function spliceTabsIntoOtherSortDropdown (tabProps: IDisplayOptionTabProps[], count: number): ITabGroupMenuProps | undefined {
  logger.debug(`(ResultItemsList) splicing tabs into other sort dropdown, ctrlKey=${ctrlKey}, numTabs=${tabProps.length}, count=${count}`);
  if (count < 0 || count >= tabProps.length) {
    logger.warn(`(ResultItemsList) out of range when splicing tabs into other sort dropdown, ctrlKey=${ctrlKey}, numTabs=${tabProps.length}, count=${count}`);
    count = count < 0 ? 0 : 1;
  }
  let result: ITabGroupMenuProps | undefined;
  if (count > 0) {
    const spliced = tabProps.splice(tabProps.length - count, count);
    const otherSortOptionsProps = spliced.map((o) => {
      return {
        ctrlKey: o.ctrlKey,
        enabled: true,
        label: {
          resName: getOptionResName(o.optionName),
        },
        isActive: activeTabKey.value === o.ctrlKey,
        optionName: o.optionName
      };
    });
    result = {
      defaultResName: offersKind === 'flights' ? getI18nResName3('searchFlights', 'displayOptions', 'other') : getI18nResName3('searchStays', 'displayOptions', 'other'),
      enabled: true,
      selectedResName: getI18nResName3('searchOffers', 'displayOptions', 'otherSelected'),
      variants: otherSortOptionsProps,
    };
  }

  logger.debug(`(ResultItemsList) completed splicing tabs into other sort dropdown, ctrlKey=${ctrlKey}, numTabs=${tabProps.length}, result count=${result?.variants.length ?? 0}`);
  return result;
}

const optionTabsProps = ref<IDisplayOptionTabProps[]>([]);
const otherSortDropdownProps = ref<ITabGroupMenuProps | undefined>();
const numTabs = ref<number>(offersKind === 'flights' ? 2 : 3);
const secondarySortDropdownItemsProps = ref<IDropdownListItemProps[]>([]);
const secondarySort = ref<FlightOffersSortFactor | StayOffersSortFactor>();

const getWaitingStubMode = (): WaitingStubMode => !searchOffersStore ? 'hide' : (searchOffersStore.resultState.status === 'sort-refetch' ? 'list-only' : ((searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'filter-refetch') ? 'full' : 'hide'));
const waitingStubMode = ref<WaitingStubMode>(getWaitingStubMode());
const updateWaitingStubMode = () => {
  waitingStubMode.value = getWaitingStubMode();
};

function onActiveSecondaryOptionChanged (value?: DropdownListValue) {
  logger.verbose(`(ResultItemsList) entered active secondary option change handler, ctrlKey=${ctrlKey}, option=${value}`);

  if (value) {
    let userSortingChanged = false;

    if (searchOffersStore.offersKind === 'flights') {
      const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions);
      for (let i = 0; i < storeDisplayOptions.primaryOptions.length; i++) {
        const storeDisplayOption = storeDisplayOptions.primaryOptions[i];
        if (storeDisplayOption.isActive) {
          if (storeDisplayOption.type !== value) {
            userSortingChanged = true;
            break;
          }
        }
      }
    } else {
      const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchStayOffersDisplayOptions);
      userSortingChanged = storeDisplayOptions.sorting !== value;
    }

    if (userSortingChanged) {
      logger.verbose(`(ResultItemsList) active secondary option change triggered sort refetch, ctrlKey=${ctrlKey}, option=${value}`);
      if (searchOffersStore.offersKind === 'flights') {
        activeTabKey.value = getOptionCtrlKey(value as OptionName); // KB: in current implementation keep in sync both sort modes
      }
      setTimeout(refreshResultListAsIfSortChanged, 0);
    }
  }

  logger.debug(`(ResultItemsList) active secondary option change handler completed, ctrlKey=${ctrlKey}, option=${value}`);
}

function onPrimaryActiveTabChanged (tabKey: string) {
  logger.verbose(`(ResultItemsList) entered active primary option change handler, ctrlKey=${ctrlKey}, tab=${tabKey}`);

  setTimeout(() => {
    refreshResultListAsIfSortChanged();
    if (searchOffersStore.offersKind === 'flights') {
      const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions);
      secondarySort.value = storeDisplayOptions.primaryOptions.find(o => o.isActive)!.type;
    } else {
      refreshDisplayedOptionTabs();
    }
  }, 0);

  logger.debug(`(ResultItemsList) active primary option change handler completed, ctrlKey=${ctrlKey}, tab=${tabKey}`);
}

function refreshResultListAsIfSortChanged () {
  logger.verbose(`(ResultItemsList) refreshing result list (as if sorting changed), ctrlKey=${ctrlKey}, activePrimaryOptionCtrl=${activeTabKey.value}`);

  if (!searchOffersStore) {
    logger.debug(`(ResultItemsList) won't refresh result list (as if sorting changed), store is not initialized, ctrlKey=${ctrlKey}`);
    return;
  }

  if (searchOffersStore.resultState.status !== 'error' && searchOffersStore.resultState.status !== 'fetched') {
    logger.verbose(`(ResultItemsList) won't refresh result list (as if sorting changed), fetch currently in progress, ctrlKey=${ctrlKey}, status=${searchOffersStore.resultState.status}`);
    return;
  }

  if (searchOffersStore.offersKind === 'flights') {
    let activatedPrimaryOptionType = (optionTabsProps.value.find(p => p.ctrlKey === activeTabKey.value)?.optionName ?? (otherSortDropdownProps.value?.variants.find(x => x.ctrlKey === activeTabKey.value) as IOtherDisplayOptionsTabProps)?.optionName);
    if (!activatedPrimaryOptionType) {
      logger.warn(`(ResultItemsList) cannot detect primary sort mode, ctrlKey=${ctrlKey}, activeTabKey=${activeTabKey.value}, optionTabKeys=[${optionTabsProps.value.map(v => v.ctrlKey).join(', ')}], otherSortTabKeys=[${otherSortDropdownProps.value?.variants.map(v => v.ctrlKey).join(', ')}]`);
      activatedPrimaryOptionType = DefaultFlightOffersSorting;
    }

    logger.verbose(`(ResultItemsList) updating store display options, ctrlKey=${ctrlKey}, selected sort: primary=${activatedPrimaryOptionType}`);
    const resultSortingType = (searchOffersStore as ISearchOffersStoreInstance<ISearchFlightOffersParams>).resultState.usedSearchParams?.displayOptions.primaryOptions.find(x => x.isActive)?.type;
    let userSortingChanged = resultSortingType !== undefined && resultSortingType !== activatedPrimaryOptionType;

    const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions);
    for (let i = 0; i < storeDisplayOptions.primaryOptions.length; i++) {
      const storeDisplayOption = storeDisplayOptions.primaryOptions[i];
      if (storeDisplayOption.isActive) {
        if (storeDisplayOption.type !== activatedPrimaryOptionType) {
          userSortingChanged = true;
          break;
        }
      }
    }

    if (!userSortingChanged) {
      logger.verbose(`(ResultItemsList) no need to refresh results (as if sorting changed) - sort mode hasn't changed, ctrlKey=${ctrlKey}, primarySort=${activatedPrimaryOptionType}`);
      return;
    }

    storeDisplayOptions.primaryOptions.forEach((o) => { o.isActive = (o.type === activatedPrimaryOptionType); });
    if (searchOffersStore.offersKind === 'flights') {
      storeDisplayOptions.additionalSorting = activatedPrimaryOptionType as FlightOffersSortFactor; // KB: in current implementation keep in sync both sort modes
    }
  } else {
    const resultSortingType = (searchOffersStore as ISearchOffersStoreInstance<ISearchStayOffersParams>).resultState.usedSearchParams?.displayOptions.sorting;
    const activatedSortType = secondarySort.value ?? DefaultStayOffersSorting;
    const userSortingChanged = resultSortingType !== undefined && resultSortingType !== activatedSortType;
    if (!userSortingChanged) {
      logger.verbose(`(ResultItemsList) no need to refresh results (as if sorting changed) - sort mode hasn't changed, ctrlKey=${ctrlKey}, sort=${activatedSortType}`);
      return;
    }

    const storeDisplayOptions = (searchOffersStore as ISearchOffersStoreInstance<ISearchStayOffersParams>).viewState.displayOptions;
    storeDisplayOptions.sorting = activatedSortType as StayOffersSortFactor;
  }

  setTimeout(() => searchOffersStore.fetchData('sort-refetch'), 0);
  logger.debug(`(ResultItemsList) result list refresh (as if sorting changed) executed, ctrlKey=${ctrlKey}`);
}

function refreshDisplayedOptionTabs () {
  logger.debug(`(ResultItemsList) refreshing tabs display options, ctrlKey=${ctrlKey}, status=${searchOffersStore.resultState.status}`);
  if (searchOffersStore.offersKind === 'flights') {
    const searchFlightsDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions;
    if (searchFlightsDisplayOptions) {
      logger.debug(`(ResultItemsList) using options from view state, ctrlKey=${ctrlKey}, primarySort=${searchFlightsDisplayOptions.primaryOptions.find(o => o.isActive)?.type}, secondarySort=${searchFlightsDisplayOptions.additionalSorting}`);
      const displayOptionsTabs = buildSearchFlightOffersTabProps(searchFlightsDisplayOptions);
      secondarySortDropdownItemsProps.value = displayOptionsTabs.map((o) => { return { value: o.optionName, resName: getOptionResName(o.optionName) }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsTabs.length - numTabs.value), displayOptionsTabs.length - 1);
      const otherSortOptions = spliceTabsIntoOtherSortDropdown(displayOptionsTabs, numButtonsToSplice);
      optionTabsProps.value = displayOptionsTabs;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchFlightsDisplayOptions.additionalSorting;
    } else {
      logger.debug(`(ResultItemsList) using default options, ctrlKey=${ctrlKey}`);
      optionTabsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultFlightOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  } else {
    const searchStayDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchStayOffersDisplayOptions;
    if (searchStayDisplayOptions) {
      logger.debug(`(ResultItemsList) using options from view state, ctrlKey=${ctrlKey}, sort=${searchStayDisplayOptions.sorting}`);
      const displayOptionsButtons = buildSearchStayOffersTabProps(searchStayDisplayOptions);
      secondarySortDropdownItemsProps.value = Object.keys(StayOffersSortFactorEnum).map(x => x.toLowerCase()).map((b) => { return { value: b, resName: getOptionResName(b as OptionName) }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsButtons.length - numTabs.value), displayOptionsButtons.length - 1);
      const otherSortOptions = spliceTabsIntoOtherSortDropdown(displayOptionsButtons, numButtonsToSplice);
      optionTabsProps.value = displayOptionsButtons;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchStayDisplayOptions.sorting;
    } else {
      logger.debug(`(ResultItemsList) using default options, ctrlKey=${ctrlKey}`);
      optionTabsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultStayOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  }
  logger.debug(`(ResultItemsList) tabs display options refershed, ctrlKey=${ctrlKey}`);
}

async function updateTabButtonsCount (): Promise<void> {
  logger.debug(`(ResultItemsList) updating tab count, ctrlKey=${ctrlKey}, current=${numTabs.value}`);

  const size = deviceSize.value;
  let newTabCount = 1;
  switch(size) {
    case DeviceSizeEnum.LG:
      newTabCount = offersKind === 'flights' ? 2 : 3;
      break;
    case DeviceSizeEnum.XL:
    case DeviceSizeEnum.XXL:
      newTabCount = 3;
      break;
  };
  if (newTabCount !== numTabs.value) {
    logger.verbose(`(ResultItemsList) tab count changed, ctrlKey=${ctrlKey}, old=${numTabs.value}, new=${newTabCount}`);
    numTabs.value = newTabCount;
  }
}

refreshDisplayedOptionTabs();
onMounted(() => {
  logger.verbose(`(ResultItemsList) mounted, ctrlKey=${ctrlKey}, type=${offersKind}`);
  watch(deviceSize, updateTabButtonsCount, { immediate: true });

  watch(searchOffersStore.viewState.displayOptions, () => {
    setTimeout(refreshDisplayedOptionTabs, 0);
  }, { immediate: false });
  watch(numTabs, refreshDisplayedOptionTabs, { immediate: true });

  watch(() => searchOffersStore.resultState.status, () => {
    if (searchOffersStore.resultState.status === 'error') {
      logger.warn(`(ResultItemsList) exception while fetching items, ctrlKey=${ctrlKey}, type=${offersKind}`);
      isError.value = true;
    } else {
      isError.value = false;
    }
    updateWaitingStubMode();

    if (searchOffersStore.resultState.status === 'fetched' || searchOffersStore.resultState.status === 'error') {
      refreshResultListAsIfSortChanged();
    }
  });

  watch(activeTabKey, () => onPrimaryActiveTabChanged(activeTabKey.value!), { immediate: false });
  watch(secondarySort, () => onActiveSecondaryOptionChanged(secondarySort.value), { immediate: false });
});

</script>

<template>
  <section class="px-2">
    <TabsGroup
      v-if="waitingStubMode !== 'full'"
      v-model:active-tab-key="activeTabKey"
      :ctrl-key="`${ctrlKey}-TabControl`"
      :tabs="optionTabsProps"
      :menu="otherSortDropdownProps"
      variant="split"
      :ui="{
        list: {
          height: 'h-14 sm:h-20'
        }
      }"
    >
      <template v-for="(slotName) in ['hotels', 'motels', 'resorts', 'price', 'score', 'duration']" #[slotName]="{ tab }"  :key="`${ctrlKey}-SortInfo-${slotName}`">
        <ListSortInfo v-bind="tab.summary"/>
      </template>

      <div class="w-full h-auto flex flex-row justify-between flex-wrap gap-3.5 items-center mt-4 sm:mt-6">
        <i18n-t :keypath="getI18nResName3('searchOffers', 'displayOptions', 'showingTotal')" tag="div" class="w-fit flex flex-row flex-wrap items-center" scope="global">
          <template #count>
            {{ searchOffersStore.resultState.items.length }}
          </template>
          <template #total>
            <div class="font-semibold text-orange-500 dark:text-orange-400">
              &nbsp;{{ searchOffersStore.viewState.displayOptions.totalCount }} {{ offersKind === 'flights' ? t(getI18nResName3('searchFlights', 'displayOptions', 'flights'), searchOffersStore.viewState.displayOptions.totalCount) : t(getI18nResName3('searchStays', 'displayOptions', 'places'), searchOffersStore.viewState.displayOptions.totalCount) }}
            </div>
          </template>
        </i18n-t>
        <div class="flex flex-row flex-wrap items-baseline overflow-x-clip">
          <div class="whitespace-nowrap">
            {{ $t(getI18nResName3('searchOffers', 'displayOptions', 'sortBy')) }}
          </div>
          <DropdownList
            v-model:selected-value="secondarySort"
            :ctrl-key="`${ctrlKey}-SecondarySort`"
            variant="none"
            :persistent="false"
            :items="secondarySortDropdownItemsProps"
          />
        </div>
      </div>

      <div class="w-full h-auto mt-4">
        <ErrorHelm v-model:is-error="isError">
          <ol v-if="waitingStubMode === 'hide'" class="space-y-6 sm:space-y-8">
            <li
              v-for="(offer, idx) in (items)"
              :key="`${ctrlKey}-Offer-${offer.id}`"
            >
              <FlightsListItemCard v-if="offersKind === 'flights'" :ctrl-key="`${ctrlKey}-FlightsCard-${idx}`" :offer="(offer as EntityDataAttrsOnly<IFlightOffer>)" />
              <StaysListItemCard v-else :ctrl-key="`${ctrlKey}-StaysCard-${idx}`" :offer="(offer as EntityDataAttrsOnly<IStayOffer>)" />
            </li>
          </ol>
          <ComponentWaitingIndicator v-else :ctrl-key="`${ctrlKey}-ListWaiter`" />
        </ErrorHelm>
      </div>
    </TabsGroup>    
    <ComponentWaitingIndicator v-else :ctrl-key="`${ctrlKey}-ResultsWaiter`" class="mt-8" />
  </section>
</template>

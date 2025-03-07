<script setup lang="ts" generic="TItem extends EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>">
import { toShortForm, toKnownElement, type ControlKey, areCtrlKeysEqual } from './../../../helpers/components';
import { StayOffersSortFactorEnum, DefaultStayOffersSorting, type StayOffersSortFactor, type FlightOffersSortFactor, convertTimeOfDay, getI18nResName3, DefaultFlightOffersSorting, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, type OfferKind, type I18nResName } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import ListSortInfo from './list-sort-info.vue';
import FlightsListItemCard from './search-flights-result-card.vue';
import StaysListItemCard from './search-stays-result-card.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useDeviceSize } from '../../../composables/device-size';
import type { FlightOffersDisplayOptionType, ISearchStayOffersParams, ISearchFlightOffersParams, DropdownListValue, IDropdownListItemProps, ITabGroupMenuProps, ISearchFlightOffersDisplayOption, ISearchFlightOffersDisplayOptions, ISearchStayOffersDisplayOptions, ITabProps, TabGroupOtherOptions } from '../../../types';
import { DeviceSizeEnum, SearchStaysOptionButtons } from './../../../helpers/constants';

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
  ctrlKey: ControlKey,
  offersKind: OfferKind,
  items: TItem[]
}
const { ctrlKey, offersKind } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ResultItemsList' });

const { current: deviceSize } = useDeviceSize();
const { t } = useI18n();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);

const isError = ref(false);

const activeTabKey = ref<ControlKey | undefined>(getInitialActiveTabKey());

type SortOptionType = OptionName;
function getOptionCtrlKey (optionName: OptionName): ControlKey {
  const optionType: SortOptionType = optionName;
  return [...ctrlKey, toKnownElement(offersKind), toKnownElement(optionType)];
}

function getInitialActiveTabKey () : ControlKey {
  if (searchOffersStore.offersKind === 'flights') {
    const optionType = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions)?.primaryOptions.find(x => x.isActive)?.type;
    return getOptionCtrlKey(optionType ?? DefaultFlightOffersSorting);
  } else {
    return getOptionCtrlKey(SearchStaysOptionButtons[0]);
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
  logger.debug('building search stay offers tab props', { ctrlKey, displayOptions });

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < SearchStaysOptionButtons.length; i++) {
    const optionName = SearchStaysOptionButtons[i];
    result.push({
      ctrlKey: getOptionCtrlKey(optionName),
      enabled: true,
      isActive: !!activeTabKey.value && areCtrlKeysEqual(activeTabKey.value, getOptionCtrlKey(optionName)),
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

  logger.debug('search stays offers tabs props built', { ctrlKey, result });
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
  logger.debug('building search flight offers tabs props', { ctrlKey, displayOptions });

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < displayOptions.primaryOptions.length; i++) {
    const option = displayOptions.primaryOptions[i];

    const summaryShortResArgs = buildFlightsDisplayOptionSummaryResArgs(option);
    result.push({
      ctrlKey: getOptionCtrlKey(option.type),
      enabled: true,
      isActive: !!activeTabKey.value && areCtrlKeysEqual(activeTabKey.value, getOptionCtrlKey(option.type)),
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

  logger.debug('search flight offers tabs props built', { ctrlKey, result });
  return result;
}

function spliceTabsIntoOtherSortDropdown (tabProps: IDisplayOptionTabProps[], count: number): ITabGroupMenuProps | undefined {
  logger.debug('splicing tabs into other sort dropdown', { ctrlKey, numTabs: tabProps.length, count });
  if (count < 0 || count >= tabProps.length) {
    logger.warn('out of range when splicing tabs into other sort dropdown', undefined, { ctrlKey, numTabs: tabProps.length, count });
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
        isActive: !!activeTabKey.value && areCtrlKeysEqual(activeTabKey.value, o.ctrlKey),
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

  logger.debug('completed splicing tabs into other sort dropdown', { ctrlKey, numTabs: tabProps.length, count: result?.variants.length ?? 0 });
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
  logger.verbose('entered active secondary option change handler', { ctrlKey, option: value });

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
      logger.verbose('active secondary option change triggered sort refetch', { ctrlKey, option: value });
      if (searchOffersStore.offersKind === 'flights') {
        activeTabKey.value = getOptionCtrlKey(value as OptionName); // KB: in current implementation keep in sync both sort modes
      }
      setTimeout(refreshResultListAsIfSortChanged, 0);
    }
  }

  logger.debug('active secondary option change handler completed', { ctrlKey, option: value });
}

function onPrimaryActiveTabChanged (tabKey: ControlKey) {
  logger.verbose('entered active primary option change handler', { ctrlKey, tab: tabKey });

  setTimeout(() => {
    refreshResultListAsIfSortChanged();
    if (searchOffersStore.offersKind === 'flights') {
      const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions);
      secondarySort.value = storeDisplayOptions.primaryOptions.find(o => o.isActive)!.type;
    } else {
      refreshDisplayedOptionTabs();
    }
  }, 0);

  logger.debug('active primary option change handler completed', { ctrlKey, tab: tabKey });
}

function refreshResultListAsIfSortChanged () {
  logger.verbose('refreshing result list (as if sorting changed', { ctrlKey, activePrimaryOptionCtrl: activeTabKey.value });

  if (!searchOffersStore) {
    logger.debug('won', ctrlKey);
    return;
  }

  if (searchOffersStore.resultState.status !== 'error' && searchOffersStore.resultState.status !== 'fetched') {
    logger.verbose('won', { ctrlKey, status: searchOffersStore.resultState.status });
    return;
  }

  if (searchOffersStore.offersKind === 'flights') {
    let activatedPrimaryOptionType = (
      optionTabsProps.value.find(p => areCtrlKeysEqual(p.ctrlKey, activeTabKey.value!))?.optionName ?? 
      (otherSortDropdownProps.value?.variants.find(x => areCtrlKeysEqual(x.ctrlKey, activeTabKey.value!)) as IOtherDisplayOptionsTabProps)?.optionName
    );
    if (!activatedPrimaryOptionType) {
      const optionKeysLog = optionTabsProps.value.map(v => v.ctrlKey);
      const otherOptionKeysLog = otherSortDropdownProps.value?.variants.map(v => v.ctrlKey);
      logger.warn('cannot detect primary sort mode', undefined, { ctrlKey, activeTabKey: activeTabKey.value, optionTabKeys: optionKeysLog, otherSortTabKeys: otherOptionKeysLog });
      activatedPrimaryOptionType = DefaultFlightOffersSorting;
    }

    logger.verbose('updating store display options', { ctrlKey, primary: activatedPrimaryOptionType });
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
      logger.verbose('no need to refresh results (as if sorting changed) - sort mode hasn', { ctrlKey, primarySort: activatedPrimaryOptionType });
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
      logger.verbose('no need to refresh results (as if sorting changed) - sort mode hasn', { ctrlKey, sort: activatedSortType });
      return;
    }

    const storeDisplayOptions = (searchOffersStore as ISearchOffersStoreInstance<ISearchStayOffersParams>).viewState.displayOptions;
    storeDisplayOptions.sorting = activatedSortType as StayOffersSortFactor;
  }

  setTimeout(() => searchOffersStore.fetchData('sort-refetch'), 0);
  logger.debug('result list refresh (as if sorting changed) executed', ctrlKey);
}

function refreshDisplayedOptionTabs () {
  logger.debug('refreshing tabs display options', { ctrlKey, status: searchOffersStore.resultState.status });
  if (searchOffersStore.offersKind === 'flights') {
    const searchFlightsDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions;
    if (searchFlightsDisplayOptions) {
      logger.debug('using options from view state', { ctrlKey, secondarySort: searchFlightsDisplayOptions.additionalSorting });
      const displayOptionsTabs = buildSearchFlightOffersTabProps(searchFlightsDisplayOptions);
      secondarySortDropdownItemsProps.value = displayOptionsTabs.map((o) => { return { value: o.optionName, resName: getOptionResName(o.optionName) }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsTabs.length - numTabs.value), displayOptionsTabs.length - 1);
      const otherSortOptions = spliceTabsIntoOtherSortDropdown(displayOptionsTabs, numButtonsToSplice);
      optionTabsProps.value = displayOptionsTabs;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchFlightsDisplayOptions.additionalSorting;
    } else {
      logger.debug('using default flights options', ctrlKey);
      optionTabsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultFlightOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  } else {
    const searchStayDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchStayOffersDisplayOptions;
    if (searchStayDisplayOptions) {
      logger.debug('using options from view state', { ctrlKey, sort: searchStayDisplayOptions.sorting });
      const displayOptionsButtons = buildSearchStayOffersTabProps(searchStayDisplayOptions);
      secondarySortDropdownItemsProps.value = Object.keys(StayOffersSortFactorEnum).map(x => x.toLowerCase()).map((b) => { return { value: b, resName: getOptionResName(b as OptionName) }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsButtons.length - numTabs.value), displayOptionsButtons.length - 1);
      const otherSortOptions = spliceTabsIntoOtherSortDropdown(displayOptionsButtons, numButtonsToSplice);
      optionTabsProps.value = displayOptionsButtons;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchStayDisplayOptions.sorting;
    } else {
      logger.debug('using default stays options', ctrlKey);
      optionTabsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultStayOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  }
  logger.debug('tabs display options refershed', ctrlKey);
}

async function updateTabButtonsCount (): Promise<void> {
  logger.debug('updating tab count', { ctrlKey, current: numTabs.value });

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
    logger.verbose('tab count changed', { ctrlKey, old: numTabs.value, new: newTabCount });
    numTabs.value = newTabCount;
  }
}

refreshDisplayedOptionTabs();
onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
  watch(deviceSize, updateTabButtonsCount, { immediate: true });

  watch(searchOffersStore.viewState.displayOptions, () => {
    setTimeout(refreshDisplayedOptionTabs, 0);
  }, { immediate: false });
  watch(numTabs, refreshDisplayedOptionTabs, { immediate: true });

  watch(() => searchOffersStore.resultState.status, () => {
    if (searchOffersStore.resultState.status === 'error') {
      logger.warn('exception while fetching items', undefined, { ctrlKey, type: offersKind });
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
      :ctrl-key="[...ctrlKey, 'TabGroup']"
      :tabs="optionTabsProps"
      :menu="otherSortDropdownProps"
      variant="split"
      :ui="{
        list: {
          height: 'h-14 sm:h-20'
        }
      }"
    >
      <template v-for="(slotName) in ['hotels', 'motels', 'resorts', 'price', 'score', 'duration']" #[slotName]="{ tab }"  :key="`${toShortForm(ctrlKey)}-SortInfo-${slotName}`">
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
            :ctrl-key="[...ctrlKey, 'SecondarySort', 'Dropdown']"
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
              :key="`${toShortForm(ctrlKey)}-Offer-${offer.id}`"
            >
              <FlightsListItemCard v-if="offersKind === 'flights'" :ctrl-key="[...ctrlKey, 'Card', 'Flights', idx]" :offer="(offer as EntityDataAttrsOnly<IFlightOffer>)" />
              <StaysListItemCard v-else :ctrl-key="[...ctrlKey, 'Card', 'Stays', idx]" :offer="(offer as EntityDataAttrsOnly<IStayOffer>)" />
            </li>
          </ol>
          <ComponentWaitingIndicator v-else :ctrl-key="[...ctrlKey, 'Waiter']" />
        </ErrorHelm>
      </div>
    </TabsGroup>    
    <ComponentWaitingIndicator v-else :ctrl-key="[...ctrlKey, 'Waiter']" class="mt-8" />
  </section>
</template>

<script setup lang="ts" generic="TOfferKind extends OfferKind">
import { toShortForm, getFunctionalElementKey, type ControlKey, areCtrlKeysEqual } from './../../../helpers/components';
import { type SearchStaysOptionButtonKind, LOADING_STATE } from './../../../helpers/constants';
import { StayOffersSortFactorEnum, DefaultStayOffersSorting, type StayOffersSortFactor, type FlightOffersSortFactor, convertTimeOfDay, getI18nResName3, DefaultFlightOffersSorting, type EntityDataAttrsOnly, type IFlightOffer, type IStayOffer, type OfferKind, type I18nResName } from '@golobe-demo/shared';
import ComponentWaitingIndicator from '../../forms/component-waiting-indicator.vue';
import ListSortInfo from './list-sort-info.vue';
import FlightsListItemCard from './search-flights-result-card.vue';
import StaysListItemCard from './search-stays-result-card.vue';
import { getCommonServices } from '../../../helpers/service-accessors';
import { useDeviceSize } from '../../../composables/device-size';
import throttle from 'lodash-es/throttle';
import type { SearchFlightOffersSortVariant, ISearchFlightOffersSortOptions, ISearchOffersCommonSortOptions, IDropdownListItemProps, ITabGroupMenuProps, ITabProps, TabGroupOtherOptions } from '../../../types';
import { DeviceSizeEnum, SearchStaysOptionButtons } from './../../../helpers/constants';

type SortOption = FlightOffersSortFactor | StayOffersSortFactor;
type SortTabName = SearchStaysOptionButtonKind | SortOption;
interface IDisplayOptionTabProps extends ITabProps {
  optionName: SortTabName,
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
  optionName: SortOption
}

const TabIcons: ReadonlyMap<SortTabName, string> = new Map<SortTabName, string>([
  ['hotels', 'i-material-symbols-bed'], 
  ['motels', 'i-material-symbols-bed'],
  ['resorts', 'i-material-symbols-bed'],
  ['price', 'material-symbols:attach-money-rounded'],
  ['score', 'i-material-symbols-star'],
  ['duration', 'material-symbols:clock-loader-20']
]);

interface IProps {
  ctrlKey: ControlKey,
  offersKind: TOfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();
const logger = getCommonServices().getLogger().addContextProps({ component: 'ResultItemsList' });

const { current: deviceSize } = useDeviceSize();
const { t } = useI18n();

const searchOffersStore = useSearchOffersStore();

const activeTabKey = ref<ControlKey | undefined>();
const numTabs = ref<number>(offersKind === 'flights' ? 2 : 3);
const secondarySort = ref<FlightOffersSortFactor | StayOffersSortFactor | undefined>(undefined);

const showWaitingStub = computed(() => {
  return import.meta.client && (
    searchOffersStore.filterInfo[offersKind] === LOADING_STATE || 
    searchOffersStore.sortInfo[offersKind] === LOADING_STATE ||
    !optionTabProps.value?.length
  );
});
const itemsCount = computed(() => 
  searchOffersStore.items[offersKind] !== LOADING_STATE ? 
    searchOffersStore.items[offersKind].length : 0
);
const totalCount = computed(() => 
  searchOffersStore.sortInfo[offersKind] !== LOADING_STATE ? 
    searchOffersStore.sortInfo[offersKind].totalCount : 0);

const allDisplayOptionTabProps = ref<IDisplayOptionTabProps[]>([]);

const optionTabProps = computed<IDisplayOptionTabProps[]>(() => {
  return allDisplayOptionTabProps.value.length ? 
  (
    (numTabs.value > allDisplayOptionTabProps.value.length) ?
      allDisplayOptionTabProps.value :
      allDisplayOptionTabProps.value.slice(0, numTabs.value)
  ) : 
  [];
});

const otherSortDropdownProps = computed<ITabGroupMenuProps | undefined>(() => {
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  return allDisplayOptionTabProps.value.length ? (
    searchOffersSortInfo !== LOADING_STATE ? (
      sliceOtherOptionButtonsProps(
        allDisplayOptionTabProps.value, 
        Math.max(0, allDisplayOptionTabProps.value.length - numTabs.value),
        activeTabKey.value
      )
    ) : undefined
  )  : undefined;
});

const secondarySortDropdownItemsProps = computed<IDropdownListItemProps[]>(() => {
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  return searchOffersSortInfo !== LOADING_STATE ? (
    offersKind === 'flights' ?
      allDisplayOptionTabProps.value.map((o) => { 
        return { 
          value: o.optionName, 
          resName: getOptionResName(o.optionName) }; 
      }) :
      Object.keys(StayOffersSortFactorEnum)
        .map(x => x.toLowerCase() as SortOption)
        .map((b) => { 
          return { 
            value: b, 
            resName: getOptionResName(b) 
          }; 
        })
  ) : [];
});

function getOptionResName (optionName: SortTabName): I18nResName {
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

function buildSearchStayOffersTabProps (
  sortOptions: ISearchOffersCommonSortOptions,
  activeTabKey: ControlKey | undefined
): IDisplayOptionTabProps[] {
  //logger.debug('building search stay offers tab props', { ctrlKey, sortOptions, activeTabKey });

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < SearchStaysOptionButtons.length; i++) {
    const optionName = SearchStaysOptionButtons[i];
    const optionCtrlKey = getFunctionalElementKey({ sortOption: optionName, isPrimary: true });
    result.push({
      ctrlKey: getFunctionalElementKey({ sortOption: optionName, isPrimary: true }),
      enabled: true,
      isActive: !!activeTabKey && areCtrlKeysEqual(activeTabKey, optionCtrlKey),
      tabName: optionCtrlKey,
      label: {
        slotName: optionName
      },
      optionName,
      summary: {
        labelResName: getI18nResName3('searchStays', 'displayOptions', optionName as any),
        subtext: {
          resName: getI18nResName3('searchStays', 'displayOptions', 'btnSubtext'),
          resArgs: sortOptions.totalCount
        },
        icon: TabIcons.get(optionName)!
      }
    });
  }

  const defaultSortOptionIdx = result.findIndex(r => r.optionName === DefaultStayOffersSorting);
  if(defaultSortOptionIdx > 0) {
    result = [...result.splice(defaultSortOptionIdx, 1), ...result];
  }

  logger.debug('search stays offers tabs props built', { ctrlKey, activeTabKey, result });
  return result;
}

function buildFlightsDisplayOptionSummaryResArgs (displayOption: SearchFlightOffersSortVariant): { price: string, hours: string, minutes: string } | undefined {
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

function buildSearchFlightOffersTabProps (
  sortOptions: ISearchFlightOffersSortOptions,
  activeTabKey: ControlKey | undefined
): IDisplayOptionTabProps[] {
  //logger.debug('building search flight offers tabs props', { ctrlKey, sortOptions, activeTabKey });

  let result: IDisplayOptionTabProps[] = [];
  for (let i = 0; i < sortOptions.sortVariants.length; i++) {
    const option = sortOptions.sortVariants[i];

    const summaryShortResArgs = buildFlightsDisplayOptionSummaryResArgs(option);
    const optionCtrlKey = getFunctionalElementKey({ sortOption: option.type, isPrimary: true });
    result.push({
      ctrlKey: optionCtrlKey,
      enabled: true,
      isActive: !!activeTabKey && areCtrlKeysEqual(activeTabKey, optionCtrlKey),
      optionName: option.type,
      label: {
        slotName: option.type
      },
      tabName: optionCtrlKey,
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

function sliceOtherOptionButtonsProps (
  allTabProps: IDisplayOptionTabProps[], 
  count: number, 
  activeOptionKey: ControlKey | undefined
): ITabGroupMenuProps | undefined {
  logger.debug('slicing tabs into other sort dropdown', { ctrlKey, numTabs: allTabProps.length, count, activeOptionKey });
  count = count < 0 ? 0 : Math.min(count, allTabProps.length - 1);
  if(count === 0) {
    return undefined;
  }

  let variants: TabGroupOtherOptions[] = [];
  if (count > 0) {
    const sliced = allTabProps.slice(allTabProps.length - count, allTabProps.length);
    variants = sliced.map((o) => {
      return {
        ctrlKey: o.ctrlKey,
        enabled: true,
        label: {
          resName: getOptionResName(o.optionName),
        },
        isActive: !!activeOptionKey && areCtrlKeysEqual(activeOptionKey, o.ctrlKey),
        optionName: o.optionName
      };
    });
  }
  const result: ITabGroupMenuProps = {
    defaultResName: offersKind === 'flights' ? getI18nResName3('searchFlights', 'displayOptions', 'other') : getI18nResName3('searchStays', 'displayOptions', 'other'),
    enabled: true,
    selectedResName: getI18nResName3('searchOffers', 'displayOptions', 'otherSelected'),
    variants: variants,
  };

  logger.debug('completed slicing tabs into other sort dropdown', { ctrlKey, numTabs: allTabProps.length, count: result?.variants.length ?? 0, activeOptionKey });
  return result;
}

function refreshListOnSecondarySortChange (secondarySort: FlightOffersSortFactor | StayOffersSortFactor) {
  logger.verbose('entered active secondary option change handler', { ctrlKey, sort: secondarySort });

  let primarySort: SortOption;
  if(offersKind === 'flights') {
    if(searchOffersStore.sortInfo['flights'] === LOADING_STATE) {
      logger.warn('secondary sort changed while sort information is not available', { ctrlKey, sort: secondarySort });
      return;
    } else {
      primarySort = searchOffersStore.sortInfo['flights'].sorting[0];
    }
  } else {
    primarySort = secondarySort;
  }
  const newSorting = [primarySort, secondarySort];

  logger.debug('invoking sort operation', { ctrlKey, newSorting });
  searchOffersStore.sort(offersKind, newSorting);

  logger.debug('refreshing result list on secondary change handler - completed', { ctrlKey, sort: secondarySort });
}

function refreshListOnPrimarySortChange (activeOptionKey: ControlKey | undefined) {
  logger.verbose('entered active primary option change handler', { ctrlKey, activeOptionKey });

  if(offersKind === 'flights') {
    const activatedPrimaryOptionType = (
      activeOptionKey ? (
        optionTabProps.value.find(p => areCtrlKeysEqual(p.ctrlKey, activeOptionKey))?.optionName as SortOption ?? 
        (otherSortDropdownProps.value?.variants.find(x => areCtrlKeysEqual(x.ctrlKey, activeOptionKey)) as IOtherDisplayOptionsTabProps)?.optionName
      ) : undefined
    ) ?? (offersKind === 'flights' ? DefaultFlightOffersSorting : DefaultStayOffersSorting);
    const newSorting = offersKind === 'flights' ? 
      [activatedPrimaryOptionType, secondarySort.value ?? DefaultFlightOffersSorting] :
      [activatedPrimaryOptionType, activatedPrimaryOptionType];

    logger.debug('invoking sort operation', { ctrlKey, activeOptionKey, newSorting });
    searchOffersStore.sort(offersKind, newSorting);
  } else {
    logger.debug('primary sort changing has no effect on stay offers list', { ctrlKey, activeOptionKey });
  }  

  logger.debug('refreshing on primary option change handler - completed', { ctrlKey, activeOptionKey });
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

watchEffect(() => {
  //logger.debug('display options tab effect handler', { ctrlKey, offersKind, activeTabKey: activeTabKey.value });
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  if(searchOffersSortInfo === LOADING_STATE) {
    allDisplayOptionTabProps.value = [];
    return;
  }
  if(allDisplayOptionTabProps.value.length > 0) {
    return;
  }
  allDisplayOptionTabProps.value = (offersKind === 'flights' ? 
    buildSearchFlightOffersTabProps(searchOffersSortInfo as ISearchFlightOffersSortOptions, activeTabKey.value) :
    buildSearchStayOffersTabProps(searchOffersSortInfo as ISearchOffersCommonSortOptions, activeTabKey.value)
  );
});

const onWindowResize = throttle(updateTabButtonsCount, 100);
onMounted(() => { 
  watch(() => activeTabKey.value ? toShortForm(activeTabKey.value) : undefined, () => {
    logger.debug('primary active option change handler', { ctrlKey, offersKind, activeTabKey: activeTabKey.value });
    refreshListOnPrimarySortChange(activeTabKey.value);
  }, { immediate: false });

  watch(secondarySort, () => {
    logger.debug('secondary sort change handler', { ctrlKey, offersKind, newSort: secondarySort.value });
    refreshListOnSecondarySortChange(secondarySort.value!);
  }, { immediate: false });

  updateTabButtonsCount();
  window.addEventListener('resize', onWindowResize);
});

</script>

<template>
  <section class="px-2">
    <TabsGroup
      v-if="!showWaitingStub"
      v-model:active-tab-key="activeTabKey"
      :ctrl-key="[...ctrlKey, 'TabGroup']"
      :tabs="optionTabProps"
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
            {{ itemsCount }}
          </template>
          <template #total>
            <div class="font-semibold text-orange-500 dark:text-orange-400">
              &nbsp;{{ totalCount }} {{ offersKind === 'flights' ? t(getI18nResName3('searchFlights', 'displayOptions', 'flights'), totalCount) : t(getI18nResName3('searchStays', 'displayOptions', 'places'), totalCount) }}
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
        <ErrorHelm :is-error="searchOffersStore.isError[offersKind]">
          <ol v-if="searchOffersStore.items[offersKind] !== LOADING_STATE" class="space-y-6 sm:space-y-8">
            <li
              v-for="(offer, idx) in (searchOffersStore.items[offersKind])"
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

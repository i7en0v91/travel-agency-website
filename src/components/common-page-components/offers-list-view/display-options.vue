<script setup lang="ts">
import { areCtrlKeysEqual, toKnownElement, type ControlKey } from './../../../helpers/components';
import { type OfferKind, type StayOffersSortFactor, type FlightOffersSortFactor, StayOffersSortFactorEnum, convertTimeOfDay, getI18nResName3, DefaultStayOffersSorting, DefaultFlightOffersSorting } from '@golobe-demo/shared';
import type { ISearchFlightOffersParams, ISearchStayOffersParams, ISearchStayOffersDisplayOptions, IDropdownListItemProps, OtherOptionButtonVariant, IOtherOptionsButtonGroupProps, IOptionButtonProps, ISearchFlightOffersDisplayOption, ISearchFlightOffersDisplayOptions, DropdownListValue } from './../../../types';
import throttle from 'lodash-es/throttle';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { DeviceSizeEnum, SearchStaysOptionButtons, type SearchStaysOptionButtonKind } from './../../../helpers/constants';
import { getCurrentDeviceSize } from './../../../helpers/dom';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IDisplayOptionButtonProps extends IOptionButtonProps {
  type: string
}
interface IOtherDisplayOptionButtonProps extends OtherOptionButtonVariant {
  type: string
}

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const { t } = useI18n();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DisplayOptions' });
const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(offersKind, true, true);
const isError = ref(false);
const activeOptionCtrl = ref<ControlKey | undefined>(getInitialActiveOptionCtrl());

type SortOptionType = SearchStaysOptionButtonKind | FlightOffersSortFactor | StayOffersSortFactor;
function getOptionCtrlKey (optionType: SortOptionType): ControlKey {
  return [...ctrlKey, toKnownElement(offersKind), toKnownElement(optionType), 'Option'];
}

function getInitialActiveOptionCtrl () : ControlKey {
  if (searchOffersStore.offersKind === 'flights') {
    const optionType = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions)?.primaryOptions.find(x => x.isActive)?.type;
    return getOptionCtrlKey(optionType ?? DefaultFlightOffersSorting);
  } else {
    return getOptionCtrlKey(SearchStaysOptionButtons[0]);
  }
}

function getOptionResName (optionType: string): string {
  if (optionType === 'price') {
    return getI18nResName3('searchOffers', 'displayOptions', 'cheapest');
  } else if (optionType === 'score') {
    return getI18nResName3('searchOffers', 'displayOptions', 'best');
  } else if (optionType === 'rating') {
    return getI18nResName3('searchOffers', 'displayOptions', 'rating');
  }

  if (offersKind === 'flights') {
    if (optionType === 'timetodeparture') {
      return getI18nResName3('searchFlights', 'displayOptions', 'timeToDeparture');
    } else if (optionType === 'duration') {
      return getI18nResName3('searchFlights', 'displayOptions', 'quickest');
    }
  }

  throw new Error('unexpected sort option');
}

function buildSearchStayOffersButtonsProps (displayOptions: ISearchStayOffersDisplayOptions): IDisplayOptionButtonProps[] {
  logger.debug('building search stay offers buttons props', { ctrlKey, displayOptions });

  const result: IDisplayOptionButtonProps[] = [];
  for (let i = 0; i < SearchStaysOptionButtons.length; i++) {
    const label = SearchStaysOptionButtons[i];

    result.push({
      ctrlKey: getOptionCtrlKey(label),
      enabled: true,
      labelResName: getI18nResName3('searchStays', 'displayOptions', label.toLowerCase() as any),
      shortIcon: undefined,
      isActive: activeOptionCtrl.value === getOptionCtrlKey(label),
      subtextResName: getI18nResName3('searchStays', 'displayOptions', 'btnSubtext'),
      subtextResArgs: displayOptions.totalCount,
      type: label,
      role: { role: 'radio' }
    });
  }

  logger.debug('search stays offers buttons props built', ctrlKey);
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

function buildSearchFlightOffersButtonsProps (displayOptions: ISearchFlightOffersDisplayOptions): IDisplayOptionButtonProps[] {
  logger.debug('building search flight offers buttons props', { ctrlKey, displayOptions });

  const result: IDisplayOptionButtonProps[] = [];
  for (let i = 0; i < displayOptions.primaryOptions.length; i++) {
    const option = displayOptions.primaryOptions[i];

    const summaryShortResArgs = buildFlightsDisplayOptionSummaryResArgs(option);
    result.push({
      ctrlKey: getOptionCtrlKey(option.type),
      enabled: true,
      labelResName: getOptionResName(option.type),
      shortIcon: undefined,
      isActive: activeOptionCtrl.value === getOptionCtrlKey(option.type),
      subtextResName: getI18nResName3('searchFlights', 'displayOptions', 'shortSummary'),
      subtextResArgs: summaryShortResArgs,
      type: option.type,
      role: { role: 'radio' }
    });
  }

  logger.debug('search flight offers buttons props built', ctrlKey);
  return result;
}

function spliceOptionButtonsIntoOtherSortDropdown (buttonsProps: IDisplayOptionButtonProps[], count: number): IOtherOptionsButtonGroupProps | undefined {
  logger.debug('splicing buttons into other sort dropdown', { ctrlKey, numButtonProps: buttonsProps.length, count });
  if (count < 0 || count >= buttonsProps.length) {
    logger.warn('out of range when splicing buttons into other sort dropdown', undefined, { ctrlKey, numButtonProps: buttonsProps.length, count });
    count = count < 0 ? 0 : 1;
  }
  let result: IOtherOptionsButtonGroupProps | undefined;
  if (count > 0) {
    const spliced = buttonsProps.splice(buttonsProps.length - count, count);
    const otherSortOptionsProps = spliced.map((o) => {
      return {
        ctrlKey: o.ctrlKey,
        enabled: true,
        labelResName: o.labelResName,
        isActive: activeOptionCtrl.value === o.ctrlKey,
        type: o.type,
        role: { role: 'radio' as const }
      };
    });
    result = {
      ctrlKey: [...ctrlKey, 'OtherOptions'],
      defaultResName: offersKind === 'flights' ? getI18nResName3('searchFlights', 'displayOptions', 'other') : getI18nResName3('searchStays', 'displayOptions', 'other'),
      enabled: true,
      selectedResName: getI18nResName3('searchOffers', 'displayOptions', 'otherSelected'),
      variants: otherSortOptionsProps,
      role: { role: 'radio' }
    };
  }

  logger.debug('completed splicing buttons into other sort dropdown', { ctrlKey, numButtonProps: buttonsProps.length, count: result?.variants.length ?? 0 });
  return result;
}

const optionButtonsProps = ref<IDisplayOptionButtonProps[]>([]);
const otherSortDropdownProps = ref<IOtherOptionsButtonGroupProps | undefined>();
const numTabButtons = ref<number>(offersKind === 'flights' ? 2 : 3);
const secondarySortDropdownItemsProps = ref<IDropdownListItemProps[]>([]);
const secondarySort = ref<FlightOffersSortFactor | StayOffersSortFactor>();

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'filter-refetch' || searchOffersStore.resultState.status === 'error';
const showWaitingStub = ref(isShowWaitingStubNeeded());

function onActiveSecondaryOptionChanged (value?: DropdownListValue | null) {
  logger.verbose('entered active secondary option change handler', { ctrlKey, new: value });

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
      logger.verbose('active secondary option change triggered sort refetch', { ctrlKey, new: value });
      if (searchOffersStore.offersKind === 'flights') {
        activeOptionCtrl.value = getOptionCtrlKey(value as SortOptionType); // KB: in current implementation keep in sync both sort modes
      }
      setTimeout(refreshResultListAsIfSortChanged, 0);
    }
  }

  logger.debug('active secondary option change handler completed', { ctrlKey, new: value });
}

function onActivePrimaryOptionChanged (newActiveOptionCtrlKey: ControlKey, prevActiveOptionCtrlKey?: ControlKey) {
  logger.verbose('entered active primary option change handler', { ctrlKey, new: newActiveOptionCtrlKey, prev: prevActiveOptionCtrlKey });

  if (!newActiveOptionCtrlKey) {
    return;
  }

  if (prevActiveOptionCtrlKey && areCtrlKeysEqual(newActiveOptionCtrlKey, prevActiveOptionCtrlKey)) {
    logger.debug('active primary option hasn', { ctrlKey, new: newActiveOptionCtrlKey, prev: prevActiveOptionCtrlKey });
    return;
  }

  setTimeout(() => {
    refreshResultListAsIfSortChanged();
    if (searchOffersStore.offersKind === 'flights') {
      const storeDisplayOptions = (searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions);
      secondarySort.value = storeDisplayOptions.primaryOptions.find(o => o.isActive)!.type;
    } else {
      refreshDisplayedOptionButtons();
    }
  }, 0);

  logger.debug('active primary option change handler completed', { ctrlKey, new: newActiveOptionCtrlKey, prev: prevActiveOptionCtrlKey });
}

function refreshResultListAsIfSortChanged () {
  logger.verbose('refreshing result list (as if sorting changed', { ctrlKey, activePrimaryOptionCtrl: activeOptionCtrl.value });

  if (!searchOffersStore) {
    logger.debug('won', ctrlKey);
    return;
  }

  if (searchOffersStore.resultState.status !== 'error' && searchOffersStore.resultState.status !== 'fetched') {
    logger.verbose('won', { ctrlKey, status: searchOffersStore.resultState.status });
    return;
  }

  if (searchOffersStore.offersKind === 'flights') {
    const activatedPrimaryOptionType = (
      activeOptionCtrl.value ? (
        optionButtonsProps.value.find(p => areCtrlKeysEqual(p.ctrlKey, activeOptionCtrl.value!))?.type ?? 
        (otherSortDropdownProps.value?.variants.find(x => areCtrlKeysEqual(x.ctrlKey, activeOptionCtrl.value!)) as IOtherDisplayOptionButtonProps)?.type
      ) : undefined
    ) ?? DefaultFlightOffersSorting;
    if (!activatedPrimaryOptionType) {
      throw new Error('cannot detect primary sort mode');
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

function refreshDisplayedOptionButtons () {
  logger.debug('refreshing displayed option buttons', { ctrlKey, status: searchOffersStore.resultState.status });
  if (searchOffersStore.offersKind === 'flights') {
    const searchFlightsDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions;
    if (searchFlightsDisplayOptions) {
      const displayOptionsButtons = buildSearchFlightOffersButtonsProps(searchFlightsDisplayOptions);
      secondarySortDropdownItemsProps.value = displayOptionsButtons.map((o) => { return { value: o.type, resName: o.labelResName }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsButtons.length - numTabButtons.value), displayOptionsButtons.length - 1);
      const otherSortOptions = spliceOptionButtonsIntoOtherSortDropdown(displayOptionsButtons, numButtonsToSplice);
      optionButtonsProps.value = displayOptionsButtons;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchFlightsDisplayOptions.additionalSorting;
    } else {
      optionButtonsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultFlightOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  } else {
    const searchStayDisplayOptions = searchOffersStore.viewState.displayOptions as ISearchStayOffersDisplayOptions;
    if (searchStayDisplayOptions) {
      const displayOptionsButtons = buildSearchStayOffersButtonsProps(searchStayDisplayOptions);
      secondarySortDropdownItemsProps.value = Object.keys(StayOffersSortFactorEnum).map(x => x.toLowerCase()).map((b) => { return { value: b, resName: getOptionResName(b) }; });
      const numButtonsToSplice = Math.min(Math.max(0, displayOptionsButtons.length - numTabButtons.value), displayOptionsButtons.length - 1);
      const otherSortOptions = spliceOptionButtonsIntoOtherSortDropdown(displayOptionsButtons, numButtonsToSplice);
      optionButtonsProps.value = displayOptionsButtons;
      otherSortDropdownProps.value = otherSortOptions;
      secondarySort.value = searchStayDisplayOptions.sorting;
    } else {
      optionButtonsProps.value = [];
      otherSortDropdownProps.value = undefined;
      secondarySort.value = DefaultStayOffersSorting;
      secondarySortDropdownItemsProps.value = [];
    }
  }
}

async function updateTabButtonsCount (): Promise<void> {
  logger.debug('updating tab buttons count', { ctrlKey, current: numTabButtons.value });

  const deviceSize = getCurrentDeviceSize();
  let newTabButtonsCount = 1;
  switch(deviceSize) {
    case DeviceSizeEnum.LG:
      newTabButtonsCount = offersKind === 'flights' ? 2 : 3;
      break;
    case DeviceSizeEnum.XL:
    case DeviceSizeEnum.XXL:
      newTabButtonsCount = 3;
      break;
  };
  if (newTabButtonsCount !== numTabButtons.value) {
    logger.verbose('tab buttons count changed', { ctrlKey, old: numTabButtons.value, new: newTabButtonsCount });
    numTabButtons.value = newTabButtonsCount;
  }
}

refreshDisplayedOptionButtons();
const onWindowResize = throttle(updateTabButtonsCount, 100);

const updateWaitingStubValue = () => {
  showWaitingStub.value = isShowWaitingStubNeeded();
};

onMounted(() => {
  logger.verbose('mounted', { ctrlKey, type: offersKind });
  updateTabButtonsCount();

  watch(searchOffersStore.viewState.displayOptions, () => {
    setTimeout(refreshDisplayedOptionButtons);
  });
  watch(activeOptionCtrl, () => {
    setTimeout(refreshResultListAsIfSortChanged);
  }, { immediate: false });
  watch(numTabButtons, refreshDisplayedOptionButtons);
  window.addEventListener('resize', onWindowResize);

  watch(() => searchOffersStore.resultState.status, () => {
    if (searchOffersStore.resultState.status === 'error') {
      logger.warn('exception while fetching items', undefined, { ctrlKey, type: offersKind });
      isError.value = true;
    } else {
      isError.value = false;
    }
    updateWaitingStubValue();

    if (searchOffersStore.resultState.status === 'fetched' || searchOffersStore.resultState.status === 'error') {
      refreshResultListAsIfSortChanged();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});

</script>

<template>
  <section
    class="display-options"
  >
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="[...ctrlKey, 'Waiter']" class="display-options-waiter" />
    <ErrorHelm v-model:is-error="isError">
      <OptionButtonGroup
        v-if="!showWaitingStub"
        v-model:active-option-key="activeOptionCtrl"
        class="offers-list-display-options"
        :ctrl-key="[...ctrlKey, offersKind === 'flights' ? 'FlightOffers' : 'StayOffers', 'OptionBtnGroup']"
        :options="optionButtonsProps"
        :other-options="otherSortDropdownProps"
        :use-adaptive-button-width="true"
        role="radiogroup"
        @update:active-option-ctrl="onActivePrimaryOptionChanged"
      />
      <div v-if="!showWaitingStub" class="display-options-additional-div mt-xs-3 mt-s-4">
        <i18n-t :keypath="getI18nResName3('searchOffers', 'displayOptions', 'showingTotal')" tag="div" class="display-options-summary" scope="global">
          <template #count>
            {{ searchOffersStore.resultState.items.length }}
          </template>
          <template #total>
            <div class="display-options-total-count">
              &nbsp;{{ searchOffersStore.viewState.displayOptions.totalCount }} {{ offersKind === 'flights' ? t(getI18nResName3('searchFlights', 'displayOptions', 'flights'), searchOffersStore.viewState.displayOptions.totalCount) : t(getI18nResName3('searchStays', 'displayOptions', 'places'), searchOffersStore.viewState.displayOptions.totalCount) }}
            </div>
          </template>
        </i18n-t>
        <div class="display-options-secondary-sort-div">
          <div class="display-options-secondary-sort-label">
            {{ $t(getI18nResName3('searchOffers', 'displayOptions', 'sortBy')) }}
          </div>
          <DropdownList
            v-model:selected-value="secondarySort"
            :ctrl-key="[...ctrlKey, 'SecondarySort', 'Dropdown']"
            class="display-options-secondary-sort-dropdown"
            kind="secondary"
            :persistent="false"
            :items="secondarySortDropdownItemsProps"
            @update:selected-value="onActiveSecondaryOptionChanged"
          />
        </div>
      </div>
    </ErrorHelm>
  </section>
</template>

<script setup lang="ts">
import { type OfferKind, type StayOffersSortFactor, type FlightOffersSortFactor, StayOffersSortFactorEnum, convertTimeOfDay, getI18nResName3, DefaultStayOffersSorting, DefaultFlightOffersSorting } from '@golobe-demo/shared';
import { type ISearchFlightOffersParams, type ISearchStayOffersParams, type ISearchStayOffersDisplayOptions, type IDropdownListItemProps, type OtherOptionButtonVariant, type IOtherOptionsButtonGroupProps, type IOptionButtonProps, type ISearchFlightOffersDisplayOption, type ISearchFlightOffersDisplayOptions, type DropdownListValue } from './../../../types';
import throttle from 'lodash-es/throttle';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { DeviceSizeEnum, SearchStayOffersDisplayOptions, SearchFlightOffersDisplayOptions } from './../../../helpers/constants';
import { getCurrentDeviceSize } from './../../../helpers/dom';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: string,
  offersKind: OfferKind
}
const props = withDefaults(defineProps<IProps>(), {
});

interface IDisplayOptionButtonProps extends IOptionButtonProps {
  type: string
}

interface IOtherDisplayOptionButtonProps extends OtherOptionButtonVariant {
  type: string
}

const SearchStaysOptionButtons = ['hotels', 'motels', 'resorts'];

const { t } = useI18n();

const searchOffersStoreAccessor = useSearchOffersStore();
const searchOffersStore = await searchOffersStoreAccessor.getInstance(props.offersKind, true, true);

const logger = getCommonServices().getLogger();

const isError = ref(false);

const activeOptionCtrl = ref<string | undefined>(getInitialActiveOptionCtrl());

function getOptionCtrlKey (optionType: string): string {
  return `${props.ctrlKey}-${props.offersKind}-${optionType}`;
}

function getInitialActiveOptionCtrl () : string {
  if (searchOffersStore.offersKind === 'flights') {
    return getOptionCtrlKey((searchOffersStore.viewState.displayOptions as ISearchFlightOffersDisplayOptions)?.primaryOptions.find(x => x.isActive)?.type ?? DefaultFlightOffersSorting);
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

  if (props.offersKind === 'flights') {
    if (optionType === 'timetodeparture') {
      return getI18nResName3('searchFlights', 'displayOptions', 'timeToDeparture');
    } else if (optionType === 'duration') {
      return getI18nResName3('searchFlights', 'displayOptions', 'quickest');
    }
  }

  throw new Error('unexpected sort option');
}

function buildSearchStayOffersButtonsProps (displayOptions: ISearchStayOffersDisplayOptions): IDisplayOptionButtonProps[] {
  logger.debug(`(DisplayOptions) building search stay offers buttons props, ctrlKey=${props.ctrlKey}, displayOptions=${JSON.stringify(displayOptions)}`);

  const result: IDisplayOptionButtonProps[] = [];
  for (let i = 0; i < SearchStaysOptionButtons.length; i++) {
    const label = SearchStaysOptionButtons[i];

    result.push({
      ctrlKey: getOptionCtrlKey(label),
      enabled: true,
      labelResName: getI18nResName3('searchStays', 'displayOptions', label as any),
      shortIcon: undefined,
      isActive: activeOptionCtrl.value === getOptionCtrlKey(label),
      subtextResName: getI18nResName3('searchStays', 'displayOptions', 'btnSubtext'),
      subtextResArgs: displayOptions.totalCount,
      type: label,
      role: { role: 'radio' }
    });
  }

  logger.debug(`(DisplayOptions) search stays offers buttons props built, ctrlKey=${props.ctrlKey}`);
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
  logger.debug(`(DisplayOptions) building search flight offers buttons props, ctrlKey=${props.ctrlKey}, displayOptions=${JSON.stringify(displayOptions)}`);

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

  logger.debug(`(DisplayOptions) search flight offers buttons props built, ctrlKey=${props.ctrlKey}`);
  return result;
}

function spliceOptionButtonsIntoOtherSortDropdown (buttonsProps: IDisplayOptionButtonProps[], count: number): IOtherOptionsButtonGroupProps | undefined {
  logger.debug(`(DisplayOptions) splicing buttons into other sort dropdown, ctrlKey=${props.ctrlKey}, numButtonProps=${buttonsProps.length}, count=${count}`);
  if (count < 0 || count >= buttonsProps.length) {
    logger.warn(`(DisplayOptions) out of range when splicing buttons into other sort dropdown, ctrlKey=${props.ctrlKey}, numButtonProps=${buttonsProps.length}, count=${count}`);
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
      ctrlKey: `${props.ctrlKey}-OtherSortOptions`,
      defaultResName: props.offersKind === 'flights' ? getI18nResName3('searchFlights', 'displayOptions', 'other') : getI18nResName3('searchStays', 'displayOptions', 'other'),
      enabled: true,
      selectedResName: getI18nResName3('searchOffers', 'displayOptions', 'otherSelected'),
      variants: otherSortOptionsProps,
      role: { role: 'radio' }
    };
  }

  logger.debug(`(DisplayOptions) completed splicing buttons into other sort dropdown, ctrlKey=${props.ctrlKey}, numButtonProps=${buttonsProps.length}, result count=${result?.variants.length ?? 0}`);
  return result;
}

const optionButtonsProps = ref<IDisplayOptionButtonProps[]>([]);
const otherSortDropdownProps = ref<IOtherOptionsButtonGroupProps | undefined>();
const numTabButtons = ref<number>(props.offersKind === 'flights' ? 2 : 3);
const secondarySortDropdownItemsProps = ref<IDropdownListItemProps[]>([]);
const secondarySort = ref<FlightOffersSortFactor | StayOffersSortFactor>();

const isShowWaitingStubNeeded = () => !searchOffersStore || searchOffersStore.resultState.status === 'full-refetch' || searchOffersStore.resultState.status === 'filter-refetch' || searchOffersStore.resultState.status === 'error';
const showWaitingStub = ref(isShowWaitingStubNeeded());

function onActiveSecondaryOptionChanged (value?: DropdownListValue) {
  logger.verbose(`(DisplayOptions) entered active secondary option change handler, ctrlKey=${props.ctrlKey}, new=${value}`);

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
      logger.verbose(`(DisplayOptions) active secondary option change triggered sort refetch, ctrlKey=${props.ctrlKey}, new=${value}`);
      if (searchOffersStore.offersKind === 'flights') {
        activeOptionCtrl.value = getOptionCtrlKey(value as string); // KB: in current implementation keep in sync both sort modes
      }
      setTimeout(refreshResultListAsIfSortChanged, 0);
    }
  }

  logger.debug(`(DisplayOptions) active secondary option change handler completed, ctrlKey=${props.ctrlKey}, new=${value}`);
}

function onActivePrimaryOptionChanged (newActiveOptionCtrlKey: string, prevActiveOptionCtrlKey?: string) {
  logger.verbose(`(DisplayOptions) entered active primary option change handler, ctrlKey=${props.ctrlKey}, new=${newActiveOptionCtrlKey}, prev=${prevActiveOptionCtrlKey}`);

  if (!newActiveOptionCtrlKey) {
    return;
  }

  if (newActiveOptionCtrlKey === prevActiveOptionCtrlKey) {
    logger.debug(`(DisplayOptions) active primary option hasn't change, ctrlKey=${props.ctrlKey}, new=${newActiveOptionCtrlKey}, prev=${prevActiveOptionCtrlKey}`);
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

  logger.debug(`(DisplayOptions) active primary option change handler completed, ctrlKey=${props.ctrlKey}, new=${newActiveOptionCtrlKey}, prev=${prevActiveOptionCtrlKey}`);
}

function refreshResultListAsIfSortChanged () {
  logger.verbose(`(DisplayOptions) refreshing result list (as if sorting changed), ctrlKey=${props.ctrlKey}, activePrimaryOptionCtrl=${activeOptionCtrl.value}`);

  if (!searchOffersStore) {
    logger.debug(`(DisplayOptions) won't refresh result list (as if sorting changed), store is not iniitalized, ctrlKey=${props.ctrlKey}`);
    return;
  }

  if (searchOffersStore.resultState.status !== 'error' && searchOffersStore.resultState.status !== 'fetched') {
    logger.verbose(`(DisplayOptions) won't refresh result list (as if sorting changed), fetch currently in progress, ctrlKey=${props.ctrlKey}, status=${searchOffersStore.resultState.status}`);
    return;
  }

  if (searchOffersStore.offersKind === 'flights') {
    const activatedPrimaryOptionType = (optionButtonsProps.value.find(p => p.ctrlKey === activeOptionCtrl.value)?.type ?? (otherSortDropdownProps.value?.variants.find(x => x.ctrlKey === activeOptionCtrl.value) as IOtherDisplayOptionButtonProps)?.type) ?? DefaultFlightOffersSorting;
    if (!activatedPrimaryOptionType) {
      throw new Error('cannot detect primary sort mode');
    }

    logger.verbose(`(DisplayOptions) updating store display options, ctrlKey=${props.ctrlKey}, selected sort: primary=${activatedPrimaryOptionType}`);
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
      logger.verbose(`(DisplayOptions) no need to refresh results (as if sorting changed) - sort mode hasn't changed, ctrlKey=${props.ctrlKey}, primarySort=${activatedPrimaryOptionType}`);
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
      logger.verbose(`(DisplayOptions) no need to refresh results (as if sorting changed) - sort mode hasn't changed, ctrlKey=${props.ctrlKey}, sort=${activatedSortType}`);
      return;
    }

    const storeDisplayOptions = (searchOffersStore as ISearchOffersStoreInstance<ISearchStayOffersParams>).viewState.displayOptions;
    storeDisplayOptions.sorting = activatedSortType as StayOffersSortFactor;
  }

  setTimeout(() => searchOffersStore.fetchData('sort-refetch'), 0);
  logger.debug(`(DisplayOptions) result list refresh (as if sorting changed) executed, ctrlKey=${props.ctrlKey}`);
}

function refreshDisplayedOptionButtons () {
  logger.debug(`(DisplayOptions) refreshing displayed option buttons, ctrlKey=${props.ctrlKey}, status=${searchOffersStore.resultState.status}`);
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
  logger.debug(`(DisplayOptions) updating tab buttons count, ctrlKey=${props.ctrlKey}, current=${numTabButtons.value}`);

  const deviceSize = getCurrentDeviceSize();
  let newTabButtonsCount = 1;
  switch(deviceSize) {
    case DeviceSizeEnum.LG:
      newTabButtonsCount = props.offersKind === 'flights' ? 2 : 3;
      break;
    case DeviceSizeEnum.XL:
    case DeviceSizeEnum.XXL:
      newTabButtonsCount = 3;
      break;
  };
  if (newTabButtonsCount !== numTabButtons.value) {
    logger.verbose(`(DisplayOptions) tab buttons count changed, ctrlKey=${props.ctrlKey}, old=${numTabButtons.value}, new=${newTabButtonsCount}`);
    numTabButtons.value = newTabButtonsCount;
  }
}

refreshDisplayedOptionButtons();
const onWindowResize = throttle(updateTabButtonsCount, 100);

const updateWaitingStubValue = () => {
  showWaitingStub.value = isShowWaitingStubNeeded();
};

onMounted(() => {
  logger.verbose(`(DisplayOptions) mounted, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
  updateTabButtonsCount();

  watch(searchOffersStore.viewState.displayOptions, () => {
    setTimeout(refreshDisplayedOptionButtons, 0);
  });
  watch(numTabButtons, refreshDisplayedOptionButtons);
  window.addEventListener('resize', onWindowResize);

  watch(() => searchOffersStore.resultState.status, () => {
    if (searchOffersStore.resultState.status === 'error') {
      logger.warn(`(DisplayOptions) exception while fetching items, ctrlKey=${props.ctrlKey}, type=${props.offersKind}`);
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
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError" :ctrl-key="`${ctrlKey}-WaiterIndicator`" class="display-options-waiter" />
    <ErrorHelm v-model:is-error="isError">
      <OptionButtonGroup
        v-if="!showWaitingStub"
        v-model:active-option-ctrl="activeOptionCtrl"
        class="offers-list-display-options"
        :ctrl-key="props.offersKind === 'flights' ? SearchFlightOffersDisplayOptions : SearchStayOffersDisplayOptions"
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
              &nbsp;{{ searchOffersStore.viewState.displayOptions.totalCount }} {{ props.offersKind === 'flights' ? t(getI18nResName3('searchFlights', 'displayOptions', 'flights'), searchOffersStore.viewState.displayOptions.totalCount) : t(getI18nResName3('searchStays', 'displayOptions', 'places'), searchOffersStore.viewState.displayOptions.totalCount) }}
            </div>
          </template>
        </i18n-t>
        <div class="display-options-secondary-sort-div">
          <div class="display-options-secondary-sort-label">
            {{ $t(getI18nResName3('searchOffers', 'displayOptions', 'sortBy')) }}
          </div>
          <DropdownList
            v-model:selected-value="secondarySort"
            :initially-selected-value="secondarySort"
            :ctrl-key="`${props.ctrlKey}-SecondarySort`"
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

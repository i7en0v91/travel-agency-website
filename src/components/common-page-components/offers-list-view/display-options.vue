<script setup lang="ts">
import { areCtrlKeysEqual, getFunctionalElementKey, type ControlKey } from './../../../helpers/components';
import { type OfferKind, type StayOffersSortFactor, type FlightOffersSortFactor, StayOffersSortFactorEnum, convertTimeOfDay, getI18nResName3, DefaultStayOffersSorting, DefaultFlightOffersSorting } from '@golobe-demo/shared';
import type { SearchFlightOffersSortVariant, ISearchOffersCommonSortOptions, ISearchFlightOffersSortOptions, IDropdownListItemProps, OtherOptionButtonVariant, IOtherOptionsButtonGroupProps, IOptionButtonProps } from './../../../types';
import throttle from 'lodash-es/throttle';
import ComponentWaitingIndicator from './../../component-waiting-indicator.vue';
import { DeviceSizeEnum, SearchStaysOptionButtons, LOADING_STATE } from './../../../helpers/constants';
import { getCurrentDeviceSize } from './../../../helpers/dom';
import { getCommonServices } from '../../../helpers/service-accessors';

type SortOption = FlightOffersSortFactor | StayOffersSortFactor;
interface IDisplayOptionButtonProps extends IOptionButtonProps {
  type: SortOption
}
interface IOtherDisplayOptionButtonProps extends OtherOptionButtonVariant {
  type: SortOption
}

interface IProps {
  ctrlKey: ControlKey,
  offersKind: OfferKind
}
const { ctrlKey, offersKind } = defineProps<IProps>();

const { t } = useI18n();

const logger = getCommonServices().getLogger().addContextProps({ component: 'DisplayOptions' });
const searchOffersStore = useSearchOffersStore();
const activeOptionCtrl = ref<ControlKey | undefined>();

const allOptionButtonsProps = computed<IDisplayOptionButtonProps[]>(() => {
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  return searchOffersSortInfo !== LOADING_STATE ? (offersKind === 'flights' ? 
      buildSearchFlightOffersButtonsProps(searchOffersSortInfo as ISearchFlightOffersSortOptions, activeOptionCtrl.value) :
      buildSearchStayOffersButtonsProps(searchOffersSortInfo as ISearchOffersCommonSortOptions, activeOptionCtrl.value)
    ) : [];
});

const optionButtonsProps = computed<IDisplayOptionButtonProps[]>(() => {
  return allOptionButtonsProps.value.length ? (
    numTabButtons.value > allOptionButtonsProps.value.length ?
      allOptionButtonsProps.value :
      allOptionButtonsProps.value.slice(0, Math.min(numTabButtons.value, allOptionButtonsProps.value.length))
  ) : [];
});

const otherSortDropdownProps = computed<IOtherOptionsButtonGroupProps | undefined>(() => {
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  return allOptionButtonsProps.value.length ? (
    searchOffersSortInfo !== LOADING_STATE ? (
      sliceOtherOptionButtonsProps(
        allOptionButtonsProps.value, 
        Math.max(0, allOptionButtonsProps.value.length - numTabButtons.value),
        activeOptionCtrl.value
      )
    ) : undefined
  )  : undefined;
});

const secondarySortDropdownItemsProps = computed<IDropdownListItemProps[]>(() => {
  const searchOffersSortInfo = searchOffersStore.sortInfo[offersKind];
  return searchOffersSortInfo !== LOADING_STATE ? (
    offersKind === 'flights' ?
      allOptionButtonsProps.value.map((o) => { 
        return { 
          value: o.type, 
          resName: o.labelResName }; 
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

const numTabButtons = ref<number>(offersKind === 'flights' ? 2 : 3);
const secondarySort = ref<SortOption | undefined>(undefined);

const isComponentError = ref(false);
const isError = computed(() => searchOffersStore.isError[offersKind]);
const showWaitingStub = computed(() => {
  return import.meta.client && (
    searchOffersStore.filterInfo[offersKind] === LOADING_STATE || 
    searchOffersStore.sortInfo[offersKind] === LOADING_STATE ||
    !optionButtonsProps.value?.length
  );
});
const itemsCount = computed(() => 
  searchOffersStore.items[offersKind] !== LOADING_STATE ? 
    searchOffersStore.items[offersKind].length : 0
);
const totalCount = computed(() => 
  searchOffersStore.sortInfo[offersKind] !== LOADING_STATE ? 
    searchOffersStore.sortInfo[offersKind].totalCount : 0);

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

function buildSearchStayOffersButtonsProps (
  sortOptions: ISearchOffersCommonSortOptions,
  activeOptionKey?: ControlKey
): IDisplayOptionButtonProps[] {
  logger.debug('building search stay offers buttons props', { ctrlKey, sortOptions, activeOptionKey });

  const result: IDisplayOptionButtonProps[] = [];
  for (let i = 0; i < SearchStaysOptionButtons.length; i++) {
    const label = SearchStaysOptionButtons[i];

    result.push({
      ctrlKey: getFunctionalElementKey({ sortOption: label, isPrimary: true }),
      enabled: true,
      labelResName: getI18nResName3('searchStays', 'displayOptions', label.toLowerCase() as any),
      shortIcon: undefined,
      isActive: activeOptionKey && areCtrlKeysEqual(activeOptionKey, getFunctionalElementKey({ sortOption: label, isPrimary: true })),
      subtextResName: getI18nResName3('searchStays', 'displayOptions', 'btnSubtext'),
      subtextResArgs: sortOptions.totalCount,
      type: label as SortOption,
      role: { role: 'radio' }
    });
  }

  logger.debug('search stays offers buttons props built', { ctrlKey, sortOptions, activeOptionKey });
  return result;
}

function buildFlightsDisplayOptionSummaryResArgs (sortVariant: SearchFlightOffersSortVariant): { 
  price: string, 
  hours: string, 
  minutes: string 
} | undefined {
  if (sortVariant.price === undefined || sortVariant.duration === undefined) {
    return undefined;
  }

  const duration = convertTimeOfDay(sortVariant.duration!);
  return {
    price: sortVariant.price!.toFixed(0),
    hours: duration.hour24.toFixed(0),
    minutes: duration.minutes.toFixed(0)
  };
}

function buildSearchFlightOffersButtonsProps (
  sortOptions: ISearchFlightOffersSortOptions,
  activeOptionKey?: ControlKey
): IDisplayOptionButtonProps[] {
  logger.debug('building search flight offers buttons props', { ctrlKey, sortOptions, activeOptionKey });

  const result: IDisplayOptionButtonProps[] = [];
  for (let i = 0; i < sortOptions.sortVariants.length; i++) {
    const option = sortOptions.sortVariants[i];

    const summaryShortResArgs = buildFlightsDisplayOptionSummaryResArgs(option);
    result.push({
      ctrlKey: getFunctionalElementKey({ sortOption: option.type, isPrimary: true }),
      enabled: true,
      labelResName: getOptionResName(option.type),
      shortIcon: undefined,
      isActive: activeOptionKey && areCtrlKeysEqual(activeOptionKey, getFunctionalElementKey({ sortOption: option.type, isPrimary: true })),
      subtextResName: getI18nResName3('searchFlights', 'displayOptions', 'shortSummary'),
      subtextResArgs: summaryShortResArgs,
      type: option.type,
      role: { role: 'radio' }
    });
  }

  logger.debug('search flight offers buttons props built', { ctrlKey, sortOptions, activeOptionKey });
  return result;
}

function sliceOtherOptionButtonsProps (
  allButtonsProps: IDisplayOptionButtonProps[], 
  count: number,
  activeOptionKey?: ControlKey
): IOtherOptionsButtonGroupProps | undefined {
  logger.debug('slicing buttons into other sort dropdown', { ctrlKey, numButtonProps: allButtonsProps.length, count, activeOptionKey });
  count = count < 0 ? 0 : Math.min(count, allButtonsProps.length - 1);
  if(count === 0) {
    return undefined;
  }

  let variants: OtherOptionButtonVariant[] = [];
  if (count > 0) {
    const sliced = allButtonsProps.slice(allButtonsProps.length - count, allButtonsProps.length);
    variants = sliced.map((o) => {
      return {
        ctrlKey: o.ctrlKey,
        enabled: true,
        labelResName: o.labelResName,
        isActive: activeOptionKey === o.ctrlKey,
        type: o.type,
        role: { role: 'radio' as const }
      };
    });
  }
  const result: IOtherOptionsButtonGroupProps = {
    ctrlKey: [...ctrlKey, 'OtherOptions'],
    defaultResName: offersKind === 'flights' ? getI18nResName3('searchFlights', 'displayOptions', 'other') : getI18nResName3('searchStays', 'displayOptions', 'other'),
    enabled: true,
    selectedResName: getI18nResName3('searchOffers', 'displayOptions', 'otherSelected'),
    variants,
    role: { role: 'radio' }
  };

  logger.debug('completed slicing buttons into other sort dropdown', { ctrlKey, numButtonProps: allButtonsProps.length, count: result?.variants.length ?? 0, activeOptionKey });
  return result;
}

function refreshListOnPrimarySortChange(activeOptionKey?: ControlKey) {
  logger.verbose('refreshing result list on primary sort change handler', { ctrlKey, activeOptionKey });

  if(offersKind === 'flights') {
    const activatedPrimaryOptionType = (
      activeOptionKey ? (
        optionButtonsProps.value.find(p => areCtrlKeysEqual(p.ctrlKey, activeOptionKey))?.type as SortOption ?? 
        (otherSortDropdownProps.value?.variants.find(x => areCtrlKeysEqual(x.ctrlKey, activeOptionKey)) as IOtherDisplayOptionButtonProps)?.type as SortOption
      ) : undefined
    ) ?? (offersKind === 'flights' ? DefaultFlightOffersSorting : DefaultStayOffersSorting);
    const newSorting = offersKind === 'flights' ? 
      [activatedPrimaryOptionType, secondarySort.value ?? DefaultFlightOffersSorting] :
      [activatedPrimaryOptionType, activatedPrimaryOptionType];

    logger.debug('invoking sort operation', { ctrlKey, activeOptionKey, newSorting });
    // update display group active tab??
    searchOffersStore.sort(offersKind, newSorting);
  } else {
    logger.debug('primary sort changing has no effect on stay offers list', { ctrlKey, activeOptionKey });
  }  

  logger.debug('refreshing result list on primary change handler - completed', { ctrlKey, activeOptionKey });
}

function refreshListOnSecondarySortChange(secondarySort: FlightOffersSortFactor | SortOption) {
  logger.verbose('refreshing result list on secondary sort change handler', { ctrlKey, sort: secondarySort });
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
  // update display group active tab?
  searchOffersStore.sort(offersKind, newSorting);

  logger.debug('refreshing result list on secondary change handler - completed', { ctrlKey, sort: secondarySort });
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

const onWindowResize = throttle(updateTabButtonsCount, 100);
onMounted(() => { 
  watch(activeOptionCtrl, () => {
    logger.debug('primary active option change handler', { ctrlKey, offersKind, activeOptionCtrl: activeOptionCtrl.value });
    refreshListOnPrimarySortChange(activeOptionCtrl.value);
  }, { immediate: false });

  watch(secondarySort, () => {
    logger.debug('secondary sort change handler', { ctrlKey, offersKind, newSort: secondarySort.value });
    refreshListOnSecondarySortChange(secondarySort.value!);
  }, { immediate: false });

  updateTabButtonsCount();
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
});

</script>

<template>
  <section
    class="display-options"
  >
    <ComponentWaitingIndicator v-if="showWaitingStub && !isError && !isComponentError" :ctrl-key="[...ctrlKey, 'Waiter']" class="display-options-waiter" />
    <ErrorHelm v-model:is-error="isComponentError">
      <OptionButtonGroup
        v-if="!showWaitingStub"
        v-model:active-option-key="activeOptionCtrl"
        class="offers-list-display-options"
        :ctrl-key="[...ctrlKey, offersKind === 'flights' ? 'FlightOffers' : 'StayOffers', 'OptionBtnGroup']"
        :options="optionButtonsProps"
        :other-options="otherSortDropdownProps"
        :use-adaptive-button-width="true"
        role="radiogroup"
      />
      <div v-if="!showWaitingStub" class="display-options-additional-div mt-xs-3 mt-s-4">
        <i18n-t :keypath="getI18nResName3('searchOffers', 'displayOptions', 'showingTotal')" tag="div" class="display-options-summary" scope="global">
          <template #count>
            {{ itemsCount }}
          </template>
          <template #total>
            <div class="display-options-total-count">
              &nbsp;{{ totalCount }} {{ offersKind === 'flights' ? t(getI18nResName3('searchFlights', 'displayOptions', 'flights'), totalCount) : t(getI18nResName3('searchStays', 'displayOptions', 'places'), totalCount) }}
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
          />
        </div>
      </div>
    </ErrorHelm>
  </section>
</template>

import { StaysFreebiesFilterItemId, StaysAmenitiesFilterItemId, type Locale, type ILocalizableValue, type I18nResName, AvailableLocaleCodes, NumMinutesInDay, getI18nResName3, type FilterId, type ISearchStayOffersResultFilterParams, type ISearchFlightOffersResultFilterParams, type IAppLogger, DefaultFlightTripType, type EntityId, AppConfig, QueryPagePreviewModeParam, DefaultStayOffersSorting, FlightsTripTypeFilterFlexibleDatesItemId, SearchOffersPriceRange, DefaultFlightOffersSorting, FlightMinPassengers, DataKeySearchFlightOffers, DataKeySearchStayOffers, validateObjectSync, eraseTimeOfDay, type OfferKind, type IEntityCacheCityItem, type IStayOffer, type IFlightOffer, type FlightOffersSortFactor, type StayOffersSortFactor, type ISearchFlightOffersResult, type ISearchStayOffersResult, type EntityDataAttrsOnly, StaysMinGuestsCount, StaysMinRoomsCount, type FlightsFilterIds, type StaysFilterIds, FlightsFilterEnum, StaysFilterEnum, DefaultFlightClass, type TripType } from '@golobe-demo/shared';
import { computeNarrowedVariantList, computeNarrowedRange, getFunctionalElementProps, getFunctionalElementKey, type ControlKey, RESET_TO_DEFAULT } from './../helpers/components';
import { ApiEndpointFlightOffersSearch, ApiEndpointStayOffersSearch, type ISearchFlightOffersMainParamsDto, type ISearchStayOffersMainParamsDto, SearchFlightOffersMainParamsDtoSchema, SearchStayOffersMainParamsDtoSchema, type ISearchFlightOffersParamsDto, type ISearchStayOffersParamsDto, type ISearchFlightOffersResultDto, type ISearchStayOffersResultDto } from '../server/api-definitions';
import type { SearchOffersFilterRange, SearchOffersFilterVariantId, ISearchOffersRangeFilterProps, ISearchOffersChecklistFilterProps, ISearchOffersChoiceFilterProps, ISearchOffersFilterVariant, ISearchStayOffersMainParams, ISearchFlightOffersMainParams, ISearchFlightOffersSortOptions, ISearchOffersCommonSortOptions } from './../types';
import { mapSearchStayOffersResult, mapSearchedFlightOffer, createSearchFlightOfferResultLookup } from '../helpers/entity-mappers';
import { addPayload, getPayload } from './../helpers/payload';
import { Decimal } from 'decimal.js';
import { StoreKindEnum, FindFlightsPageCtrlKey, FindStaysPageCtrlKey, LOADING_STATE } from './../helpers/constants';
import { post } from './../helpers/rest-utils';
import type { ValidationError } from 'yup';
import range from 'lodash-es/range';
import omit from 'lodash-es/omit';
import dayjs from 'dayjs';
import isEqual from 'lodash-es/isEqual';
import values from 'lodash-es/values';
import fromPairs from 'lodash-es/fromPairs';
import cloneDeep from 'lodash-es/cloneDeep';
import sortBy from 'lodash-es/sortBy';
import { buildStoreDefinition } from './../helpers/stores/pinia';
import { parseQuery, parseURL } from 'ufo';
import { defu } from 'defu';
import deepmerge from 'lodash-es/merge';

/** General search params without fitlering, may be specified in url */
type ViewMainParams<TOffersKind extends OfferKind> = TOffersKind extends 'flights' ? ISearchFlightOffersMainParams : (TOffersKind extends 'stays' ? ISearchStayOffersMainParams : never);
/** Overall statistics per each sorting variants for offers list obtained with {@link ViewMainParams} */
type ViewSort<TOffersKind extends OfferKind> = (TOffersKind extends 'flights' ? FlightOffersSortFactor : (TOffersKind extends 'stays' ? StayOffersSortFactor : never));
type ViewSortOptions<TOffersKind extends OfferKind> = (TOffersKind extends 'flights' ? ISearchFlightOffersSortOptions : (TOffersKind extends 'stays' ? ISearchOffersCommonSortOptions : never)) & { sorting: ViewSort<TOffersKind>[] };
type ViewFilterProps = ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps;
type ViewFilterInfo = (ViewFilterProps & { value: SearchOffersFilterRange | SearchOffersFilterVariantId[] });
type ViewItem<TOffersKind extends OfferKind> = TOffersKind extends 'flights' ? EntityDataAttrsOnly<IFlightOffer> : (TOffersKind extends 'stays' ? EntityDataAttrsOnly<IStayOffer> : never);

/**
 * Status indicates that there is a pending operation which will entirely change object's data upon completion.
 * E.g. loading next offer's page will set 'page-fetch' on {@link OffersViewModel.status} 
 * but {@link OffersViewModel.itemIds} remain the same array with ids and only be extended when fetch is completed.
 */

type StateWillChange = typeof LOADING_STATE;
type OffersFetchStatus = 'pending' | 'completed' | 'error';
type OfferFetchTrigger = 
      'full-refetch' | // main params changed, reloading offers together with filter's values range statistics
      'filter-refetch' | // refetch was triggered by filtering - values range won't change for the view
      'sort-refetch' | // refetch was triggered by changing sorting - values range won't change for the view
      'page-fetch' // fetch was triggered by requesting next result page for more matched offers
type FilterSearchParam = { filterId: FilterId, value: any };
type SearchParams<TOffersKind extends OfferKind> = (
  Partial<ViewMainParams<TOffersKind>> & // partial, as values may not be filled, e.g. when user opens the app for the first time city search input box has nowhere to get initial values from
  { filters: FilterSearchParam[] } & 
  { 
    sort: ViewSort<TOffersKind>[],
    take: number
  }
);
type OffersFetchResultDto<TOffersKind extends OfferKind> = TOffersKind extends 'flights' ? ISearchFlightOffersResultDto : (TOffersKind extends 'stays' ? ISearchStayOffersResultDto : never);
type OffersFetchParamsDto<TOffersKind extends OfferKind> = TOffersKind extends 'flights' ? ISearchFlightOffersParamsDto : (TOffersKind extends 'stays' ? ISearchStayOffersParamsDto : never);
type OffersFetchResult<TOffersKind extends OfferKind> = TOffersKind extends 'flights' ? ISearchFlightOffersResult : (TOffersKind extends 'stays' ? ISearchStayOffersResult : never);
type OffersFetchStatusDetails<TOffersKind extends OfferKind> = { 
    type: OffersFetchStatus,
    trigger: OfferFetchTrigger, // last fetch reason
    /**
     * search params corresponding to last fetch request where omitted values 
     * were filled with values from search response upon succeeding
     * */ 
    searchParams: SearchParams<TOffersKind>,
  };
type OffersViewModel<TOffersKind extends OfferKind> = {
  offersKind: TOffersKind,
  status: OffersFetchStatusDetails<TOffersKind>,
  filterProps: ViewFilterProps[],
  sortOptions: ViewSortOptions<TOffersKind>,
  itemIds: EntityId[]
}

declare type State = {
  s_viewModel: { [ K in OfferKind ]: OffersViewModel<K> }
};

const StoreId = StoreKindEnum.SearchOffers;

declare type StoreInternal = ReturnType<typeof useSearchOffersStore>;
type Localizer = (resName: I18nResName, locale: Locale) => string;

function normalizeDateRanges(dateRange: { from?: Date, to?: Date }): { from?: Date, to?: Date } {
  const today = eraseTimeOfDay(dayjs().toDate());
  const utcOffsetMinutes = dayjs().utcOffset();
  if (dateRange.from) {
    dateRange.from = dayjs(dateRange.from).add(utcOffsetMinutes, 'minute').toDate();
    if (dayjs(dateRange.from).isBefore(today)) {
      dateRange.from = today;
    }
  }

  if (dateRange.to) {
    dateRange.to = dayjs(dateRange.to).add(utcOffsetMinutes, 'minute').toDate();
    if (dateRange.from && dayjs(dateRange.to).isBefore(dateRange.from)) {
      dateRange.to = dayjs(dateRange.from).add(AppConfig.autoInputDatesRangeDays, 'day').toDate();
    } else if (dayjs(dateRange.to).isBefore(today)) {
      dateRange.to = today;
    }
  }

  return dateRange;
};

function normalizeFlightsSearchMainParams(params: Partial<ISearchFlightOffersMainParamsDto>, logger: IAppLogger): Partial<ISearchFlightOffersParamsDto> {
  logger.debug('normalizing flights main params', { params });

  const datesNormalized = normalizeDateRanges({ from: params.dateFrom, to: params.dateTo });
  params.dateFrom = datesNormalized.from;
  params.dateTo = datesNormalized.to;

  logger.debug('flights main params normalized', { params });
  return params;
};

function normalizeStaysSearchMainParams(params: Partial<ISearchStayOffersMainParamsDto>, logger: IAppLogger): Partial<ISearchStayOffersParamsDto> {
  logger.debug('normalizing stays main params', { params });

  const datesNormalized = normalizeDateRanges({ from: params.checkIn, to: params.checkOut });
  params.checkIn = datesNormalized.from;
  params.checkOut = datesNormalized.to;    

  logger.debug('stays main params normalized', { params });
  return params;
};

async function resolveCitySlugs(slugs: string[], logger: IAppLogger) : Promise<IEntityCacheCityItem[]> {
  logger.verbose('resolving city slugs', { slugs });
  const entityCacheStore = useEntityCacheStore();
  const items = await entityCacheStore!.get({ slugs }, 'City', true);
  logger.verbose('city slugs resolved', { items });
  return items;
};

async function parseMainParamsFromUrlQuery<TOffersKind extends OfferKind>(kind: TOffersKind, query: any, logger: IAppLogger): Promise<Partial<ViewMainParams<TOffersKind>>> {
  logger.verbose('parsing main params from url query', { kind, query });

  try {
    let validationError : ValidationError | undefined;
    switch (kind) {
      case 'flights':
        validationError = validateObjectSync(omit(query, QueryPagePreviewModeParam), SearchFlightOffersMainParamsDtoSchema);
        break;
      case 'stays':
        validationError = validateObjectSync(omit(query, QueryPagePreviewModeParam), SearchStayOffersMainParamsDtoSchema);
        break;
    }
    if (validationError) {
      logger.warn('search params url query does not match schema', validationError, { kind, query });
      throw validationError;
    }

    const searchParamsQuery = kind === 'flights' ? 
      normalizeFlightsSearchMainParams(SearchFlightOffersMainParamsDtoSchema.cast(query), logger): 
      normalizeStaysSearchMainParams(SearchStayOffersMainParamsDtoSchema.cast(query), logger);
    
    let result: Partial<ViewMainParams<TOffersKind>>;
    if (kind === 'flights') {
      const fromCitySlug = (searchParamsQuery as any).fromCitySlug?.trim();
      const toCitySlug = (searchParamsQuery as any).toCitySlug?.trim();
      const slugsToResolve = [fromCitySlug, toCitySlug].filter(x => !!x).map(x => x as string);
      const cityInfos = await resolveCitySlugs(slugsToResolve, logger);
      const searchFlightParamsQuery = <ISearchFlightOffersParamsDto>searchParamsQuery;
      result = <Partial<ISearchFlightOffersMainParams>>{
        class: searchFlightParamsQuery.class,
        dateFrom: searchFlightParamsQuery.dateFrom,
        dateTo: searchFlightParamsQuery.dateTo,
        fromCityId: cityInfos.find(c => c.slug === fromCitySlug)?.id,
        toCityId: cityInfos.find(c => c.slug === toCitySlug)?.id,
        numPassengers: searchFlightParamsQuery.numPassengers,
        tripType: searchFlightParamsQuery.tripType
      } as any;
    } else {
      const citySlug = (searchParamsQuery as any).citySlug?.trim();
      const cityInfo = citySlug ? (await resolveCitySlugs([citySlug], logger))[0] : undefined;
      const searchStayParamsQuery = <ISearchStayOffersParamsDto>searchParamsQuery;
      result = <ISearchStayOffersMainParams>{
        checkIn: searchStayParamsQuery.checkIn,
        checkOut: searchStayParamsQuery.checkOut,
        cityId: cityInfo?.id,
        numGuests: searchStayParamsQuery.numGuests,
        numRooms: searchStayParamsQuery.numRooms
      } as any;
    }
    
    logger.verbose('main params parsed from url query', { kind, query });
    return result;
  } catch (err: any) {
    logger.warn('failed to parse search params from url query', err, { kind, query });
    throw err;
  }
};

function getSortingParamsControlKeys(kind: OfferKind): ControlKey[] {
  if(kind === 'flights') {
    const primary: ControlKey = [...FindFlightsPageCtrlKey, 'ListView', 'ResultItemsList', 'TabGroup'];
    const secondary: ControlKey = [...FindFlightsPageCtrlKey, 'ListView', 'ResultItemsList', 'SecondarySort', 'Dropdown'];
    return [primary, secondary];
  } else {
    return [
      [...FindStaysPageCtrlKey, 'ListView', 'ResultItemsList', 'SecondarySort', 'Dropdown'] as ControlKey
    ];
  }
}

async function setMainSearchParamControlValues<TOffersKind extends OfferKind>(
  kind: TOffersKind,
  params: Partial<ViewMainParams<TOffersKind>>
) : Promise<void> {
  const controlValuesStore = useControlValuesStore();
  if(kind === 'flights')  {
    const mainParams = params as Partial<ISearchFlightOffersMainParams>;
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'From', 'SearchList'] as ControlKey, mainParams.fromCityId ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'To', 'SearchList'] as ControlKey, mainParams.toCityId ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'FlightParams', 'FlightClass', 'Dropdown'] as ControlKey, mainParams.class ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'FlightParams', 'NumPassengers', 'Counter'] as ControlKey, mainParams.numPassengers ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'Dates', 'DatePicker'] as ControlKey, mainParams.dateFrom ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'Dates', 'DateRangePicker'] as ControlKey, 
        (mainParams.dateFrom && mainParams.dateTo) ? [mainParams.dateFrom, mainParams.dateTo] : RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'FlightOffers', 'TripType', 'Dropdown'] as ControlKey, mainParams.tripType ?? RESET_TO_DEFAULT);
  } else {
    const mainParams = params as Partial<ISearchStayOffersMainParams>;
    await controlValuesStore.setValue(['SearchOffers', 'StayOffers', 'Destination', 'SearchList'] as ControlKey, mainParams.cityId ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'StayOffers', 'CheckIn', 'DatePicker'] as ControlKey, mainParams.checkIn ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'StayOffers', 'CheckOut', 'DatePicker'] as ControlKey, mainParams.checkOut ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'StayOffers', 'Guests', 'Counter'] as ControlKey, mainParams.numGuests ?? RESET_TO_DEFAULT);
    await controlValuesStore.setValue(['SearchOffers', 'StayOffers', 'Rooms', 'Counter'] as ControlKey, mainParams.numRooms ?? RESET_TO_DEFAULT);
  }
}

async function collectSearchParams<TOffersKind extends OfferKind>(
  kind: TOffersKind, 
  query: any, 
  store: StoreInternal, 
  logger: IAppLogger
): Promise<Omit<SearchParams<TOffersKind>, 'take'>> {
  logger.verbose('collecting search params', { kind, query });

  let filterParams: FilterSearchParam[] = [];
  if(import.meta.client) {
    logger.debug('collecting filter params', { kind, query });
    const controlValuesStore = useControlValuesStore();
    const filterIds = values(kind === 'flights' ? FlightsFilterEnum : StaysFilterEnum);
    filterIds.sort();
    filterParams = filterIds.map(fId => { 
      return {
        filterId: fId,
        value: controlValuesStore.acquireValueRef(getFunctionalElementKey({ filterId: fId })).valueRef.value
      };
    });
  }

  logger.debug('collecting sorting params', { kind, query });
  const sorting: ViewSort<TOffersKind>[] = [];
  if(import.meta.client) {
    if(kind === 'flights') {
      const primarySortingValue = store.clientSetupVariables().flightsSortingValues[0].value as ControlKey ;
      const controlValueProps = getFunctionalElementProps(primarySortingValue);
      let sort = ('sortOption' in controlValueProps) ? controlValueProps.sortOption : undefined;
      if(!sort) {
        logger.warn('failed to collect sorting params, invalid primary sorting preferences', undefined, { kind, query, primarySort: primarySortingValue, props: controlValueProps });
        sort = DefaultFlightOffersSorting;
      }
      sorting.push(sort as ViewSort<TOffersKind>);
    }

    const secondarySortingValue = (kind === 'flights' ?
       store.clientSetupVariables().flightsSortingValues[1] : 
       store.clientSetupVariables().staysSortingValues[0]).value as ViewSort<TOffersKind>;
    if(kind === 'flights') {
      sorting.push(secondarySortingValue);
    } else {
      // for stay offers search primary & secondary sorting are always the same
      sorting.push(secondarySortingValue);
      sorting.push(secondarySortingValue);
    }
  } else {
    sorting.push(...getInitViewModel(kind).sortOptions.sorting);
  }

  let result: Omit<SearchParams<TOffersKind>, 'take'>;
  logger.debug('collecting main params', { kind, query });
  const controlValuesStore = useControlValuesStore();
  if(kind === 'flights') {
    let mainParams: Partial<ViewMainParams<'flights'>>;
    if(query) {
      mainParams = await parseMainParamsFromUrlQuery('flights', query, logger);
      await setMainSearchParamControlValues('flights', mainParams);
    }

    const tripType: TripType = await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'TripType', 'Dropdown']);
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if(tripType === 'oneway') {
      dateFrom = (await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'Dates', 'DatePicker']))!;
    } else {
      const dateRange: Date[] = await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'Dates', 'DateRangePicker']);
      dateFrom = dateRange?.length ? dateRange[0] : undefined;
      dateTo = (dateRange?.length ?? 0) ? dateRange[1] : undefined;
    }
    mainParams = {
      tripType,
      dateFrom,
      dateTo,
      fromCityId: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'From', 'SearchList']),
      toCityId: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'To', 'SearchList']),
      class: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'FlightParams', 'FlightClass', 'Dropdown']),
      numPassengers: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'FlightOffers', 'FlightParams', 'NumPassengers', 'Counter'])
    } as Partial<ViewMainParams<'flights'>>;

    const flightsSearchParams: Omit<SearchParams<'flights'>, 'take'> = {
      filters: filterParams,
      sort: sorting as ViewSort<'flights'>[],
      ...mainParams
    };
    result = flightsSearchParams as Omit<SearchParams<TOffersKind>, 'take'>;
  } else {
    let mainParams: Partial<ViewMainParams<'stays'>>;
    if(query) {
      mainParams = await parseMainParamsFromUrlQuery('stays', query, logger);
      await setMainSearchParamControlValues('stays', mainParams);
    }
    
    mainParams = {
      cityId: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'StayOffers', 'Destination', 'SearchList']),
      checkIn: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'StayOffers', 'CheckIn', 'DatePicker']),
      checkOut: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'StayOffers', 'CheckOut', 'DatePicker']),
      numGuests: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'StayOffers', 'Guests', 'Counter']),
      numRooms: await controlValuesStore.getValue(<ControlKey>['SearchOffers', 'StayOffers', 'Rooms', 'Counter'])
    } as Partial<ViewMainParams<'stays'>>;

    const staysSearchParams: Omit<SearchParams<'stays'>, 'take'> = {
      filters: filterParams,
      sort: sorting as ViewSort<'stays'>[],
      ...mainParams
    };
    result = staysSearchParams as Omit<SearchParams<TOffersKind>, 'take'>;
  }

  logger.verbose('search params collected', { kind, query, searchParams: result });
  return result;
}

function extractUpdatedRangeInfo(
  kind: OfferKind,
  newRanges: ISearchStayOffersResultFilterParams | ISearchFlightOffersResultFilterParams,
  filtersProps: ViewFilterProps[],
  store: StoreInternal,
  logger: IAppLogger
) {
  logger.verbose('extracting updated fitler ranges and variants info', { kind, newRanges });
  const result: { filterId: FilterId, narrowedRange: any, isRange: boolean, controlValue: any }[] = [];

  const rangeFilterValues: { filterId: FilterId, newRange: SearchOffersFilterRange, rangeLimits: { min: number, max: number } }[] = [];
  const variantFilterValues: { filterId: FilterId, newRange: ISearchOffersFilterVariant[] }[] = [];

  logger.debug('parsing range filters update params', { kind, newRanges });
  const filterId: FilterId = kind === 'flights' ? 'FlightPrice' : 'StayPrice';
  const newRange = newRanges.priceRange;
  if(newRange) {
    let rangeLimits: { min: number, max: number }; 
    switch(filterId) {
      case 'FlightPrice':
      case 'StayPrice':
        rangeLimits = SearchOffersPriceRange;
        break;
      default:
        logger.warn('range narrow info returned in response but filter range limits cannot be determined', undefined, { kind, filterId, newRanges });
        rangeLimits = { min: newRange.from, max: newRange.to };
        break;
    };
    rangeFilterValues.push({
      filterId,
      newRange: { min: newRange.from, max: newRange.to },
      rangeLimits
    });
  }

  logger.debug('parsing variant filters update params', { kind, newRanges });
  const newVariants = (newRanges as ISearchFlightOffersResultFilterParams)?.airlineCompanies;
  if(newVariants) {
    variantFilterValues.push({
      filterId: 'AirlineCompany',
      newRange: newVariants.map(v => { 
        return {
          id: v.id,  
          displayText: v.name
        } as ISearchOffersFilterVariant;
      })
    });
  }

  logger.debug('computing range filters narrowing params', { kind, params: rangeFilterValues });
  for(const rangeFilter of rangeFilterValues) {
    let controlValue: SearchOffersFilterRange | undefined;

    const filterControlValue = (
      store.clientSetupVariables().filterControlValues[kind]
      .get(rangeFilter.filterId)) as WritableComputedRef<SearchOffersFilterRange | null> | undefined;
    if(filterControlValue) {
      controlValue = filterControlValue.value ?? undefined;
    } else {
      logger.warn('range narrow info returned in response but filter control value not found', undefined, { kind, fitlerId: rangeFilter.filterId, newRanges });
      continue;
    }

    const filterProps = filtersProps.find(fp => fp.filterId === rangeFilter.filterId) as ISearchOffersRangeFilterProps | undefined;
    logger.debug('narrowing filter range', { kind, filterProps, newRanges });
    const narrowedRange = rangeFilter.newRange;
    // adjust control value
    controlValue = computeNarrowedRange(controlValue, narrowedRange, narrowedRange);
    result.push({ filterId: rangeFilter.filterId, narrowedRange, controlValue, isRange: true });
    logger.debug('filter range narrowed', { kind, filterId: rangeFilter.filterId, prevRange: filterProps?.valueRange, narrowedRange, value: controlValue });
  }

  logger.debug('computing variant filters narrowing params', { kind, params: variantFilterValues });
  for(const variantFilter of variantFilterValues) {
    let controlValue: SearchOffersFilterVariantId[] | undefined;

    const filterControlValue = (
      store.clientSetupVariables().filterControlValues[kind]
      .get(variantFilter.filterId)) as WritableComputedRef<SearchOffersFilterVariantId[] | null> | undefined;
    if(filterControlValue) {
      controlValue = filterControlValue.value ?? undefined;
    } else {
      logger.warn('variants narrow info returned in response but filter control value not found', undefined, { kind, fitlerId: variantFilter.filterId, newRanges });
      continue;
    }

    const newVariants = variantFilter.newRange;
    const filterProps = filtersProps.find(fp => fp.filterId === variantFilter.filterId) as ISearchOffersChecklistFilterProps | undefined;

    logger.debug('narrowing checklist filter variants', { kind, filterProps, newRanges });
    let narrowedVariants = computeNarrowedVariantList(filterProps?.variants, newVariants);
    // adjust control value
    narrowedVariants = computeNarrowedVariantList(
      filterProps?.variants?.length ? filterProps.variants : narrowedVariants, 
      narrowedVariants
    );
    controlValue = narrowedVariants.length ? narrowedVariants.map(v => v.id) : undefined;
    result.push({ filterId: variantFilter.filterId, narrowedRange: narrowedVariants, controlValue, isRange: false });
    logger.debug('checklist filter variants narrowed', { kind, filterId: variantFilter.filterId, prevVartiants: filterProps?.variants, narrowedRange: narrowedVariants, value: controlValue });
  }

  logger.verbose('updated filter ranges and variants info extracted', { kind, newRanges, result });
  return result;
}

function mapFlightOffersDto(resultDto: ISearchFlightOffersResultDto, logger: IAppLogger): ISearchFlightOffersResult {
  logger.debug('mapping search flight offers result dto', { resultDto });
  const lookup = createSearchFlightOfferResultLookup(resultDto);
  const transformedResult = {
    pagedItems: resultDto.pagedItems.map((dto) => { return mapSearchedFlightOffer(dto, lookup); }),
    totalCount: resultDto.totalCount,
    paramsNarrowing: resultDto.paramsNarrowing,
    topOffers: resultDto.topOffers?.map((o) => {
      return {
        duration: o.duration,
        factor: o.factor,
        price: new Decimal(o.price)
      };
    })
  };
  logger.debug('search flight offers result dto mapped', { result: transformedResult });
  return transformedResult;
};

function mapStayOffersDto(resultDto: ISearchStayOffersResultDto, logger: IAppLogger): ISearchStayOffersResult {
  logger.debug('mapping search stay offers result dto', { resultDto });
  const transformedResult = mapSearchStayOffersResult(resultDto);
  logger.debug('search stay offers result dto mapped', { result: transformedResult });
  return transformedResult;
}

const getFilterVariantLocalizableText = (resName: I18nResName, localizer: Localizer): ILocalizableValue => {
  return fromPairs(AvailableLocaleCodes.map(l => [l.toLowerCase(), localizer(resName, l)])) as any;
};
const mapNumberRangeFilterValue = (r?: {min: number, max: number}): {from: number, to: number} | undefined => { return r ? { from: r.min, to: r.max } : undefined; };
const getRatingFilterVariantId = (rating: number) => `RatingFilter-r${rating}`;
const getRatingFromFilterVariantId = (variantId?: string): number | undefined => variantId ? parseInt(variantId.replace('RatingFilter-r', '')) : undefined;
const mapRatingsFilterValue = (rating: number | undefined): number[] | undefined => rating !== undefined ? (range(0, 5).filter(r => r >= rating)) : undefined;
function mapSearchOfferRequestParams<TOffersKind extends OfferKind>(
  kind: TOffersKind, 
  params: {
    trigger: OfferFetchTrigger, 
    currentListSize: number,
    viewState: ViewSortOptions<TOffersKind>, 
    searchParams: SearchParams<TOffersKind>, 
  },
  logger: IAppLogger
): OffersFetchParamsDto<TOffersKind> {
  logger.debug('mapping search offers request body params', { kind, params });
  if (kind === 'flights') {
    const { trigger, currentListSize } = params;
    const searchParams = params.searchParams as SearchParams<'flights'>;
    const resultDto: OffersFetchParamsDto<'flights'> = {
      narrowFilterParams: trigger === 'full-refetch',
      topOffersStats: trigger === 'full-refetch' || trigger === 'filter-refetch',
      pagination: {
        skip: trigger === 'page-fetch' ? currentListSize : 0,
        take: AppConfig.searchOffers.listPageSize
      },
      primarySort: params.viewState.sorting[0],
      secondarySort: params.viewState.sorting[1],
      airlineCompanyIds: ((searchParams.filters.find(f => f.filterId === FlightsFilterEnum.AirlineCompany))?.value ?? []) as SearchOffersFilterVariantId[],
      ratings: mapRatingsFilterValue(getRatingFromFilterVariantId((searchParams.filters.find(f => f.filterId === FlightsFilterEnum.FlightRating))?.value)),
      departureTimeOfDay: mapNumberRangeFilterValue((searchParams.filters.find(f => f.filterId === FlightsFilterEnum.DepartureTime))?.value as SearchOffersFilterRange | undefined),
      price: mapNumberRangeFilterValue((searchParams.filters.find(f => f.filterId === FlightsFilterEnum.FlightPrice))?.value as SearchOffersFilterRange | undefined) ?? { from: 1, to: SearchOffersPriceRange.max },
      flexibleDates: ((searchParams.filters.find(f => f.filterId === FlightsFilterEnum.TripType))?.value as SearchOffersFilterVariantId[] | undefined)?.includes(FlightsTripTypeFilterFlexibleDatesItemId) ?? false,
      class: searchParams.class ?? DefaultFlightClass,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.tripType === 'return' ? searchParams.dateTo : undefined,
      tripType: searchParams.tripType ?? DefaultFlightTripType,
      numPassengers: searchParams.numPassengers ?? FlightMinPassengers,
      fromCityId: searchParams.fromCityId ?? undefined,
      toCityId: searchParams.toCityId ?? undefined
    };
    return resultDto as OffersFetchParamsDto<TOffersKind>;
  } else {
    const { trigger, currentListSize } = params;
    const searchParams = params.searchParams as SearchParams<'stays'>;
    const resultDto: OffersFetchParamsDto<'stays'> = {
      narrowFilterParams: trigger === 'full-refetch',
      pagination: {
        skip: trigger === 'page-fetch' ? currentListSize : 0,
        take: AppConfig.searchOffers.listPageSize
      },
      //sort: params.sorting[0],
      sort: params.viewState.sorting[0],
      price: mapNumberRangeFilterValue(searchParams.filters?.find(f => f.filterId === StaysFilterEnum.StayPrice)?.value as SearchOffersFilterRange | undefined) ?? { from: SearchOffersPriceRange.min, to: SearchOffersPriceRange.max },
      ratings: mapRatingsFilterValue(getRatingFromFilterVariantId((searchParams.filters?.find(f => f.filterId === StaysFilterEnum.StayRating)?.value))),
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      cityId: searchParams.cityId ?? undefined,
      numGuests: searchParams.numGuests ?? StaysMinGuestsCount,
      numRooms: searchParams.numRooms ?? StaysMinRoomsCount
    };
    return resultDto as OffersFetchParamsDto<TOffersKind>;
  }
};

function getFlightOffersDefaultSortOptions(): ViewSortOptions<'flights'> {
  return {
    sorting: [DefaultFlightOffersSorting, DefaultFlightOffersSorting],
    sortVariants: [
      { type: 'price' },
      { type: 'score' },
      { type: 'duration' },
      { type: 'rating' },
      { type: 'timetodeparture' }
    ],
    totalCount: 0
  };  
};

function createSearchFlightOfferFilters(localizer: Localizer, logger: IAppLogger): 
  (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps)[] {
  logger.debug('creating flight offer filters initial config');

  const priceFilter: ISearchOffersRangeFilterProps = {
    filterId: 'FlightPrice',
    captionResName: getI18nResName3('searchOffers', 'filters', 'price'),
    displayOrder: 0,
    type: 'range',
    valueRange: {
      min: 1,
      max: SearchOffersPriceRange.max
    },
    limitLabelFormatter: 'price',
  };

  const departureTimeFilter: ISearchOffersRangeFilterProps = {
    filterId: 'DepartureTime',
    captionResName: getI18nResName3('searchFlights', 'filters', 'departureTime'),
    displayOrder: 1,
    type: 'range',
    valueRange: {
      min: 0,
      max: NumMinutesInDay - 1
    },
    limitLabelFormatter: 'daytime'
  };

  const ratingFilter: ISearchOffersChoiceFilterProps = {
    filterId: 'FlightRating',
    captionResName: getI18nResName3('searchOffers', 'filters', 'rating'),
    displayOrder: 2,
    type: 'choice',
    variants: range(0, 5).map((r) => {
      return {
        id: getRatingFilterVariantId(r),
        displayText: `${r}+`
      };
    })
  };

  const companiesFilter: ISearchOffersChecklistFilterProps = {
    filterId: 'AirlineCompany',
    captionResName: getI18nResName3('searchFlights', 'filters', 'airlines'),
    displayOrder: 3,
    type: 'checklist',
    variants: undefined,
  };

  const tripsFilter: ISearchOffersChecklistFilterProps = {
    filterId: 'TripType',
    captionResName: getI18nResName3('searchFlights', 'filters', 'trips'),
    displayOrder: 4,
    type: 'checklist',
    variants: [{
      id: FlightsTripTypeFilterFlexibleDatesItemId,
      displayText: getFilterVariantLocalizableText(
        getI18nResName3('searchFlights', 'filters', 'tripsDatesFlexible'),
        localizer)
    }]
  };

  const result = [priceFilter, departureTimeFilter, ratingFilter, companiesFilter, tripsFilter];
  logger.verbose('flight offer filters initial config created', { result });
  return result;
};

function createSearchStayOfferFilters(localizer: Localizer, logger: IAppLogger): 
  (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps)[] {
  logger.debug('creating stay offer filters initial config');

  const priceFilter: ISearchOffersRangeFilterProps = {
    filterId: 'StayPrice',
    captionResName: getI18nResName3('searchOffers', 'filters', 'price'),
    displayOrder: 0,
    type: 'range',
    valueRange: {
      min: 1,
      max: SearchOffersPriceRange.max
    },
    limitLabelFormatter: 'price'
  };

  const ratingFilter: ISearchOffersChoiceFilterProps = {
    filterId: 'StayRating',
    captionResName: getI18nResName3('searchOffers', 'filters', 'rating'),
    displayOrder: 1,
    type: 'choice',
    variants: range(0, 5).map((r) => {
      return {
        id: getRatingFilterVariantId(r),
        displayText: `${r}+`
      };
    })
  };

  const freebiesLabels = ['breakfast', 'parking', 'internet', 'shuttle', 'cancellation'];
  const freebiesFilter: ISearchOffersChecklistFilterProps = {
    filterId: 'Freebies',
    captionResName: getI18nResName3('searchStays', 'filters', 'freebies'),
    displayOrder: 2,
    type: 'checklist',
    variants: freebiesLabels.map((fl) => {
      return {
        id: StaysFreebiesFilterItemId(fl),
        displayText: getFilterVariantLocalizableText(
          getI18nResName3('searchStays', 'freebies', fl as any), 
          localizer
        )
      };
    })
  };

  const amenitiesLabels = ['frontDesk', 'airConditioner', 'fitness', 'indoorPool', 'outdoorPool', 'spa', 'restaraunt', 'roomService', 'bar', 'wifi', 'teaCoffee'];
  const amenitiesFilter: ISearchOffersChecklistFilterProps = {
    filterId: 'Amenities',
    captionResName: getI18nResName3('searchStays', 'filters', 'amenities'),
    displayOrder: 3,
    type: 'checklist',
    variants: amenitiesLabels.map((al) => {
      return {
        id: StaysAmenitiesFilterItemId(al),
        displayText: getFilterVariantLocalizableText(
          getI18nResName3('searchStays', 'amenities', al as any),
          localizer
        )
      };
    })
  };

  const result = [priceFilter, ratingFilter, freebiesFilter, amenitiesFilter];
  logger.verbose('stay offer filters initial config created', { result });
  return result;
};

function getInitViewModel<TOffersKind extends OfferKind>(kind: TOffersKind): OffersViewModel<TOffersKind> {
  if(kind === 'flights') {
    const result: OffersViewModel<'flights'> = {
      offersKind: kind,
      itemIds: [],
      filterProps: [],
      sortOptions: {
        sortVariants: [],
        sorting: [DefaultFlightOffersSorting, DefaultFlightOffersSorting],
        totalCount: 0
      },
      status: {
        type: 'pending', // initially in loading state
        trigger: 'full-refetch',
        searchParams: {
          filters: [],
          sort: [DefaultFlightOffersSorting, DefaultFlightOffersSorting],
          take: 0
        }
      }
    };
    return result as OffersViewModel<TOffersKind>;
  } else {
    const result: OffersViewModel<'stays'> = {
      offersKind: kind,
      itemIds: [],
      filterProps: [],
      sortOptions: {
        sorting: [DefaultStayOffersSorting],
        totalCount: 0
      },
      status: {
        type: 'pending', // initially in loading state
        trigger: 'full-refetch',
        searchParams: {
          filters: [],
          sort: [DefaultStayOffersSorting],
          take: 0
        }
      }
    };
    return result as OffersViewModel<TOffersKind>;
  }
};

function handleFetchCompletion(store: StoreInternal, kind: OfferKind, resultDto: OffersFetchResultDto<typeof kind> | false, error?: any) {
  if(!resultDto) {
    store.fetchFailed({
      kind,
      error
    });
    return;
  }

  store.fetchSucceeded({
    kind,
    resultDto
  });
}

const StoreDef = buildStoreDefinition(StoreId, 
  (clientSideOptions) => { 
    // TODO: uncomment preview state
    // const { enabled } = usePreviewState();
    const enabled = false;

    const nuxtApp = clientSideOptions!.nuxtApp;
    const localizer: Localizer = (resName: I18nResName, locale: Locale) => 
      (nuxtApp.$i18n as any).t(resName, '', { locale }) as string;
    
    const flightsFetchBody = ref<ISearchFlightOffersParamsDto>();
    const staysFetchBody = ref<ISearchStayOffersParamsDto>();
    const fetchedOffersData = shallowRef<Map<EntityId, ViewItem<OfferKind>>>(new Map([]));

    const flightsSearchFetch = 
      useFetch(`/${ApiEndpointFlightOffersSearch}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: 'no-cache',
        dedupe: 'cancel',
        method: 'POST' as const,
        //query: { drafts: enabled },
        body: flightsFetchBody,
        default: () => [],
        key: DataKeySearchFlightOffers,
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });
    const staysSearchFetch =
      useFetch(`/${ApiEndpointStayOffersSearch}`, {
        server: false,
        lazy: true,
        immediate: false,
        cache: 'no-cache',
        dedupe: 'cancel',
        method: 'POST' as const,
        //query: { drafts: enabled },
        body: staysFetchBody,
        default: () => [],
        key: DataKeySearchStayOffers,
        $fetch: clientSideOptions!.fetchEx({ defautAppExceptionAppearance: 'error-stub' })
      });
    
    watch(flightsSearchFetch.status, () => {
      const store = useSearchOffersStore() as StoreInternal;
      if(flightsSearchFetch.status.value === 'success') {
        handleFetchCompletion(store, 'flights', flightsSearchFetch.data.value as ISearchFlightOffersResultDto);
      } else if (flightsSearchFetch.status.value === 'error') {
        handleFetchCompletion(store, 'flights', false, flightsSearchFetch.error.value);
      } else {
        store.getLogger().debug('irrelevant new offers fetch status', { kind: <OfferKind>'flights', status: flightsSearchFetch.status.value });
      }
    }, { immediate: false });

    watch(staysSearchFetch.status, () => {
      const store = useSearchOffersStore() as StoreInternal;
      if(staysSearchFetch.status.value === 'success') {
        handleFetchCompletion(store, 'stays', staysSearchFetch.data.value as ISearchStayOffersResultDto);
      } else if (staysSearchFetch.status.value === 'error') {
        handleFetchCompletion(store, 'stays', false, staysSearchFetch.error.value);
      } else {
        store.getLogger().debug('irrelevant new offers fetch status', { kind: <OfferKind>'stays', status: staysSearchFetch.status.value });
      }
    }, { immediate: false });

    const controlValuesStore = useControlValuesStore();
    const flightFilterIds = values(FlightsFilterEnum) as FlightsFilterIds[];
    const stayFilterIds = values(StaysFilterEnum) as StaysFilterIds[];
    const flightFilterControlValues = (flightFilterIds.map(fId => { 
      return [
        fId,
        controlValuesStore.acquireValueRef(getFunctionalElementKey({ filterId: fId })).valueRef
      ] as [FlightsFilterIds, WritableComputedRef<any>];
    }));
    const stayFilterControlValues = (stayFilterIds.map(fId => { 
      return [
        fId,
        controlValuesStore.acquireValueRef(getFunctionalElementKey({ filterId: fId })).valueRef
      ] as [StaysFilterIds, WritableComputedRef<any>];
    }));
    const filterControlValues: { 
      [ K in OfferKind ]: Map<FilterId, WritableComputedRef<any>> 
    } = {
      flights: new Map(flightFilterControlValues),
      stays: new Map(stayFilterControlValues)
    };

    const flightsSortingValues = 
      getSortingParamsControlKeys('flights')
      .map(k => controlValuesStore.acquireValueRef(k).valueRef as WritableComputedRef<any>);
    const staysSortingValues = 
      getSortingParamsControlKeys('stays')
      .map(k => controlValuesStore.acquireValueRef(k).valueRef as WritableComputedRef<any>);
    
    return {
      localizer,
      flightsSortingValues,
      staysSortingValues,
      flightsFetchBody,
      staysFetchBody,
      filterControlValues,
      fetchedOffersData,
      flightsSearchFetch,
      staysSearchFetch
    };
  },
  {
    state: (): State => {
      return { 
        s_viewModel: {
          flights: getInitViewModel('flights'),
          stays: getInitViewModel('stays')
        }
      };
    },
    getters: {
      /**
       * Fetched offers pages unified as one array. 
       * Any non-page refetch will reset this collection
       */
      items(): { [K in OfferKind]: ViewItem<K>[] | StateWillChange } {
        return fromPairs(
          values(this.s_viewModel).map(m => {
            const logger = this.getLogger();
            logger.debug('values, get', { kind: m.offersKind });

            const ids = m.status.type === 'pending' ? (
              m.status.trigger === 'page-fetch' ? m.itemIds : LOADING_STATE
            ) : m.itemIds;
            if(ids === LOADING_STATE) {
              return [m.offersKind, LOADING_STATE];
            }
            if(ids.length === 0) {
              return [m.offersKind, []];
            }

            let result: ViewItem<OfferKind>[];
            if(import.meta.client) {
              logger.debug('values, reading from data struct', { kind: m.offersKind });
              const fetchedOffersData = this.clientSetupVariables().fetchedOffersData.value;
              if(fetchedOffersData.size < ids.length || ids.some(id => !fetchedOffersData.has(id))) {
                return [m.offersKind, LOADING_STATE];
              }
              result = ids.map(id => fetchedOffersData.get(id)!);
            } else {
              logger.debug('values, reading from payload', { kind: m.offersKind });
              const payloadKey = m.offersKind === 'flights' ? DataKeySearchFlightOffers : DataKeySearchStayOffers;
              const fetchDto = getPayload(this.nuxtApp.payload, payloadKey);
              const fetchResult = m.offersKind === 'flights' ? 
                mapFlightOffersDto(fetchDto as ISearchFlightOffersResultDto, logger) : 
                mapStayOffersDto(fetchDto as ISearchStayOffersResultDto, logger);
              result = fetchResult.pagedItems;
            }

            logger.debug('values, get - ok', { kind: m.offersKind, result });
            return [m.offersKind, result];
          })
        ) as { [K in OfferKind]: ViewItem<K>[] | StateWillChange };
      },

      /**
       * Params used to filter all matched offers.
       * Initially are set to cover all offers obtained with {@link listParams}, 
       * but ranges & options may be subsequently narrowed by user via filter panel
       */
      filterInfo(): { [K in OfferKind]: (ViewFilterInfo[] | StateWillChange) } {
        if(import.meta.server) { // filters not applied during SSR
          return {
            flights: [],
            stays: []
          };
        }

        return fromPairs(
          values(this.s_viewModel).map(m => {
            const filterProps: ViewFilterInfo[] | StateWillChange = (
              m.status.type === 'pending' && m.status.trigger === 'full-refetch') ? 
              LOADING_STATE : 
              (
                m.filterProps.map(fp => {
                  return {
                    ...fp,
                    value: this.clientSetupVariables().filterControlValues[m.offersKind].get(fp.filterId)!.value
                  };
                })
              );
            return [m.offersKind, filterProps];
          })
        ) as { [K in OfferKind]: (ViewFilterInfo[] | StateWillChange) };
      },

      /**
       * Sorting options with summary statistics per each
       */
      sortInfo(): { [K in OfferKind]: ViewSortOptions<K> | StateWillChange } {
        return fromPairs(
          values(this.s_viewModel).map(m => {
            const sortOptions = m.status.type !== 'pending' ? m.sortOptions : (
              (m.status.trigger === 'filter-refetch' || m.status.trigger === 'full-refetch') ? 
                LOADING_STATE : m.sortOptions
            );
            return [m.offersKind, sortOptions];
          })
        ) as { [K in OfferKind]: ViewSortOptions<K> | StateWillChange };
      },

      /**
       * Indicates whether paging operation is available - i.e. only 
       * some part of offers visible in list have been fetched
       */
      hasMoreItems(): { [K in OfferKind]: boolean | StateWillChange } {
        return fromPairs(
          values(this.s_viewModel).map(m => {
            if(m.status.type === 'pending' && m.status.trigger === 'page-fetch') {
              return [m.offersKind, LOADING_STATE];
            }
            const drained = m.status.type === 'completed' && m.sortOptions.totalCount <= m.itemIds.length;
            return [m.offersKind, !drained];
          })
        ) as { [K in OfferKind]: boolean };
      },

      /** Indicates that exception has occured while constructing offers list */
      isError(): { [K in OfferKind]: boolean } {
        return fromPairs(
          values(this.s_viewModel).map(m => [m.offersKind, m.status.type === 'error'])
        ) as { [K in OfferKind]: boolean };
      }
    },
    actions: {
      /**
       * Collects general search params from default sources: 
       * - main params {@link ViewMainParams} from search offers control or from url if specified by {@link parseMainParamsFromUrlQuery}
       * - filter {@link FilterSearchParam} params from filter controls
       * - sorting from display options controls
       */
      async getSearchParams<TOffersKind extends OfferKind>(kind: TOffersKind, parseMainParamsFromUrlQuery: boolean): Promise<Omit<SearchParams<TOffersKind>, 'take'>> {
        const logger = this.getLogger();
        const query = parseMainParamsFromUrlQuery ? (
            import.meta.client ? 
              useRouter().currentRoute.value.query : 
              parseQuery(parseURL(this.nuxtApp.ssrContext!.event.path).search)
          ) : undefined;
        const result = await collectSearchParams(kind, query, this, logger) as Omit<SearchParams<TOffersKind>, 'take'>;
        if(query) {
          result.filters = [] as SearchParams<TOffersKind>['filters'];
        }
        return result;
      },

      /**
       * (Re-)loads offers - i.e. main params, filter values & sorting will be 
       * read from controls (default sources) and used to issue new search request.
       * @param options: 
       * - advanceNextPage request for next offers page
       * - overrideParams if specified then overrides search params from default sources and 
       * resets control values as for {@link OfferFetchTrigger}.{@const 'full-refetch'}
       */
      async load<TOffersKind extends OfferKind>(
        kind: TOffersKind, 
        options?: 
          { advanceNextPage: true } | 
          { overrideParams: Partial<ViewMainParams<TOffersKind>> | 'fromUrlQuery' }
      ): Promise<void> {
        const logger = this.getLogger();

        this.ensureFilters(kind);
        const modelState = this.s_viewModel[kind];

        let searchParams: SearchParams<TOffersKind>;
        const useUrlQuery = 
          (import.meta.client && !!this.nuxtApp.isHydrating) || 
          import.meta.server || 
          (!!options && 'overrideParams' in options && options.overrideParams === 'fromUrlQuery');
        const overrideParams = (!!options && 'overrideParams' in options && options.overrideParams !== 'fromUrlQuery') ? options.overrideParams : undefined;
        const advanceNextPage = !!options && 'advanceNextPage' in options && options.advanceNextPage;

        if(overrideParams) {
          logger.verbose('overriding load parameters', { kind, overrideParams });
          searchParams = deepmerge(
            await collectSearchParams(kind, {}, this, logger) as Omit<SearchParams<TOffersKind>, 'take'>,
            overrideParams,
            {
              filters: [],
              take: AppConfig.searchOffers.listPageSize
            }
          );
          await setMainSearchParamControlValues(kind, overrideParams);
        } else if(advanceNextPage) {
          if(modelState.status.type !== 'completed') {
            logger.warn('cannot start paging operation while not in completed status', undefined, { kind });
            return;
          }
          if(!this.hasMoreItems[kind]) {
            logger.warn('cannot start paging operation - no more items to fetch', { kind });
            return;
          }

          const currentCount = modelState.itemIds.length;
          const totalCount = modelState.sortOptions.totalCount;
          searchParams = cloneDeep(modelState.status.searchParams) as SearchParams<TOffersKind>;
          searchParams.take = Math.min(totalCount, currentCount + AppConfig.searchOffers.listPageSize);
          logger.verbose('preparing to fetch more items', { kind, take: searchParams.take });
        } else {
          const generalParams = await this.getSearchParams(kind, useUrlQuery);
          searchParams = defu(
            generalParams, 
            { take: AppConfig.searchOffers.listPageSize }
          ) as SearchParams<TOffersKind>;
        }
        logger.verbose('result search params computed', { kind, searchParams });

        if(modelState.status.type === 'pending' && isEqual(modelState.status.searchParams, searchParams)) {
          logger.verbose('skipping load operation, as it is currently executing with the same search params', { kind, searchParams });
          return;
        }

        const requestBody = this.setLoadState({ kind, searchParams, overrideParams, force: false });
        if(!requestBody) {
          logger.verbose(`skipping load operation`, { kind, searchParams });
          return;
        }

        if(import.meta.client) {
          if(this.nuxtApp.isHydrating) {
            logger.verbose(`completing fetch on hydration`, { kind, searchParams });
            const payloadKey = kind === 'flights' ? DataKeySearchFlightOffers : DataKeySearchStayOffers;
            const resultDto = getPayload(this.nuxtApp.payload, payloadKey) as OffersFetchResultDto<typeof kind>;
            this.fetchSucceeded({ kind, resultDto });
          }
        } else {
          logger.debug(`sending fetch request`, { kind, searchParams });
          let resultDto: OffersFetchResultDto<typeof kind>;
          try {
            if(kind === 'flights') {
              resultDto = await post<ISearchFlightOffersParamsDto, ISearchFlightOffersResultDto>(
                `/${ApiEndpointFlightOffersSearch}`, 
                undefined, 
                requestBody as ISearchFlightOffersParamsDto, 
                undefined, 
                false, 
                this.nuxtApp.ssrContext?.event, 
                'throw'
              ) as OffersFetchResultDto<typeof kind>;
            } else {
              resultDto = await post<ISearchStayOffersParamsDto, ISearchStayOffersResultDto>(
                `/${ApiEndpointStayOffersSearch}`, 
                undefined, 
                requestBody as ISearchStayOffersParamsDto, 
                undefined, 
                false, 
                this.nuxtApp.ssrContext?.event, 
                'throw'
              ) as OffersFetchResultDto<typeof kind>;
            }
            this.fetchSucceeded({ kind, resultDto });
          } catch(error: any) {
            logger.error('offers search fetch failed', error, { kind, searchParams });
            this.fetchFailed({ kind, error });
          }
        }
      },

      /**
       * Resets controls on filter panel to initial values and re-fetches offers (filter-refetch {@link OfferFetchTrigger}
       */
      async resetFilters(kind: OfferKind): Promise<void> {
        this.resetFilterParams(kind);
        await this.load(kind);
      },

      /**
       * Applies sorting and triggers offers fetch request 
       * (sort-refetch {@link OfferFetchTrigger}, also resets pagination)
       */
      async sort(kind: OfferKind, sort: ViewSort<typeof kind>[]): Promise<void> {
        this.changeSorting({ kind, newSorting: sort });
        await this.load(kind);
      },

      /**
       * Issues fetch request to server for next portion of offers (page-fetch {@link OfferFetchTrigger}). 
       * Adds news items to the already loaded offers collection {@link OffersViewModel.itemIds}
       */
      async loadNextPage(kind: OfferKind): Promise<void> {
        await this.load(kind, { advanceNextPage: true });
      }
    },
    patches: {
      setLoadState(args: { 
        kind: OfferKind, 
        searchParams: SearchParams<typeof args['kind']>, 
        force: boolean,
        overrideParams?: Partial<ViewMainParams<OfferKind>>,
      }): OffersFetchParamsDto<typeof kind> | undefined {
        const logger = this.getLogger();

        const { kind, searchParams, overrideParams } = args;
        const modelState = this.s_viewModel[kind] as OffersViewModel<typeof kind>;
        if(modelState.status.type === 'pending' && isEqual(modelState.status.searchParams, searchParams)) {
          logger.warn('skipping load setup, as it is currently executing with the same search params', { kind, searchParams });
          return;
        }

        const isHydrating = import.meta.client && this.nuxtApp.isHydrating;
        let triggerType: OfferFetchTrigger;
        if(modelState.status.type !== 'error') {
          if(!isHydrating) {
            const isMainParamsChanged = !isEqual(
              omit(modelState.status.searchParams, ['filters', 'sort', 'take']),
              omit(searchParams, ['filters', 'sort', 'take'])
            );

            const prevFilterParams = sortBy([...modelState.status.searchParams.filters], ['filterId']);
            const newFilterParams = sortBy([...searchParams.filters], ['filterId']);
            const isFilterParamsChanged = !isEqual(
              prevFilterParams,
              newFilterParams
            );
            const isSortingChanged = !isEqual(
              modelState.status.searchParams.sort,
              searchParams.sort
            );
            const isPagingChanged = modelState.status.searchParams.take !== searchParams.take;
            triggerType = isMainParamsChanged ? 'full-refetch' :
                          isFilterParamsChanged ? 'filter-refetch' :
                          isSortingChanged ? 'sort-refetch' :
                          isPagingChanged ? 'page-fetch' :
                          'full-refetch';
            if([isMainParamsChanged, isFilterParamsChanged, isSortingChanged, isPagingChanged].every(t => !t)) {
              if(args.force) {
                logger.verbose('search params havent changed, force reload will fallback to full refetch', { kind, searchParams, currentParams: modelState.status.searchParams });
              } else {
                logger.verbose('skipping load request, search params havent changed, force reload was not requested', { kind, searchParams, currentParams: modelState.status.searchParams });
                return;
              }
            } else {
              logger.debug('refresh trigger computed', { kind, searchParams, trigger: triggerType });
            }            
          } else {
            logger.debug('using full-refetch trigger on hydration', { kind, searchParams });
            triggerType = 'full-refetch';
          }
        } else {
          logger.verbose('view model is in error state, full refresh will be performed', { kind, searchParams });
          triggerType = 'full-refetch';
        }

        if(triggerType === 'full-refetch') {
          searchParams.filters = [];
        }

        const requestBody = mapSearchOfferRequestParams(kind, {
          trigger: triggerType,
          currentListSize: modelState.itemIds.length,
          viewState: modelState.sortOptions,
          searchParams
        }, logger);

        if(import.meta.client && !this.nuxtApp.isHydrating) {
          const fetchBody = kind === 'flights' ? this.clientSetupVariables().flightsFetchBody : this.clientSetupVariables().staysFetchBody;
          fetchBody.value = requestBody;
        }
        this.$patch(() => {
          modelState.status.type = 'pending';
          modelState.status.trigger = triggerType;
          modelState.status.searchParams = searchParams;
        });
        if(import.meta.client && triggerType === 'full-refetch') {
          logger.verbose('resetting filter control values due to full-refetch', { kind, overrideParams });
          this.resetFilterParams(kind);
        }

        return requestBody;
      },

      changeSorting(args: { kind: OfferKind, newSorting: ViewSort<typeof args.kind>[] }) {
        const logger = this.getLogger();

        if(!import.meta.client) {
          logger.warn('changing sorting has no effect on server', undefined, { args });
          return;
        }
        const { kind, newSorting } = args;
        const modelState = this.s_viewModel[kind] as OffersViewModel<typeof kind>;

        logger.verbose('changing sorting', { kind, currentSorting: modelState.sortOptions.sorting, newSorting });
        const sortingControlValues =  kind === 'flights' ? 
          this.clientSetupVariables().flightsSortingValues :
          this.clientSetupVariables().staysSortingValues;
        sortingControlValues.forEach((cv, idx) => {
          if(kind === 'flights') {
            cv.value = idx === 0 ? 
              getFunctionalElementKey({ sortOption: newSorting[idx], isPrimary: true }) : // primary sorting - options buttons group
              newSorting[idx]; // secondary sorting - dropdown  
          } else {
            cv.value = newSorting[0]; // primary & secondary sorting for stays are the same - dropdown
          }
        });
        
        logger.debug('updating model sorting properties', { kind });
        this.$patch(() => {
          modelState.sortOptions.sorting = [...newSorting];
        });

        logger.debug('sorting changed', { kind, newSorting });
      },

      resetFilterParams(kind: OfferKind) {
        const logger = this.getLogger();

        if(!import.meta.client) {
          logger.warn('resetting fitler params has no effect on server', undefined, { kind });
          return;
        }

        logger.verbose('resetting filter control values', { kind });
        // reset to undefined - fallback to filter control value default init logic
        for(const fc of this.clientSetupVariables().filterControlValues[kind].values()) {
          fc.value = undefined;
        }

        logger.debug('filter control values were reset', { kind });
      },

      ensureFilters(kind: OfferKind) {
        const logger = this.getLogger();

        if(!import.meta.client) {
          logger.debug('fitlers are not used on server', { kind });
          return;
        }

        const modelState = this.s_viewModel[kind] as OffersViewModel<typeof kind>;
        if(modelState.filterProps?.length > 0) {
          return;
        }

        logger.debug('adding filters to store model', { kind });
        this.$patch(() => {
          modelState.filterProps = kind === 'flights' ?
            createSearchFlightOfferFilters(this.clientSetupVariables().localizer, logger) :
            createSearchStayOfferFilters(this.clientSetupVariables().localizer, logger);
        });        
      },

      narrowFilterParams(args: { 
        kind: OfferKind, 
        paramsNarrowing: (
          typeof args.kind extends 'flights' ? 
            ISearchFlightOffersResultFilterParams : 
            ISearchStayOffersResultFilterParams
        )
      }) {
        const logger = this.getLogger();
        if(!import.meta.client) {
          logger.warn('params narrowing has no effect on server', undefined, args);  
          return;
        }
        
        const { kind, paramsNarrowing } = args;
        const modelState = this.s_viewModel[kind];
        const filterRangesUpdateInfo = extractUpdatedRangeInfo(
          kind, 
          paramsNarrowing, 
          modelState.filterProps,
          useSearchOffersStore() as StoreInternal,
          logger
        );
        if(!filterRangesUpdateInfo.length) {
          logger.verbose('filters range and variants update info empty', { kind });
          return;
        }

        logger.debug('actualizing filter values after ranges narrowing', { kind, newRanges: filterRangesUpdateInfo });
        for(const updateInfo of filterRangesUpdateInfo) {
          const filterControlValue = this.clientSetupVariables().filterControlValues[kind].get(updateInfo.filterId)!;
          filterControlValue.value = updateInfo.controlValue;
        }
        
        const updatedModelFilters = [...modelState.filterProps];
        for(const updateInfo of filterRangesUpdateInfo) {
          const filterProps = updatedModelFilters.find(f => f.filterId === updateInfo.filterId)!;
          if(updateInfo.isRange) {
            (filterProps as ISearchOffersRangeFilterProps).valueRange = updateInfo.narrowedRange;
          } else {
            (filterProps as ISearchOffersChecklistFilterProps).variants = updateInfo.narrowedRange;
          }
        }
        logger.debug('updating filter ranges in stores view model', { kind, newFilterProps: updatedModelFilters });
        this.$patch(() => { 
          modelState.filterProps = updatedModelFilters;
        });

        logger.verbose('filters param ranges narrowed', { kind, newRanges: filterRangesUpdateInfo });
      },

      fetchSucceeded(args: { kind: OfferKind, resultDto: OffersFetchResultDto<typeof args.kind> }) {
        const logger = this.getLogger();
        const { kind, resultDto } = args;
        const modelState = this.s_viewModel[kind];
        logger.verbose('fetch succeeded', { kind, fetchStatus: modelState.status, result: resultDto });

        const result: OffersFetchResult<typeof kind> = kind === 'flights' ? 
          mapFlightOffersDto(resultDto as ISearchFlightOffersResultDto, logger) : 
          mapStayOffersDto(resultDto as ISearchStayOffersResultDto, logger);
        if(import.meta.client) {
          logger.debug('consuming offers data from succeeded fetch', { kind });
          const offersData = this.clientSetupVariables().fetchedOffersData.value;
          for(const resultItem of result.pagedItems) {
            offersData.set(resultItem.id, resultItem);
          }
        } else {
          logger.debug('adding offers data to payload', { kind });
          const payloadKey = kind === 'flights' ? DataKeySearchFlightOffers : DataKeySearchStayOffers;
          addPayload(this.nuxtApp.payload, payloadKey, resultDto!);
        }

        const requestParamsActualizations: Partial<SearchParams<typeof args.kind>> = {};
        if(import.meta.client) {
          if(result.paramsNarrowing) {
            this.narrowFilterParams({ kind, paramsNarrowing: result.paramsNarrowing });

            logger.debug('saving request filters params actualization from response', { kind });
            requestParamsActualizations.filters = [];
            for(const fe of this.clientSetupVariables().filterControlValues[kind].entries()) {
              requestParamsActualizations.filters.push(
                {
                  filterId: fe[0],
                  value: fe[1].value
                }
              );
            }
            logger.debug('request filters params actualization saved', { kind, filters: requestParamsActualizations.filters });
          } else {
            logger.debug('no filters params narrowing information in response', { kind });
          }
        }

        logger.verbose('updating model from search result', { kind });
        this.$patch(() => {
          // update sort options info
          if((modelState.status.trigger === 'full-refetch' || modelState.status.trigger === 'filter-refetch')) {
            if(kind === 'flights') {
              const newSortOptions: Partial<ViewSortOptions<'flights'>> = {
                sortVariants: (result as ISearchFlightOffersResult).topOffers?.map((o) => {
                  return {
                    duration: o.duration,
                    price: o.price,
                    type: o.factor
                  };
                }),
                totalCount: result.totalCount
              };
              modelState.sortOptions ??= getFlightOffersDefaultSortOptions();
              deepmerge(modelState.sortOptions, newSortOptions);
            } else {
              modelState.sortOptions.totalCount = result.totalCount;
            }
          }

          // update displayed items
          const isPendingPaging = modelState.status.type === 'pending' && modelState.status.trigger === 'page-fetch';
          if(isPendingPaging) {
            modelState.itemIds.push(...result.pagedItems.map(i => i.id));
          } else {
            modelState.itemIds = result.pagedItems.map(i => i.id);
          }

          // actualizing search request params
          modelState.status.searchParams = {
            ...cloneDeep(modelState.status.searchParams),
            ...requestParamsActualizations
          };

          // mark model is ready for display
          modelState.status.type = 'completed';
        });

        if(import.meta.client) {
          triggerRef(this.clientSetupVariables().fetchedOffersData);
        }

        logger.verbose('succeeded fetch processing completed', { kind, fetchStatus: modelState.status });
      },

      fetchFailed(args: { kind: OfferKind, error: any }) {
        const logger = this.getLogger();
        const { kind, error } = args;
        const modelState = this.s_viewModel[kind] as OffersViewModel<typeof kind>;
        if(modelState.status.type === 'pending' && modelState.status.trigger === 'page-fetch') {
          logger.warn('next page fetch failed, displayed list wont change', error, { kind, fetchStatus: modelState.status });
          this.$patch(() => {
            modelState.status.type = 'completed';
          });
        } else {
          logger.warn('offers fetch failed', error, { kind, fetchStatus: modelState.status });
          this.$patch(() => {
            modelState.status.type = 'error';
            modelState.itemIds = [];
            modelState.sortOptions = getInitViewModel(kind).sortOptions;
          });
        }
      }
    }
  }
);

export const useSearchOffersStore = defineStore(StoreId, StoreDef);
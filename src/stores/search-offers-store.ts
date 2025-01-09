import { getI18nResName2, getI18nResName3, type I18nResName, AppConfig, AppException, AppExceptionCodeEnum, QueryPagePreviewModeParam, StaysAmenitiesFilterItemId, StaysAmenitiesFilterId, StaysFreebiesFilterItemId, StaysFreebiesFilterId, NumMinutesInDay, StaysPriceFilterId, DefaultStayOffersSorting, StaysRatingFilterId, FlightsTripTypeFilterFlexibleDatesItemId, SearchOffersPriceRange, FlightsTripTypeFilterId, FlightsPriceFilterId, FlightsDepartureTimeFilterId, FlightsRatingFilterId, FlightsAirlineCompanyFilterId, DefaultFlightOffersSorting, DataKeyEntityCacheItems, FlightMinPassengers, UserNotificationLevel, AvailableLocaleCodes, DataKeySearchFlightOffers, DataKeySearchStayOffers, validateObject, eraseTimeOfDay, type OfferKind, type IEntityCacheCityItem, type IStayOffer, type IFlightOffer, type FlightOffersSortFactor, type StayOffersSortFactor, type ISearchFlightOffersResult, type ISearchStayOffersResult, type EntityDataAttrsOnly, type ILocalizableValue, StaysMinGuestsCount, StaysMinRoomsCount } from '@golobe-demo/shared';
import { mapSearchFlightOffersResult, mapSearchStayOffersResult, mapSearchedFlightOffer, createSearchFlightOfferResultLookup } from '../helpers/entity-mappers';
import { type ISearchListItem, type ISearchOffersFilterVariant, type ISearchFlightOffersParams, type ISearchStayOffersParams, type ISearchStayOffersMainParams, type ISearchFlightOffersMainParams, type ISearchFlightOffersDisplayOptions, type ISearchStayOffersDisplayOptions, type ISearchOffersChecklistFilterProps, type ISearchOffersRangeFilterProps, type ISearchFlightOffersDisplayOption, type ISearchOffersChoiceFilterProps } from './../types';
import { ApiEndpointFlightOffersSearch, ApiEndpointStayOffersSearch, type ISearchFlightOffersMainParamsDto, type ISearchStayOffersMainParamsDto, SearchFlightOffersMainParamsDtoSchema, SearchStayOffersMainParamsDtoSchema, type ISearchFlightOffersParamsDto, type ISearchStayOffersParamsDto, type ISearchFlightOffersResultDto, type ISearchStayOffersResultDto } from '../server/api-definitions';
import { post } from './../helpers/rest-utils';
import { addPayload, getPayload } from './../helpers/payload';
import type { ValidationError } from 'yup';
import dayjs from 'dayjs';
import uniqueBy from 'lodash-es/unionBy';
import assign from 'lodash-es/assign';
import range from 'lodash-es/range';
import { Decimal } from 'decimal.js';
import isEqual from 'lodash-es/isEqual';
import keys from 'lodash-es/keys';
import pick from 'lodash-es/pick';
import cloneDeep from 'lodash-es/cloneDeep';
import orderBy from 'lodash-es/orderBy';
import fromPairs from 'lodash-es/fromPairs';
import omit from 'lodash-es/omit';
import { usePreviewState } from './../composables/preview-state';
import { getClientServices, getCommonServices, getServerServices } from '../helpers/service-accessors';

export type OffersStoreInstanceFetchStatus = 'full-refetch' | 'filter-refetch' | 'sort-refetch' | 'page-fetch' | 'fetched' | 'error';
export interface ISearchOffersStoreInstance<TParams extends ISearchFlightOffersParams | ISearchStayOffersParams, TMainParams = TParams extends ISearchFlightOffersParams ? ISearchFlightOffersMainParams : ISearchStayOffersMainParams, TDisplayOptions = TParams extends ISearchFlightOffersParams ? ISearchFlightOffersDisplayOptions : ISearchStayOffersDisplayOptions, TItem = TParams extends ISearchFlightOffersParams ? EntityDataAttrsOnly<IFlightOffer> : EntityDataAttrsOnly<IStayOffer>, TSortFactor = TParams extends ISearchFlightOffersParams ? FlightOffersSortFactor : StayOffersSortFactor> {
  offersKind: OfferKind,
  viewState: {
    currentSearchParams: Partial<TParams>, // partial, as values may not be filled, e.g. when user opens the app for the first time and input fields have nowhere to get initial values from
    displayOptions: TDisplayOptions
  },
  resultState: {
    items: TItem[],
    status: OffersStoreInstanceFetchStatus,
    usedSearchParams: (Partial<TParams> & { displayOptions: TDisplayOptions }) | undefined,
    initialDataFetched: 'no' | 'payload-parsed' | 'yes'
  },
  setMainSearchParams: (params: Partial<TMainParams>) => boolean,
  /**
  * Changes display options - sorting. Triggers data refetch from server
  * @param primary primary sort attribute
  * @param secondary secondary sort attribute, available only for stay offers
  */
  setSorting: (primary: TSortFactor, secondary?: TSortFactor) => void,
  fetchData: (offersFetchMode: Exclude<OffersStoreInstanceFetchStatus, 'fetched' | 'error'>) => Promise<void>,
  resetFetchState: () => void
}

export interface ISearchOffersStore {
  getInstance<
    TParams extends ISearchFlightOffersParams | ISearchStayOffersParams,
    TOffersKind = TParams['kind']
  >(offersKind: TOffersKind, takeInitialValuesFromUrlQuery: boolean, initialDataFetch: boolean) : Promise<ISearchOffersStoreInstance<TParams>>;
}

function isFlightOffersInstance (instance: ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>): instance is ISearchOffersStoreInstance<ISearchFlightOffersParams> {
  return instance.offersKind === 'flights';
}

type EntityCacheItemsPayload = IEntityCacheCityItem[];
export const useSearchOffersStore = defineStore('search-offers-store', () => {
  const logger = getCommonServices().getLogger();
  logger.info('(search-offers-store) start store construction');

  const nuxtApp = useNuxtApp();
  const { enabled } = usePreviewState();

  const commonOffersFetchOptions = {
    server: false,
    lazy: true,
    immediate: false,
    watch: false as const,
    cache: 'no-cache' as const,
    method: 'POST' as const
  };

  let searchStayOffersInstance: ISearchOffersStoreInstance<ISearchStayOffersParams> | undefined;
  let searchFlightOffersInstance: ISearchOffersStoreInstance<ISearchFlightOffersParams> | undefined;
  
  const searchFlightOffersRequestBody = ref<ISearchFlightOffersParamsDto>();
  const searchFlightOffersFetch = useFetch(`/${ApiEndpointFlightOffersSearch}`,
    {
      ...commonOffersFetchOptions,
      query: { drafts: enabled },
      body: searchFlightOffersRequestBody,
      transform: (resultDto: ISearchFlightOffersResultDto): ISearchFlightOffersResult => {
        logger.debug('(search-offers-store) transforming search flight offers result dto');
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
        logger.debug('(search-offers-store) search flight offers result dto transformed');
        return transformedResult;
      },
      key: DataKeySearchFlightOffers,
      $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
    });

  const searchStayOffersRequestBody = ref<ISearchStayOffersParamsDto>();
  const searchStayOffersFetch = useFetch(`/${ApiEndpointStayOffersSearch}`,
    {
      ...commonOffersFetchOptions,
      body: searchStayOffersRequestBody,
      query: { drafts: enabled },
      transform: (resultDto: ISearchStayOffersResultDto): ISearchStayOffersResult => {
        logger.debug('(search-offers-store) transforming search stay offers result dto');
        const transformedResult = mapSearchStayOffersResult(resultDto);
        logger.debug('(search-offers-store) search stay offers result dto transformed');
        return transformedResult;
      },
      key: DataKeySearchStayOffers,
      $fetch: nuxtApp.$fetchEx({ defautAppExceptionAppearance: 'error-page' })
    });

  const userNotificationStore = useUserNotificationStore();

  const router = useRouter();
  const { t } = useI18n();

  const clientEntityCache = import.meta.client ? getClientServices().getEntityCache() : undefined;
  const serverEntityCacheLogic = import.meta.server ? getServerServices()!.getEntityCacheLogic() : undefined;

  const getFilterVariantLocalizableText = (resName: I18nResName): ILocalizableValue => {
    return fromPairs(AvailableLocaleCodes.map(l => [l.toLowerCase(), t(resName, '', { locale: l })])) as any;
  };

  const normalizeDateRanges = (dateRange: { from?: Date, to?: Date }): { from?: Date, to?: Date } => {
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

  const normalizeFlightsSearchMainParams = (params: Partial<ISearchFlightOffersMainParamsDto>): Partial<ISearchFlightOffersParamsDto> => {
    logger.debug(`(search-offers-store) normalizing main params, kind=${<OfferKind>'flights'}, params=${JSON.stringify(params)}`);

    const datesNormalized = normalizeDateRanges({ from: params.dateFrom, to: params.dateTo });
    params.dateFrom = datesNormalized.from;
    params.dateTo = datesNormalized.to;

    logger.debug(`(search-offers-store) main params normalized, kind=${<OfferKind>'flights'}, params=${JSON.stringify(params)}`);
    return params;
  };

  const normalizeStaysSearchMainParams = (params: Partial<ISearchStayOffersMainParamsDto>): Partial<ISearchStayOffersParamsDto> => {
    logger.debug(`(search-offers-store) normalizing main params, kind=${<OfferKind>'stays'}, params=${JSON.stringify(params)}`);

    const datesNormalized = normalizeDateRanges({ from: params.checkIn, to: params.checkOut });
    params.checkIn = datesNormalized.from;
    params.checkOut = datesNormalized.to;    

    logger.debug(`(search-offers-store) main params normalized, kind=${<OfferKind>'stays'}, params=${JSON.stringify(params)}`);
    return params;
  };

  const resolveCitySlugs = async (slugs: string[]) : Promise<IEntityCacheCityItem[]> => {
    if (import.meta.client) {
      logger.verbose(`(search-offers-store) resolving city slugs (client), ids=${JSON.stringify(slugs)}`);
      const items = (await clientEntityCache!.get<'City'>([], slugs, 'City', { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default }))!;
      logger.verbose(`(search-offers-store) city slugs resolved (client), result=${JSON.stringify(items)}`);
      return items;
    } else {
      logger.verbose(`(search-offers-store) resolving city slugs (server), ids=${JSON.stringify(slugs)}`);
      const items = await serverEntityCacheLogic!.get<'City'>([], slugs, 'City', enabled);
      addPayload(nuxtApp, DataKeyEntityCacheItems, uniqueBy([...((nuxtApp.payload[DataKeyEntityCacheItems] ?? []) as EntityCacheItemsPayload), ...items], 'id'));
      logger.verbose(`(search-offers-store) city slugs resolved (server), result=${JSON.stringify(items)}`);
      return items;
    }
  };

  const parseMainParamsFromUrlQuery = async <TParams extends ISearchFlightOffersMainParams | ISearchStayOffersMainParams>(kind: OfferKind): Promise<Partial<TParams> | undefined> => {
    logger.verbose(`(search-offers-store) parsing url query for main params, kind=${kind}, query=${JSON.stringify(router.currentRoute.value.query)}, path=${router.currentRoute.value.path}`);
    const query = router.currentRoute.value.query ? omit(router.currentRoute.value.query, QueryPagePreviewModeParam) : {};
    if (!keys(query).length) {
      logger.verbose(`(search-offers-store) url query is empty, kind=${kind}, path=${router.currentRoute.value.path}`);
      return undefined;
    }

    try {
      let validationError : ValidationError | undefined;
      switch (kind) {
        case 'flights':
          validationError = await validateObject(omit(query, QueryPagePreviewModeParam), SearchFlightOffersMainParamsDtoSchema);
          break;
        case 'stays':
          validationError = await validateObject(omit(query, QueryPagePreviewModeParam), SearchStayOffersMainParamsDtoSchema);
          break;
      }
      if (validationError) {
        logger.warn(`(search-offers-store) search params url query does not match schema, kind=${kind}, path=${router.currentRoute.value.path}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, undefined, query);
        return undefined;
      }

      const searchParamsQuery = kind === 'flights' ? normalizeFlightsSearchMainParams(<ISearchFlightOffersMainParamsDto>(SearchFlightOffersMainParamsDtoSchema.cast(query))) : normalizeStaysSearchMainParams(<ISearchStayOffersMainParamsDto>(SearchStayOffersMainParamsDtoSchema.cast(query)));
      if (!searchParamsQuery) {
        logger.warn(`(search-offers-store) failed to parse search params url query, kind=${kind}, path=${router.currentRoute.value.path}`, undefined, query);
        return undefined;
      }

      let result: Partial<TParams>;
      if (kind === 'flights') {
        const searchFlightParamsQuery = <ISearchFlightOffersParamsDto>searchParamsQuery;
        const cityInfos = await resolveCitySlugs([searchFlightParamsQuery.fromCitySlug?.trim(), searchFlightParamsQuery.toCitySlug?.trim()].filter(x => x).map(x => x as string));
        result = <Partial<ISearchFlightOffersMainParams>>{
          class: searchFlightParamsQuery.class,
          dateFrom: searchFlightParamsQuery.dateFrom,
          dateTo: searchFlightParamsQuery.dateTo,
          fromCity: cityInfos.find(c => c.slug === searchFlightParamsQuery.fromCitySlug),
          toCity: cityInfos.find(c => c.slug === searchFlightParamsQuery.toCitySlug),
          numPassengers: searchFlightParamsQuery.numPassengers,
          tripType: searchFlightParamsQuery.tripType
        } as any;
      } else {
        const searchStayParamsQuery = <ISearchStayOffersParamsDto>searchParamsQuery;
        const cityInfo = searchStayParamsQuery.citySlug ? (await resolveCitySlugs([searchStayParamsQuery.citySlug?.trim()]))[0] : undefined;
        result = <ISearchStayOffersMainParams>{
          checkIn: searchStayParamsQuery.checkIn,
          checkOut: searchStayParamsQuery.checkOut,
          city: cityInfo,
          numGuests: searchStayParamsQuery.numGuests,
          numRooms: searchStayParamsQuery.numRooms
        } as any;
      }
      logger.verbose(`(search-offers-store) main params parsed from url query, kind=${kind}, path=${router.currentRoute.value.path}, result=${JSON.stringify(result)}`);
      return result;
    } catch (err: any) {
      logger.warn(`(search-offers-store) failed to parse search params url query, kind=${kind}, path=${router.currentRoute.value.path}`, err, query);
      return undefined;
    }
  };

  const ensureCitySlug = async (cityItem: ISearchListItem): Promise<void> => {
    if (cityItem.slug) {
      return;
    }

    const entityCache = getClientServices().getEntityCache();
    const cached = (await entityCache.get<'City'>([cityItem.id], [], 'City', { expireInSeconds: AppConfig.caching.clientRuntime.expirationsSeconds.default }));
    if ((cached?.length ?? 0) === 0) {
      logger.warn(`(search-offers-store) failed to ensure city item slug: cityId=${cityItem.id}`);
      userNotificationStore.show({
        level: UserNotificationLevel.ERROR,
        resName: getI18nResName2('appErrors', 'unknown')
      });
      return;
    }

    cityItem.slug = cached![0].slug;
    logger.debug(`(search-offers-store) city item slug filled: cityId=${cityItem.id}, slug=${cityItem.slug}`);
  };

  const getFetchRequestParams = async <TStore extends ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>>(
    instance: TStore, offersFetchMode: Exclude<OffersStoreInstanceFetchStatus, 'fetched' | 'error'>): Promise<ISearchFlightOffersParamsDto | ISearchStayOffersParamsDto> => {
    logger.debug(`(search-offers-store) constructing fetch request body params, kind=${instance.offersKind}, offersFetchMode=${offersFetchMode}`);
    const mapNumberRangeFilterValue = (r?: {min: number, max: number}): {from: number, to: number} | undefined => { return r ? { from: r.min, to: r.max } : undefined; };
    if (isFlightOffersInstance(instance)) {
      if (instance.viewState.currentSearchParams.fromCity) {
        await ensureCitySlug(instance.viewState.currentSearchParams.fromCity);
      }
      if (instance.viewState.currentSearchParams.toCity) {
        await ensureCitySlug(instance.viewState.currentSearchParams.toCity);
      }

      return <ISearchFlightOffersParamsDto>{
        narrowFilterParams: offersFetchMode === 'full-refetch',
        topOffersStats: offersFetchMode === 'full-refetch' || offersFetchMode === 'filter-refetch',
        pagination: {
          skip: offersFetchMode === 'page-fetch' ? instance.resultState.items.length : 0,
          take: AppConfig.searchOffers.listPageSize
        },
        primarySort: instance.viewState.displayOptions.primaryOptions.find(o => o.isActive)?.type ?? DefaultFlightOffersSorting,
        secondarySort: instance.viewState.displayOptions.additionalSorting ?? DefaultFlightOffersSorting,
        airlineCompanyIds: (instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsAirlineCompanyFilterId) as ISearchOffersChecklistFilterProps)?.currentValue,
        ratings: mapRatingsFilterValue(getRatingFromFilterVariantId((instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsRatingFilterId) as ISearchOffersChoiceFilterProps)?.currentValue)) as number[] | undefined,
        departureTimeOfDay: mapNumberRangeFilterValue((instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsDepartureTimeFilterId) as ISearchOffersRangeFilterProps)?.currentValue),
        price: mapNumberRangeFilterValue((instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsPriceFilterId) as ISearchOffersRangeFilterProps)?.currentValue) ?? { from: 1, to: SearchOffersPriceRange.max },
        flexibleDates: (instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsTripTypeFilterId) as ISearchOffersChecklistFilterProps)?.currentValue?.includes(FlightsTripTypeFilterFlexibleDatesItemId) ?? false,
        class: instance.viewState.currentSearchParams.class ?? 'economy',
        dateFrom: instance.viewState.currentSearchParams.dateFrom /* range of dates will be used on server */,
        dateTo: instance.viewState.currentSearchParams.tripType === 'return' ? (instance.viewState.currentSearchParams.dateTo /* range of dates will be used on server */) : undefined,
        tripType: instance.viewState.currentSearchParams.tripType ?? 'oneway',
        numPassengers: instance.viewState.currentSearchParams.numPassengers ?? FlightMinPassengers,
        fromCitySlug: instance.viewState.currentSearchParams.fromCity?.slug,
        toCitySlug: instance.viewState.currentSearchParams.toCity?.slug
      };
    } else {
      if (instance.viewState.currentSearchParams.city) {
        await ensureCitySlug(instance.viewState.currentSearchParams.city);
      }

      return {
        narrowFilterParams: offersFetchMode === 'full-refetch',
        pagination: {
          skip: offersFetchMode === 'page-fetch' ? instance.resultState.items.length : 0,
          take: AppConfig.searchOffers.listPageSize
        },
        sort: instance.viewState.displayOptions.sorting ?? DefaultStayOffersSorting,
        price: mapNumberRangeFilterValue((instance.viewState.currentSearchParams.filters?.find(f => f.filterId === StaysPriceFilterId) as ISearchOffersRangeFilterProps)?.currentValue) ?? { from: 0, to: SearchOffersPriceRange.max },
        ratings: mapRatingsFilterValue(getRatingFromFilterVariantId((instance.viewState.currentSearchParams.filters?.find(f => f.filterId === StaysRatingFilterId) as ISearchOffersChoiceFilterProps)?.currentValue)) as number[] | undefined,
        checkIn: instance.viewState.currentSearchParams.checkIn /* range of dates will be used on server */,
        checkOut: instance.viewState.currentSearchParams.checkOut /* range of dates will be used on server */,
        citySlug: instance.viewState.currentSearchParams.city?.slug,
        numGuests: instance.viewState.currentSearchParams.numGuests ?? StaysMinGuestsCount,
        numRooms: instance.viewState.currentSearchParams.numRooms ?? StaysMinRoomsCount
      };
    }
  };

  const getFlightOffersDefaultPrimaryOptions = (): ISearchFlightOffersDisplayOption[] => {
    const result = [
      { type: 'price', isActive: false },
      { type: 'score', isActive: false },
      { type: 'duration', isActive: false },
      { type: 'rating', isActive: false },
      { type: 'timetodeparture', isActive: false }
    ] as ISearchFlightOffersDisplayOption[];
    result.forEach((o) => { o.isActive = (o.type === DefaultStayOffersSorting); });
    return result;
  };

  const processFetchResult = <
      TStore extends ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>,
      TFetchResult extends ISearchFlightOffersResult | ISearchStayOffersResult
    >(instance: TStore, result: TFetchResult) => {
    logger.verbose(`(search-offers-store) processing fetch result, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, numItems=${result.pagedItems.length}, totalCount=${result.totalCount}`);

    try {
      instance.viewState.displayOptions.totalCount = result.totalCount;
      if (instance.resultState.status === 'page-fetch') {
        instance.resultState.items.push(...(result.pagedItems as any[]));
      } else {
        instance.resultState.items = result.pagedItems;
      }

      if (isFlightOffersInstance(instance)) {
        const fetchResult = result as ISearchFlightOffersResult;

        // parameters narrowing
        const priceFilter = instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsPriceFilterId) as ISearchOffersRangeFilterProps;
        if (priceFilter && fetchResult.paramsNarrowing?.priceRange) {
          const narrowingRange = fetchResult.paramsNarrowing.priceRange;
          logger.debug(`(search-offers-store) applying price narrowing, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, from=${narrowingRange.from}, to=${narrowingRange.to}`);
          priceFilter.applyNarrowing(narrowingRange.from, narrowingRange.to);
        }

        const airlineCompaniesFilter = instance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsAirlineCompanyFilterId) as ISearchOffersChecklistFilterProps;
        if (airlineCompaniesFilter && fetchResult.paramsNarrowing?.airlineCompanies) {
          const narrowingVariants = fetchResult.paramsNarrowing.airlineCompanies.map((i) => { return { id: i.id.toString(), displayText: i.name } as ISearchOffersFilterVariant; });
          logger.debug(`(search-offers-store) applying airline companies narrowing, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, count=${narrowingVariants.length}`);
          airlineCompaniesFilter.applyNarrowing(narrowingVariants);
        }

        // update display options state
        if (instance.resultState.status !== 'page-fetch' && instance.resultState.status !== 'sort-refetch') {
          const currentlyActiveTab = instance.viewState.displayOptions.primaryOptions.find(x => x.isActive)?.type ?? DefaultFlightOffersSorting;
          instance.viewState.displayOptions.primaryOptions = fetchResult.topOffers?.map((o) => {
            return <ISearchFlightOffersDisplayOption>{
              duration: o.duration,
              price: o.price,
              type: o.factor,
              isActive: o.factor === currentlyActiveTab
            };
          }) ?? getFlightOffersDefaultPrimaryOptions();
        }
      } else {
        const fetchResult = result as ISearchStayOffersResult;

        // parameters narrowing
        const priceFilter = instance.viewState.currentSearchParams.filters?.find(f => f.filterId === StaysPriceFilterId) as ISearchOffersRangeFilterProps;
        if (priceFilter && fetchResult.paramsNarrowing?.priceRange) {
          const narrowingRange = fetchResult.paramsNarrowing.priceRange;
          logger.debug(`(search-offers-store) applying price narrowing, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, from=${narrowingRange.from}, to=${narrowingRange.to}`);
          priceFilter.applyNarrowing(narrowingRange.from, narrowingRange.to);
        }
      }
    } catch (err: any) {
      logger.warn(`(search-offers-store) failed to process fetched offers, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, numItems=${result.pagedItems.length}, totalCount=${result.totalCount}`, err, instance.resultState.usedSearchParams);
      instance.resultState.items = [];
      instance.resultState.status = 'error';
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot process data from server', 'error-stub');
    }

    instance.resultState.status = 'fetched';
    instance.resultState.initialDataFetched = 'yes';
    logger.verbose(`(search-offers-store) fetch result processed, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}, numItems=${result.pagedItems.length}, totalCount=${result.totalCount}`);
  };

  const clearFilterParams = <TStore extends ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>>(instance: TStore): void => {
    logger.debug(`(search-offers-store) clearing filter parameters, kind=${instance.offersKind}`);
    if (isFlightOffersInstance(instance)) {
      instance.viewState.currentSearchParams.filters = createSearchFlightOfferFilters();
    } else {
      instance.viewState.currentSearchParams.filters = createSearchStayOfferFilters();
    }
  };

  async function fetchOffersStatusChangeHandler<TResultDto extends ISearchFlightOffersResultDto | ISearchStayOffersResultDto>(offerKind: OfferKind, fetch: ReturnType<typeof useFetch<TResultDto | undefined>>): Promise<void> {
    logger.verbose(`(search-offers-store) handling offers fetch status change, kind=${offerKind}, status=${fetch.status.value}`);
    if (fetch.status.value === 'idle' || fetch.status.value === 'pending') {
      return;
    }

    const instance = offerKind === 'flights' ? searchFlightOffersInstance : searchStayOffersInstance;
    if (!instance) {
      logger.warn(`(search-offers-store) cannot handle offers fetch status change, instance has not been initialized, kind=${offerKind}, status=${fetch.status.value}`);
      throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'cannot fetch offers from server', 'error-stub');
    }

    if (fetch.status.value === 'error') {
      logger.warn(`(search-offers-store) exception occured while fetching offers, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}`, fetch.error.value, instance.resultState.usedSearchParams);
      instance.resultState.items = [];
      instance.resultState.status = 'error';
      return;
    }

    const fetchResult = fetch.data.value;
    if (!fetchResult) {
      logger.warn(`(search-offers-store) failed to fetch offers (empty), kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}`, undefined, instance.resultState.usedSearchParams);
      instance.resultState.items = [];
      instance.resultState.status = 'error';
      return;
    }

    if (instance.resultState.status === 'fetched') {
      logger.debug(`(search-offers-store) skipping offers result processing, already processed, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}`);
      return;
    }

    await processFetchResult(instance, fetchResult as any);
    logger.verbose(`(search-offers-store) fetching offers completed, kind=${instance.offersKind}, offersFetchMode=${instance.resultState.status}`);
  }

  const startWatchingForFetchResults = <TResultDto extends ISearchFlightOffersResultDto | ISearchStayOffersResultDto>(offerKind: OfferKind, fetch: ReturnType<typeof useFetch<TResultDto | undefined>>) => {
    logger.verbose(`(search-offers-store) starting to watch for offers fetch status change, kind=${offerKind}`);
    watch(fetch.status, () => fetchOffersStatusChangeHandler(offerKind, fetch));
  };

  const resetFetchState = <TStore extends ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>>(instance: TStore) => {
    logger.debug(`(search-offers-store) resetting fetch state, kind=${instance.offersKind}`);
    instance.resultState.items = [];
    instance.resultState.status = 'fetched';
    instance.resultState.initialDataFetched = 'payload-parsed';
    logger.debug(`(search-offers-store) fetch state has been reset, kind=${instance.offersKind}`);
  };

  const fetchData = async <
                TStore extends ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>
            >(instance: TStore, offersFetchMode: Exclude<OffersStoreInstanceFetchStatus, 'fetched' | 'error'>): Promise<void> => {
    logger.verbose(`(search-offers-store) fetching offers, kind=${instance.offersKind}, offersFetchMode=${offersFetchMode}`);

    switch (instance.resultState.status) {
      case 'error':
      case 'fetched':
        break;
      default:
        logger.verbose(`(search-offers-store) won't fetch offers as it is in progress, kind=${instance.offersKind}, offersFetchMode=${offersFetchMode}, currentStatus=${instance.resultState.status}`);
        return;
    }
    instance.resultState.status = offersFetchMode;

    if (offersFetchMode === 'full-refetch') {
      clearFilterParams(instance);
    }

    let searchParamsDto = await getFetchRequestParams(instance, offersFetchMode);
    instance.resultState.usedSearchParams = { ...cloneDeep(instance.viewState.currentSearchParams), displayOptions: cloneDeep(instance.viewState.displayOptions) as any };
    try {
      if (import.meta.server) {
        let responseDto: ISearchFlightOffersResultDto | ISearchStayOffersResultDto | undefined;
        let fetchResult: ISearchFlightOffersResult | ISearchStayOffersResult | undefined;
        const payloadKey = isFlightOffersInstance(instance) ? DataKeySearchFlightOffers : DataKeySearchStayOffers;
        const payload = getPayload(nuxtApp, payloadKey);
        if (payload) {
          logger.debug(`(search-offers-store) reusing initial search offers data from payload, kind=${instance.offersKind}`);
          fetchResult = payload;
        } else {
          logger.verbose(`(search-offers-store) creating initial search offers payload, kind=${instance.offersKind}`);

          if (isFlightOffersInstance(instance)) {
            responseDto = await post<ISearchFlightOffersParamsDto, ISearchFlightOffersResultDto>(`/${ApiEndpointFlightOffersSearch}`, undefined, searchParamsDto as ISearchFlightOffersParamsDto, undefined, false, nuxtApp?.ssrContext?.event, 'throw');
            if (responseDto) {
              fetchResult = mapSearchFlightOffersResult(responseDto);
            }
          } else {
            responseDto = await post<ISearchStayOffersParamsDto, ISearchStayOffersResultDto>(`/${ApiEndpointStayOffersSearch}`, undefined, searchParamsDto as ISearchStayOffersParamsDto, undefined, false, nuxtApp?.ssrContext?.event, 'throw');
            if (responseDto) {
              fetchResult = mapSearchStayOffersResult(responseDto);
            }
          }

          addPayload(nuxtApp, payloadKey, responseDto!);
          logger.verbose(`(search-offers-store) initial search offers payload created, kind=${instance.offersKind}, count=${instance.resultState.items.length}`);
        }

        processFetchResult(instance, fetchResult!);
      } else {
        let needFullRefetch = false;
        if (instance.resultState.initialDataFetched === 'no') {
          logger.verbose(`(search-offers-store) consuming initial search offers result data from payload, kind=${instance.offersKind}`);
          const payloadKey = isFlightOffersInstance(instance) ? DataKeySearchFlightOffers : DataKeySearchStayOffers;
          const payload = getPayload(nuxtApp, payloadKey);
          if (payload) {
            processFetchResult(instance, isFlightOffersInstance(instance) ? mapSearchFlightOffersResult(payload as ISearchFlightOffersResultDto) : mapSearchStayOffersResult(payload as ISearchStayOffersResultDto));
          } else {
            logger.verbose(`(search-offers-store) won't consume initial search offers data from payload, it is empty, kind=${instance.offersKind}`);
            needFullRefetch = true;
          }
        } else {
          needFullRefetch = true;
        }

        // fetch via REST from server
        if (needFullRefetch) {
          const searchOffersFetch = isFlightOffersInstance(instance) ? searchFlightOffersFetch : searchStayOffersFetch;
          await searchOffersFetch;
          if (searchOffersFetch.status.value !== 'pending') {
            searchParamsDto = await getFetchRequestParams(instance, offersFetchMode);
            if(isFlightOffersInstance(instance)) {
              searchFlightOffersRequestBody.value = searchParamsDto as ISearchFlightOffersParamsDto;
            } else {
              searchStayOffersRequestBody.value = searchParamsDto as ISearchStayOffersParamsDto;
            }
            logger.verbose(`(search-offers-store) sending fetch offers request, kind=${instance.offersKind}`);
            // KB: omitting await here to prevent client-side navigation blocking until receiving search offers response (REST Api) from server.
            // With async loading search results page is mounted asap and waiting stubs are shown during HTTP request execution
            (async () => {
              await searchOffersFetch.refresh();
              logger.verbose(`(search-offers-store) fetch offers request refreshed, kind=${instance.offersKind}, status=${searchOffersFetch.status.value}`);
              if(searchOffersFetch.status.value !== 'pending') {
                await fetchOffersStatusChangeHandler(instance.offersKind, searchOffersFetch);
              }
            })(); 
          } else {
            logger.debug(`(search-offers-store) skipping fetch offers request, as it is currently in pending state, kind=${instance.offersKind}`);
          }
        }
      }
    } catch (err: any) {
      logger.warn(`(search-offers-store) failed to fetch offers, kind=${instance.offersKind}, offersFetchMode=${offersFetchMode}`, err, searchParamsDto);
      instance.resultState.items = [];
      instance.resultState.status = 'error';
      throw err;
    }
  };

  const applyRangeFilterParamNarrowing = (filter: ISearchOffersRangeFilterProps, newRange: {min: number, max: number}) => {
    filter.valueRange = newRange;
    if (filter.currentValue) {
      const currentValue = filter.currentValue;
      logger.debug(`(search-offers-store) adjusting range filter current value, filterId=${filter.filterId}, min=${currentValue.min}, max=${currentValue.max}, newMin=${newRange.min}, newMax=${newRange.max}`);
      if (currentValue.min > newRange.max || currentValue.max < newRange.min) {
        currentValue.min = newRange.min;
        currentValue.max = newRange.max;
      } else {
        const sortedPrices = [newRange.min, newRange.max, currentValue.min, currentValue.max];
        sortedPrices.sort((a, b) => a - b);
        currentValue.min = sortedPrices[1];
        currentValue.max = sortedPrices[2];
      }

      if (Math.abs(currentValue.min - currentValue.max) < 0.01) {
        logger.verbose(`(search-offers-store) flight price filter min & max values are the same, adjusting range, value=${currentValue.min}`);
        newRange.min = Math.max(1, currentValue.min - 1);
        newRange.max = Math.min(SearchOffersPriceRange.max, currentValue.max + 1);
        filter.valueRange = newRange;
      }
    } else {
      filter.currentValue = filter.valueRange;
    }
  };

  const applyChecklistFilterParamNarrowing = (filter: ISearchOffersChecklistFilterProps, newVariants: ISearchOffersFilterVariant[]) => {
    filter.variants = orderBy(newVariants.map((v) => { return { ord: v.id, ...v }; }), ['ord'], ['asc']).map((v) => { return { id: v.id, displayText: v.displayText }; });
    if ((filter.currentValue?.length ?? 0) > 0) {
      logger.debug(`(search-offers-store) adjusting checklist filter current value, filterId=${filter.filterId}, values=[${filter.currentValue!.join(', ')}]`);
      const valueSet = new Set<string>(filter.currentValue);
      filter.currentValue = newVariants.filter(v => valueSet.has(v.id)).map(v => v.id);
    }
  };

  const getRatingFilterVariantId = (rating: number) => `RatingFilter-r${rating}`;

  const getRatingFromFilterVariantId = (variantId: string | undefined): number | undefined => variantId ? parseInt(variantId.replace('RatingFilter-r', '')) : undefined;
  const mapRatingsFilterValue = (rating: number | undefined): number[] | undefined => rating !== undefined ? (range(0, 5).filter(r => r >= rating)) : undefined;

  const createSearchFlightOfferFilters = (): (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps)[] => {
    logger.debug('(search-offers-store) creating flight offer filters initial config');

    const priceFilter: ISearchOffersRangeFilterProps = {
      filterId: FlightsPriceFilterId,
      captionResName: getI18nResName3('searchOffers', 'filters', 'price'),
      displayOrder: 0,
      type: 'range',
      valueRange: {
        min: 1,
        max: SearchOffersPriceRange.max
      },
      currentValue: { min: 1, max: SearchOffersPriceRange.max },
      limitLabelFormatter: 'price',
      applyNarrowing: (min: number, max: number) => {
        logger.debug(`(search-offers-store) applying flight price filter params narrowing, min=${min}, max=${max}`);
        if (!searchFlightOffersInstance) {
          logger.debug(`(search-offers-store) flight price filter params narrowing wont be applied as instance is not initialized, min=${min}, max=${max}`);
          return;
        }
        const priceFilter = (searchFlightOffersInstance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsPriceFilterId) as ISearchOffersRangeFilterProps);
        if (!priceFilter) {
          logger.warn(`(search-offers-store) flight price filter params narrowing wont be applied as filter was not found, min=${min}, max=${max}`);
          return;
        }
        applyRangeFilterParamNarrowing(priceFilter, { min, max });
        logger.debug(`(search-offers-store) flight price filter params narrowing applied, min=${priceFilter.valueRange.min}, max=${priceFilter.valueRange.max}`);
      }
    };

    const departureTimeFilter: ISearchOffersRangeFilterProps = {
      filterId: FlightsDepartureTimeFilterId,
      captionResName: getI18nResName3('searchFlights', 'filters', 'departureTime'),
      displayOrder: 1,
      type: 'range',
      valueRange: {
        min: 0,
        max: NumMinutesInDay - 1
      },
      currentValue: { min: 0, max: NumMinutesInDay - 1 },
      limitLabelFormatter: 'daytime',
      applyNarrowing: (min: number, max: number) => {
        logger.debug(`(search-offers-store) applying flight departure time filter params narrowing, min=${min}, max=${max}`);
        if (!searchFlightOffersInstance) {
          logger.debug(`(search-offers-store) flight departure time filter params narrowing wont be applied as instance is not initialized, min=${min}, max=${max}`);
          return;
        }
        const departureTimeFilter = (searchFlightOffersInstance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsDepartureTimeFilterId) as ISearchOffersRangeFilterProps);
        if (!departureTimeFilter) {
          logger.warn(`(search-offers-store) flight departure time filter params narrowing wont be applied as filter was not found, min=${min}, max=${max}`);
          return;
        }
        applyRangeFilterParamNarrowing(departureTimeFilter, { min, max });
        logger.debug(`(search-offers-store) flight departure time filter params narrowing applied, min=${departureTimeFilter.valueRange.min}, max=${departureTimeFilter.valueRange.max}`);
      }
    };

    const ratingFilter: ISearchOffersChoiceFilterProps = {
      filterId: FlightsRatingFilterId,
      captionResName: getI18nResName3('searchOffers', 'filters', 'rating'),
      displayOrder: 2,
      type: 'choice',
      variants: range(0, 5).map((r) => {
        return {
          id: getRatingFilterVariantId(r),
          displayText: `${r}+`
        };
      }),
      currentValue: undefined,
      applyNarrowing: (_) => {} // do not use narrowing for this filter
    };

    const companiesFilter: ISearchOffersChecklistFilterProps = {
      filterId: FlightsAirlineCompanyFilterId,
      captionResName: getI18nResName3('searchFlights', 'filters', 'airlines'),
      displayOrder: 3,
      type: 'checklist',
      variants: [],
      currentValue: undefined,
      applyNarrowing: (variants: ISearchOffersFilterVariant[]) => {
        logger.debug(`(search-offers-store) applying flight companies filter params narrowing, variants=[${variants.map(v => v.id).join(', ')}]`);
        if (!searchFlightOffersInstance) {
          logger.debug(`(search-offers-store) flight companies filter params narrowing wont be applied as instance is not initialized, variants=[${variants.map(v => v.id).join(', ')}]`);
          return;
        }
        const companiesFilter = (searchFlightOffersInstance.viewState.currentSearchParams.filters?.find(f => f.filterId === FlightsAirlineCompanyFilterId) as ISearchOffersChecklistFilterProps);
        if (!companiesFilter) {
          logger.warn(`(search-offers-store) flight companies filter params narrowing wont be applied as filter was not found, variants=[${variants.map(v => v.id).join(', ')}]`);
          return;
        }
        applyChecklistFilterParamNarrowing(companiesFilter, variants);
        logger.debug(`(search-offers-store) flight companies filter params narrowing applied, variants= [${companiesFilter.variants.map(v => v.id).join(', ')}]`);
      }
    };

    const tripsFilter: ISearchOffersChecklistFilterProps = {
      filterId: FlightsTripTypeFilterId,
      captionResName: getI18nResName3('searchFlights', 'filters', 'trips'),
      displayOrder: 4,
      type: 'checklist',
      variants: [{
        id: FlightsTripTypeFilterFlexibleDatesItemId,
        displayText: getFilterVariantLocalizableText(getI18nResName3('searchFlights', 'filters', 'tripsDatesFlexible'))
      }],
      currentValue: undefined,
      applyNarrowing: (_) => {} // do not use narrowing for this filter
    };

    logger.debug('(search-offers-store) flight offer filters initial config created');
    return [priceFilter, departureTimeFilter, ratingFilter, companiesFilter, tripsFilter];
  };

  const createSearchStayOfferFilters = (): (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps | ISearchOffersChoiceFilterProps)[] => {
    logger.debug('(search-offers-store) creating stay offer filters initial config');

    const priceFilter: ISearchOffersRangeFilterProps = {
      filterId: StaysPriceFilterId,
      captionResName: getI18nResName3('searchOffers', 'filters', 'price'),
      displayOrder: 0,
      type: 'range',
      valueRange: {
        min: 1,
        max: SearchOffersPriceRange.max
      },
      currentValue: { min: 1, max: SearchOffersPriceRange.max },
      limitLabelFormatter: 'price',
      applyNarrowing: (min: number, max: number) => {
        logger.debug(`(search-offers-store) applying stay price filter params narrowing, min=${min}, max=${max}`);
        if (!searchStayOffersInstance) {
          logger.debug(`(search-offers-store) stay price filter params narrowing wont be applied as instance is not initialized, min=${min}, max=${max}`);
          return;
        }
        const priceFilter = (searchStayOffersInstance.viewState.currentSearchParams.filters?.find(f => f.filterId === StaysPriceFilterId) as ISearchOffersRangeFilterProps);
        if (!priceFilter) {
          logger.warn(`(search-offers-store) stay price filter params narrowing wont be applied as filter was not found, min=${min}, max=${max}`);
          return;
        }
        applyRangeFilterParamNarrowing(priceFilter, { min, max });
        logger.debug(`(search-offers-store) stay price filter params narrowing applied, min=${priceFilter.valueRange.min}, max=${priceFilter.valueRange.max}`);
      }
    };

    const ratingFilter: ISearchOffersChoiceFilterProps = {
      filterId: StaysRatingFilterId,
      captionResName: getI18nResName3('searchOffers', 'filters', 'rating'),
      displayOrder: 1,
      type: 'choice',
      variants: range(0, 5).map((r) => {
        return {
          id: getRatingFilterVariantId(r),
          displayText: `${r}+`
        };
      }),
      currentValue: undefined,
      applyNarrowing: (_) => {} // do not use narrowing for this filter
    };

    const freebiesLabels = ['breakfast', 'parking', 'internet', 'shuttle', 'cancellation'];
    const freebiesFilter: ISearchOffersChecklistFilterProps = {
      filterId: StaysFreebiesFilterId,
      captionResName: getI18nResName3('searchStays', 'filters', 'freebies'),
      displayOrder: 2,
      type: 'checklist',
      variants: freebiesLabels.map((fl) => {
        return {
          id: StaysFreebiesFilterItemId(fl),
          displayText: getFilterVariantLocalizableText(getI18nResName3('searchStays', 'freebies', fl as any))
        };
      }),
      currentValue: undefined,
      applyNarrowing: (_) => {} // do not use narrowing for this filter
    };

    const amenitiesLabels = ['frontDesk', 'airConditioner', 'fitness', 'indoorPool', 'outdoorPool', 'spa', 'restaraunt', 'roomService', 'bar', 'wifi', 'teaCoffee'];
    const amenitiesFilter: ISearchOffersChecklistFilterProps = {
      filterId: StaysAmenitiesFilterId,
      captionResName: getI18nResName3('searchStays', 'filters', 'amenities'),
      displayOrder: 3,
      type: 'checklist',
      variants: amenitiesLabels.map((al) => {
        return {
          id: StaysAmenitiesFilterItemId(al),
          displayText: getFilterVariantLocalizableText(getI18nResName3('searchStays', 'amenities', al as any))
        };
      }),
      currentValue: undefined,
      applyNarrowing: (_) => {} // do not use narrowing for this filter
    };

    logger.debug('(search-offers-store) stay offer filters initial config created');
    return [priceFilter, ratingFilter, freebiesFilter, amenitiesFilter];
  };

  const createSearchFlightOffersInstance = (initalParams?: Partial<ISearchFlightOffersMainParams> | undefined): ISearchOffersStoreInstance<ISearchFlightOffersParams> => {
    logger.info(`(search-offers-store) creating store instance, kind=${<OfferKind>'flights'}, initialParams=${JSON.stringify(initalParams)}`);

    const viewState = reactive({
      currentSearchParams: <ISearchFlightOffersParams>{ ...(initalParams || {}), filters: createSearchFlightOfferFilters() },
      displayOptions: <ISearchFlightOffersDisplayOptions>{
        additionalSorting: DefaultFlightOffersSorting,
        primaryOptions: [],
        totalCount: 0
      }
    });
    const resultState = reactive({
      items: [],
      initialDataFetched: 'no' as const,
      status: 'fetched' as const,
      usedSearchParams: undefined
    });

    const result: ISearchOffersStoreInstance<ISearchFlightOffersParams, ISearchFlightOffersMainParams, ISearchFlightOffersDisplayOptions, EntityDataAttrsOnly<IFlightOffer>> = {
      viewState,
      resultState,
      offersKind: 'flights' as const,
      setSorting: () => {},
      setMainSearchParams: (params: Partial<ISearchFlightOffersMainParams>): boolean => {
        logger.debug(`(search-offers-store) updating main search params, kind=${<OfferKind>'flights'}, params=${JSON.stringify(params)}`);
        const changed = !isEqual(pick(viewState.currentSearchParams, keys(params)), params);
        assign(result.viewState.currentSearchParams, params);
        logger.debug(`(search-offers-store) main search params updated, kind=${<OfferKind>'flights'}, changed=${changed}`);
        return changed;
      },
      fetchData: async (offersFetchMode: Exclude<OffersStoreInstanceFetchStatus, 'fetched' | 'error'>): Promise<void> => {
        await fetchData(result!, offersFetchMode);
      },
      resetFetchState: (): void => {
        resetFetchState(result!);
      }
    };

    logger.info(`(search-offers-store) store instance created, kind=${<OfferKind>'flights'}`);
    return result;
  };

  const createSearchStayOffersInstance = (initalParams?: Partial<ISearchStayOffersMainParams> | undefined): ISearchOffersStoreInstance<ISearchStayOffersParams> => {
    logger.info(`(search-offers-store) creating store instance, kind=${<OfferKind>'stays'}, initialParams=${JSON.stringify(initalParams)}`);

    const viewState = reactive({
      currentSearchParams: <ISearchStayOffersParams>{ ...(initalParams || {}), filters: createSearchStayOfferFilters() },
      displayOptions: <ISearchStayOffersDisplayOptions>{
        sorting: DefaultStayOffersSorting,
        totalCount: 0
      }
    });
    const resultState = reactive({
      items: [],
      initialDataFetched: 'no' as const,
      status: 'fetched' as const,
      usedSearchParams: undefined
    });
    const result : ISearchOffersStoreInstance<ISearchStayOffersParams, ISearchStayOffersMainParams, ISearchStayOffersDisplayOptions, EntityDataAttrsOnly<IStayOffer>> = {
      viewState,
      resultState,
      offersKind: 'stays',
      setSorting: () => {},
      setMainSearchParams: (params: Partial<ISearchStayOffersParams>): boolean => {
        logger.debug(`(search-offers-store) updating main search params, kind=${<OfferKind>'stays'}, params=${JSON.stringify(params)}`);
        const changed = !isEqual(pick(viewState.currentSearchParams, keys(params)), params);
        assign(result.viewState.currentSearchParams, params);
        logger.debug(`(search-offers-store) main search params updated, kind=${<OfferKind>'stays'}, changed=${changed}`);
        return changed;
      },
      fetchData: async (offersFetchMode: Exclude<OffersStoreInstanceFetchStatus, 'fetched' | 'error'>): Promise<void> => {
        await fetchData(result!, offersFetchMode);
      },
      resetFetchState: (): void => {
        resetFetchState(result!);
      }
    };
    logger.info(`(search-offers-store) store instance created, kind=${<OfferKind>'stays'}`);
    return result;
  };

  const fillCityCacheFromPayload = async (): Promise<void> => {
    let cachePayload: EntityCacheItemsPayload | null | undefined;
    try {
      const entityCache = getClientServices().getEntityCache();
      cachePayload = getPayload<EntityCacheItemsPayload>(nuxtApp, DataKeyEntityCacheItems);
      if (cachePayload) {
        logger.verbose(`(search-offers-store) filling city cache from payload, items=${JSON.stringify(cachePayload)}`);
        for (let i = 0; i < cachePayload.length; i++) {
          await entityCache.set(cachePayload[i], AppConfig.caching.clientRuntime.expirationsSeconds.default);
        }
      }  
    } catch(err: any) {
      logger.warn(`(search-offers-store) exception while filling city cache from payload, items=${JSON.stringify(cachePayload)}`);
    }
  };

  const getInstance = async <
      TParams extends ISearchFlightOffersParams | ISearchStayOffersParams = ISearchFlightOffersParams | ISearchStayOffersParams,
      TOffersKind = TParams['kind']
  >(offersKind: TOffersKind, takeInitialValuesFromUrlQuery: boolean, initialDataFetch: boolean) : Promise<ISearchOffersStoreInstance<TParams>> => {
    logger.debug(`(search-offers-store) accessing store instance, kind=${offersKind}, takeInitialValuesFromUrlQuery=${takeInitialValuesFromUrlQuery}, initialDataFetch=${initialDataFetch}`);

    let resultInstance: ISearchOffersStoreInstance<ISearchFlightOffersParams> | ISearchOffersStoreInstance<ISearchStayOffersParams>;
    let needInitialFetch = false;
    switch (offersKind) {
      case 'flights':
        if (!searchFlightOffersInstance) {
          if (import.meta.client) {
            await fillCityCacheFromPayload();
            startWatchingForFetchResults('flights', searchFlightOffersFetch);
          }
          const initialMainParams = takeInitialValuesFromUrlQuery ? (await parseMainParamsFromUrlQuery<ISearchFlightOffersMainParams>('flights')) : undefined;
          searchFlightOffersInstance = await createSearchFlightOffersInstance(initialMainParams);
          needInitialFetch = initialDataFetch;
        } else {
          if (takeInitialValuesFromUrlQuery) {
            const mainParams = await parseMainParamsFromUrlQuery<ISearchFlightOffersMainParams>('flights');
            if (mainParams) {
              needInitialFetch = searchFlightOffersInstance.setMainSearchParams(mainParams) && searchFlightOffersInstance.resultState.initialDataFetched !== 'yes';
            }
          }
          if (!needInitialFetch) {
            needInitialFetch = initialDataFetch && searchFlightOffersInstance.resultState.initialDataFetched !== 'yes';
          }
        }
        resultInstance = searchFlightOffersInstance;
        break;
      default:
        if (!searchStayOffersInstance) {
          if (import.meta.client) {
            await fillCityCacheFromPayload();
            startWatchingForFetchResults('stays', searchStayOffersFetch);
          }
          const initialMainParams: Partial<ISearchStayOffersMainParams> | undefined = takeInitialValuesFromUrlQuery ? (await parseMainParamsFromUrlQuery<ISearchStayOffersMainParams>('stays')) : undefined;
          searchStayOffersInstance = await createSearchStayOffersInstance(initialMainParams);
          needInitialFetch = initialDataFetch;
        } else {
          if (takeInitialValuesFromUrlQuery) {
            const mainParams = await parseMainParamsFromUrlQuery<ISearchStayOffersMainParams>('stays');
            if (mainParams) {
              needInitialFetch = searchStayOffersInstance.setMainSearchParams(mainParams) && searchStayOffersInstance.resultState.initialDataFetched !== 'yes';
            }
          }
          if (!needInitialFetch) {
            needInitialFetch = initialDataFetch && searchStayOffersInstance.resultState.initialDataFetched !== 'yes';
          }
        }
        resultInstance = searchStayOffersInstance;
        break;
    }

    if (needInitialFetch) {
      logger.info(`(search-offers-store) initial data fetch, kind=${offersKind}`);
      await fetchData(resultInstance, 'full-refetch');
    }

    logger.debug(`(search-offers-store) store instance accessed, kind=${offersKind}`);
    return resultInstance as any;
  };

  const result : ISearchOffersStore = {
    getInstance
  };

  logger.info('(search-offers-store) store constructed');
  return result;
});

import { ValidationError } from 'yup';
import dayjs from 'dayjs';
import uniqueBy from 'lodash/unionBy';
import assign from 'lodash/assign';
import { type ISearchFlightOffersParams, type ISearchStayOffersParams, type SearchOfferKind, type ISearchStayOffersMainParams, type ISearchFlightOffersMainParams, type ISearchOffersCommonParams, type IEntityCacheCityItem } from '../shared/interfaces';
import { eraseTimeOfDay } from '../shared/common';
import { NuxtDataKeys } from '../shared/constants';
import { validateObject } from '../shared/validation';
import AppConfig from './../appconfig';
import { SearchFlightOffersParamsQuerySchema, SearchStayOffersParamsQuerySchema, type ISearchFlightOffersParamsQuery, type ISearchStayOffersParamsQuery } from './../server/dto';

export interface ISearchOffersStoreInstance<TParams = ISearchFlightOffersParams | ISearchStayOffersParams> {
  currentSearchParams: Partial<TParams>, // partial, as values may not be filled, e.g. when user opens the app for the first time and input fields have nowhere to get initial values from
  setMainSearchParams: <TMainParams = (TParams extends ISearchFlightOffersParams ? ISearchFlightOffersMainParams : ISearchStayOffersMainParams)>(params: Partial<TMainParams>) => void,
  clearFilterParams: () => void
}

export interface ISearchOffersStore {
  getInstance<
    TParams extends ISearchOffersCommonParams,
    TOffersKind = TParams['kind'],
    TResParams = TParams extends ISearchFlightOffersParams ? ISearchFlightOffersParams : ISearchStayOffersParams
  >(offersKind: TOffersKind, takeInitialValuesFromUrlQuery: boolean) : Promise<ISearchOffersStoreInstance<TResParams>>;
}

type EntityCacheItemsPayload = IEntityCacheCityItem[];
export const useSearchOffersStore = defineStore('search-offers-store', () => {
  const logger = CommonServicesLocator.getLogger();
  logger.info('(search-offers-store) start store construction');
  const nuxtApp = useNuxtApp();
  const route = useRoute();

  const clientEntityCache = process.client ? ClientServicesLocator.getEntityCache() : undefined;
  const serverEntityCacheLogic = process.server ? ServerServicesLocator.getEntityCacheLogic() : undefined;

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

  const normalizeFlightsSearchMainParams = (params: Partial<ISearchFlightOffersParamsQuery>): Partial<ISearchFlightOffersParamsQuery> => {
    logger.debug(`(search-offers-store) normalizing main params, kind=${<SearchOfferKind>'flights'}, params=${JSON.stringify(params)}`);

    const datesNormalized = normalizeDateRanges({ from: params.dateFrom, to: params.dateTo });
    params.dateFrom = datesNormalized.from;
    params.dateTo = datesNormalized.to;

    logger.debug(`(search-offers-store) main params normalized, kind=${<SearchOfferKind>'flights'}, params=${JSON.stringify(params)}`);
    return params;
  };

  const normalizeStaysSearchMainParams = (params: Partial<ISearchStayOffersParamsQuery>): Partial<ISearchStayOffersParamsQuery> => {
    logger.debug(`(search-offers-store) normalizing main params, kind=${<SearchOfferKind>'stays'}, params=${JSON.stringify(params)}`);

    const datesNormalized = normalizeDateRanges({ from: params.checkIn, to: params.checkOut });
    params.checkIn = datesNormalized.from;
    params.checkOut = datesNormalized.to;

    logger.debug(`(search-offers-store) main params normalized, kind=${<SearchOfferKind>'flights'}, params=${JSON.stringify(params)}`);
    return params;
  };

  const resolveCitySlugs = async (slugs: string[]) : Promise<IEntityCacheCityItem[]> => {
    if (process.client) {
      logger.verbose(`(search-offers-store) resolving city slugs (client), ids=${JSON.stringify(slugs)}`);
      const items = (await clientEntityCache!.get<'City', IEntityCacheCityItem>(slugs, 'City', { expireInSeconds: AppConfig.clientCache.expirationsSeconds.default }))!;
      logger.verbose(`(search-offers-store) city slugs resolved (client), result=${JSON.stringify(items)}`);
      return items;
    } else {
      logger.verbose(`(search-offers-store) resolving city slugs (server), ids=${JSON.stringify(slugs)}`);
      const items = await serverEntityCacheLogic!.get<'City', IEntityCacheCityItem>(slugs, 'City');
      nuxtApp.payload[NuxtDataKeys.EntityCacheItems] = uniqueBy([...((nuxtApp.payload[NuxtDataKeys.EntityCacheItems] ?? []) as EntityCacheItemsPayload), ...items], 'id');
      logger.verbose(`(search-offers-store) city slugs resolved (server), result=${JSON.stringify(items)}`);
      return items;
    }
  };

  const parseMainParamsFromUrlQuery = async <TParams extends ISearchFlightOffersMainParams | ISearchStayOffersMainParams>(kind: SearchOfferKind): Promise<Partial<TParams> | undefined> => {
    logger.verbose(`(search-offers-store) parsing url query for main params, kind=${kind}, query=${JSON.stringify(route.query)}, path=${route.path}`);
    const query = route.query;
    if (!query) {
      logger.verbose(`(search-offers-store) url query is empty, kind=${kind}, path=${route.path}`);
      return undefined;
    }

    try {
      let validationError : ValidationError | undefined;
      switch (kind) {
        case 'flights':
          validationError = validateObject(query, SearchFlightOffersParamsQuerySchema);
          break;
        case 'stays':
          validationError = validateObject(query, SearchStayOffersParamsQuerySchema);
          break;
      }
      if (validationError) {
        logger.warn(`(search-offers-store) search params url query does not match schema, kind=${kind}, path=${route.path}, msg=${validationError.message}, issues=${validationError.errors?.join('; ') ?? '[empty]'}]`, undefined, query);
        return undefined;
      }

      const searchParamsQuery = kind === 'flights' ? normalizeFlightsSearchMainParams(<ISearchFlightOffersParamsQuery>(SearchFlightOffersParamsQuerySchema.cast(query))) : normalizeStaysSearchMainParams(<ISearchStayOffersParamsQuery>(SearchStayOffersParamsQuerySchema.cast(query)));
      if (!searchParamsQuery) {
        logger.warn(`(search-offers-store) failed to parse search params url query, kind=${kind}, path=${route.path}`, undefined, query);
        return undefined;
      }

      let result: Partial<TParams>;
      if (kind === 'flights') {
        const searchFlightParamsQuery = <ISearchFlightOffersParamsQuery>searchParamsQuery;
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
        const searchStayParamsQuery = <ISearchStayOffersParamsQuery>searchParamsQuery;
        const cityInfo = searchStayParamsQuery.citySlug ? (await resolveCitySlugs([searchStayParamsQuery.citySlug?.trim()]))[0] : undefined;
        result = <ISearchStayOffersMainParams>{
          checkIn: searchStayParamsQuery.checkIn,
          checkOut: searchStayParamsQuery.checkOut,
          city: cityInfo,
          numGuests: searchStayParamsQuery.numGuests,
          numRooms: searchStayParamsQuery.numRooms
        } as any;
      }
      logger.verbose(`(search-offers-store) main params parsed from url query, kind=${kind}, path=${route.path}, result=${JSON.stringify(result)}`);
      return result;
    } catch (err: any) {
      logger.warn(`(search-offers-store) failed to parse search params url query, kind=${kind}, path=${route.path}`, err, query);
      return undefined;
    }
  };

  let searchStayOffersInstance: ISearchOffersStoreInstance<ISearchStayOffersParams> | undefined;
  let searchFlightOffersInstance: ISearchOffersStoreInstance<ISearchFlightOffersParams> | undefined;
  const createSearchFlightOffersInstance = (initalParams?: Partial<ISearchFlightOffersMainParams> | undefined): ISearchOffersStoreInstance<ISearchFlightOffersParams> => {
    logger.info(`(search-offers-store) creating store instance, kind=${<SearchOfferKind>'flights'}, initialParams=${JSON.stringify(initalParams)}`);

    const currentSearchParams = reactive<Partial<ISearchFlightOffersParams>>(initalParams || {});
    const result : ISearchOffersStoreInstance<ISearchFlightOffersParams> = {
      currentSearchParams,
      clearFilterParams: () => { },
      setMainSearchParams: (params: Partial<ISearchFlightOffersMainParams>) => {
        logger.debug(`(search-offers-store) updaing main search params, kind=${<SearchOfferKind>'flights'}, params=${JSON.stringify(params)}`);
        assign(currentSearchParams, params);
      }
    };

    logger.info(`(search-offers-store) store instance created, kind=${<SearchOfferKind>'flights'}`);
    return result;
  };

  const createSearchStayOffersInstance = (initalParams?: Partial<ISearchStayOffersMainParams> | undefined): ISearchOffersStoreInstance<ISearchStayOffersParams> => {
    logger.info(`(search-offers-store) creating store instance, kind=${<SearchOfferKind>'stays'}, initialParams=${JSON.stringify(initalParams)}`);

    const currentSearchParams = reactive<Partial<ISearchStayOffersParams>>(initalParams || {});
    const result : ISearchOffersStoreInstance<ISearchStayOffersParams> = {
      currentSearchParams,
      clearFilterParams: () => { },
      setMainSearchParams: (params: Partial<ISearchStayOffersParams>) => {
        logger.debug(`(search-offers-store) updaing main search params, kind=${<SearchOfferKind>'stays'}, params=${JSON.stringify(params)}`);
        assign(currentSearchParams, params);
      }
    };

    logger.info(`(search-offers-store) store instance created, kind=${<SearchOfferKind>'stays'}`);
    return result;
  };

  const fillCityCacheFromPayload = async (): Promise<void> => {
    const entityCache = ClientServicesLocator.getEntityCache();
    const cachePayload = nuxtApp.payload[NuxtDataKeys.EntityCacheItems] as EntityCacheItemsPayload;
    if (cachePayload) {
      const cachedItems = nuxtApp.payload[NuxtDataKeys.EntityCacheItems] as EntityCacheItemsPayload;
      logger.verbose(`(search-offers-store) filling city cache from payload, items=${JSON.stringify(cachedItems)}`);
      for (let i = 0; i < cachedItems.length; i++) {
        await entityCache.set(cachedItems[i], AppConfig.clientCache.expirationsSeconds.default);
      }
    }
  };

  const getInstance = async <
      TParams extends ISearchOffersCommonParams,
      TOffersKind = TParams['kind'],
      TResParams = TParams extends ISearchFlightOffersParams ? ISearchFlightOffersParams : ISearchStayOffersParams
  >(offersKind: TOffersKind, takeInitialValuesFromUrlQuery: boolean) : Promise<ISearchOffersStoreInstance<TResParams>> => {
    logger.debug(`(search-offers-store) accessing store instance, kind=${offersKind}, takeInitialValuesFromUrlQuery=${takeInitialValuesFromUrlQuery}`);

    switch (offersKind) {
      case 'flights':
        if (!searchFlightOffersInstance) {
          if (process.client) {
            await fillCityCacheFromPayload();
          }
          const initialMainParams = takeInitialValuesFromUrlQuery ? (await parseMainParamsFromUrlQuery<ISearchFlightOffersMainParams>('flights')) : undefined;
          searchFlightOffersInstance = await createSearchFlightOffersInstance(initialMainParams);
        }
        logger.debug(`(search-offers-store) store instance accessed, kind=${offersKind}`);
        return searchFlightOffersInstance as any;
      default:
        if (!searchStayOffersInstance) {
          if (process.client) {
            await fillCityCacheFromPayload();
          }
          const initialMainParams: Partial<ISearchStayOffersMainParams> | undefined = takeInitialValuesFromUrlQuery ? (await parseMainParamsFromUrlQuery<ISearchStayOffersMainParams>('stays')) : undefined;
          searchStayOffersInstance = await createSearchStayOffersInstance(initialMainParams);
        }
        logger.debug(`(search-offers-store) store instance accessed, kind=${offersKind}`);
        return searchStayOffersInstance as any;
    }
  };

  const result : ISearchOffersStore = {
    getInstance
  };

  logger.info('(search-offers-store) store constructed');
  return result;
});

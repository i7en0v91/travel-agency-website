import { type IStayOffersFilterParams, type ISorting, type StayOffersSortFactor, type IStaySearchHistory, MaxSearchHistorySize, SessionStaySearchHistory, type IAppLogger, AppException, AppExceptionCodeEnum } from '@golobe-demo/shared';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type ISearchStayOffersResultDto, type ISearchStayOffersParamsDto, SearchStayOffersParamsDtoSchema } from '../../../api-definitions';
import { getUserSessionValue, setUserSessionValue } from './../../../utils/user-session';
import { mapSearchedStayOffer, mapSearchStayOfferResultEntities } from '../../../utils/dto-mappers';
import { extractUserIdFromSession } from './../../../../server/utils/auth';
import type { H3Event } from 'h3';
import { Decimal } from 'decimal.js';
import { destr } from 'destr';
import { getServerSession } from '#auth';
import { getServerServices, getCommonServices } from '../../../../helpers/service-accessors';

function performAdditionalDtoValidation (dto: ISearchStayOffersParamsDto, event : H3Event, logger: IAppLogger) {
  if (dto.price?.to && dto.price?.from && dto.price.from > dto.price.to) {
    logger.warn('search stay query price range is incorrect', undefined, { ...(dto), ...{ url: event.node.req.url } });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.checkIn && dto.checkOut && dto.checkIn.getTime() > dto.checkOut.getTime()) {
    logger.warn('search stay query date range is incorrect', undefined, { ...(dto), ...{ url: event.node.req.url } });
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }
}

function getSortDirection (sort: StayOffersSortFactor): 'asc' | 'desc' {
  switch (sort) {
    case 'price':
      return 'asc';
    default:
      return 'desc';
  }
}

async function addCityToSearchHistory (citySlug: string | undefined, event: H3Event, logger: IAppLogger): Promise<void> {
  if (!citySlug) {
    return;
  }

  const citiesLogic = getServerServices()!.getCitiesLogic();
  const cityId = (await citiesLogic.getPopularCities(event.context.preview.mode)).find(x => x.slug === citySlug)?.id;
  if (cityId) {
    try {
      logger.verbose('adding popular city to search history', { citySlug, id: cityId });

      let searchHistory = destr<IStaySearchHistory | undefined>(await getUserSessionValue(event, SessionStaySearchHistory));
      if (!searchHistory) {
        searchHistory = { popularCityIds: [] };
      }
      if (searchHistory.popularCityIds.includes(cityId)) {
        logger.debug('wont add city to search history as it is already there', { citySlug, id: cityId });
        return;
      }
      searchHistory.popularCityIds = [cityId, ...searchHistory.popularCityIds];
      if (searchHistory.popularCityIds.length > MaxSearchHistorySize) {
        searchHistory.popularCityIds.pop();
      }
      logger.debug('city search history updated', { result: searchHistory.popularCityIds });
      await setUserSessionValue(event, SessionStaySearchHistory, JSON.stringify(searchHistory));
    } catch (err: any) {
      logger.warn('failed to add popular city to search history', err, { citySlug, id: cityId });
    }
  }
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const serverServices = getServerServices()!;
  const logger = getCommonServices().getLogger().addContextProps({ component: 'WebApi' });
  const staysLogic = serverServices.getStaysLogic();

  logger.debug('parsing stay offers search query from HTTP body');
  const searchParamsDto = SearchStayOffersParamsDtoSchema.cast(await readBody(event));
  performAdditionalDtoValidation(searchParamsDto, event, logger);

  const filterParams: IStayOffersFilterParams = {
    checkIn: searchParamsDto.checkIn,
    checkOut: searchParamsDto.checkOut,
    citySlug: searchParamsDto.citySlug,
    numGuests: searchParamsDto.numGuests,
    numRooms: searchParamsDto.numRooms,
    price: searchParamsDto.price
      ? {
          from: searchParamsDto.price.from ? new Decimal(searchParamsDto.price.from) : undefined,
          to: searchParamsDto.price.to ? new Decimal(searchParamsDto.price.to) : undefined
        }
      : undefined,
    ratings: searchParamsDto.ratings
  };

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  
  const sortFactor = searchParamsDto.sort as StayOffersSortFactor;
  const sorting: ISorting<StayOffersSortFactor> = {
    factor: sortFactor,
    direction: getSortDirection(sortFactor)
  };

  const searchResults = await staysLogic.searchOffers(filterParams, userId ?? 'guest', sorting, searchParamsDto.pagination, searchParamsDto.narrowFilterParams, event.context.preview.mode);
  await addCityToSearchHistory(searchParamsDto.citySlug, event, logger);

  setHeader(event, 'content-type', 'application/json');

  const result: ISearchStayOffersResultDto = {
    entities: mapSearchStayOfferResultEntities(searchResults),
    pagedItems: searchResults.pagedItems.map((item) => {
      return mapSearchedStayOffer(item);
    }),
    totalCount: searchResults.totalCount,
    paramsNarrowing: searchResults.paramsNarrowing
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false, validationSchema: SearchStayOffersParamsDtoSchema });

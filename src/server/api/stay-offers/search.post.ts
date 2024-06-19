import type { H3Event } from 'h3';
import { Decimal } from 'decimal.js';
import { destr } from 'destr';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { MaxSearchHistorySize, SessionStaySearchHistory } from '../../../shared/constants';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type ISearchStayOffersResultDto, type ISearchStayOffersParamsDto, SearchStayOffersParamsDtoSchema } from '../../dto';
import type { IStayOffersFilterParams, ISorting, StayOffersSortFactor, IStaySearchHistory, ICitiesLogic } from '../../../shared/interfaces';
import type { IAppLogger } from '../../../shared/applogger';
import { getValue, setValue } from '../../../server-logic/helpers/user-session';
import { mapSearchedStayOffer, mapSearchStayOfferResultEntities } from './../../utils/mappers';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../server/utils/auth';

function performAdditionalDtoValidation (dto: ISearchStayOffersParamsDto, event : H3Event, logger: IAppLogger) {
  if (dto.price?.to && dto.price?.from && dto.price.from > dto.price.to) {
    logger.warn(`(api:stay-search) search stay query price range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.checkIn && dto.checkOut && dto.checkIn.getTime() > dto.checkOut.getTime()) {
    logger.warn(`(api:stay-search) search stay query date range is incorrect, url=${event.node.req.url}`, undefined, dto);
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

async function addCityToSearchHistory (citySlug: string | undefined, citiesLogic: ICitiesLogic, event: H3Event, logger: IAppLogger): Promise<void> {
  if (!citySlug) {
    return;
  }

  const cityId = (await citiesLogic.getPopularCities()).find(x => x.slug === citySlug)?.id;
  if (cityId) {
    try {
      logger.verbose(`(api:stay-search) adding popular city to search history, citySlug=${citySlug}, id=${cityId}`);

      let searchHistory = destr<IStaySearchHistory | undefined>(await getValue(event, SessionStaySearchHistory));
      if (!searchHistory) {
        searchHistory = { popularCityIds: [] };
      }
      if (searchHistory.popularCityIds.includes(cityId)) {
        logger.debug(`(api:stay-search) wont add city to search history as it is already there, citySlug=${citySlug}, id=${cityId}`);
        return;
      }
      searchHistory.popularCityIds = [cityId, ...searchHistory.popularCityIds];
      if (searchHistory.popularCityIds.length > MaxSearchHistorySize) {
        searchHistory.popularCityIds.pop();
      }
      logger.debug(`(api:stay-search) city search history updated, result=${JSON.stringify(searchHistory.popularCityIds)}`);
      await setValue(event, SessionStaySearchHistory, JSON.stringify(searchHistory));
    } catch (err: any) {
      logger.warn(`(api:stay-search) failed to add popular city to search history, citySlug=${citySlug}, id=${cityId}`, err);
    }
  }
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const staysLogic = ServerServicesLocator.getStaysLogic();
  const citiesLogic = ServerServicesLocator.getCitiesLogic();

  logger.debug('(api:stay-search) parsing stay offers search query from HTTP body');
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

  const searchResults = await staysLogic.searchOffers(filterParams, userId ?? 'guest', sorting, searchParamsDto.pagination, searchParamsDto.narrowFilterParams);
  await addCityToSearchHistory(searchParamsDto.citySlug, citiesLogic, event, logger);

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

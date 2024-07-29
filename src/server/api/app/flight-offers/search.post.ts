import type { H3Event } from 'h3';
import { Decimal } from 'decimal.js';
import { AppException, AppExceptionCodeEnum } from '../../../../shared/exceptions';
import { defineWebApiEventHandler } from '../../../utils/webapi-event-handler';
import { type ISearchFlightOffersParamsDto, SearchFlightOffersParamsDtoSchema, type ISearchFlightOffersResultDto } from '../../../dto';
import type { IFlightOffersFilterParams, ISorting, FlightOffersSortFactor } from '../../../../shared/interfaces';
import type { IAppLogger } from '../../../../shared/applogger';
import { mapSearchFlightOfferResultEntities, mapSearchedFlightOffer } from '../../../utils/mappers';
import { getServerSession } from '#auth';
import { extractUserIdFromSession } from './../../../../server/utils/auth';

function performAdditionalDtoValidation (dto: ISearchFlightOffersParamsDto, event : H3Event, logger: IAppLogger) {
  if (dto.price?.to && dto.price?.from && dto.price.from > dto.price.to) {
    logger.warn(`(api:flight-search) search flights query price range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.dateFrom && dto.dateTo && dto.dateFrom.getTime() > dto.dateTo.getTime()) {
    logger.warn(`(api:flight-search) search flights query date range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.departureTimeOfDay?.to && dto.departureTimeOfDay?.from && dto.departureTimeOfDay.from > dto.departureTimeOfDay.to) {
    logger.warn(`(api:flight-search) search flights query departure time of day range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }
}

function getSortDirection (sort: FlightOffersSortFactor): 'asc' | 'desc' {
  switch (sort) {
    case 'duration':
      return 'asc';
    case 'price':
      return 'asc';
    case 'timetodeparture':
      return 'asc';
    default:
      return 'desc';
  }
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();
  const flightsLogic = ServerServicesLocator.getFlightsLogic();

  logger.debug('(api:flight-search) parsing flight offers search query from HTTP body');
  const searchParamsDto = SearchFlightOffersParamsDtoSchema.cast(await readBody(event));
  performAdditionalDtoValidation(searchParamsDto, event, logger);

  const filterParams: IFlightOffersFilterParams = {
    airlineCompanyIds: searchParamsDto.airlineCompanyIds,
    ratings: searchParamsDto.ratings,
    class: searchParamsDto.class,
    dateFrom: searchParamsDto.dateFrom,
    dateTo: searchParamsDto.dateTo,
    departureTimeOfDay: searchParamsDto.departureTimeOfDay,
    flexibleDates: searchParamsDto.flexibleDates,
    fromCitySlug: searchParamsDto.fromCitySlug,
    toCitySlug: searchParamsDto.toCitySlug,
    numPassengers: searchParamsDto.numPassengers,
    price: searchParamsDto.price
      ? {
          from: searchParamsDto.price.from ? new Decimal(searchParamsDto.price.from) : undefined,
          to: searchParamsDto.price.to ? new Decimal(searchParamsDto.price.to) : undefined
        }
      : undefined,
    tripType: searchParamsDto.tripType
  };

  const authSession = await getServerSession(event);
  const userId = extractUserIdFromSession(authSession);
  
  const primaryFactor = searchParamsDto.primarySort as FlightOffersSortFactor;
  const primarySorting: ISorting<FlightOffersSortFactor> = {
    factor: primaryFactor,
    direction: getSortDirection(primaryFactor)
  };

  const secondaryFactor = searchParamsDto.secondarySort as FlightOffersSortFactor;
  const secondarySorting: ISorting<FlightOffersSortFactor> = {
    factor: secondaryFactor,
    direction: getSortDirection(secondaryFactor)
  };

  const searchResults = await flightsLogic.searchOffers(filterParams, userId ?? 'guest', primarySorting, secondarySorting, searchParamsDto.pagination, searchParamsDto.narrowFilterParams, searchParamsDto.topOffersStats, event.context.preview.mode);

  setHeader(event, 'content-type', 'application/json');

  const result: ISearchFlightOffersResultDto = {
    entities: mapSearchFlightOfferResultEntities(searchResults),
    pagedItems: searchResults.pagedItems.map((item) => {
      return mapSearchedFlightOffer(item);
    }),
    totalCount: searchResults.totalCount,
    paramsNarrowing: searchResults.paramsNarrowing,
    topOffers: searchResults.topOffers?.map((o) => {
      return {
        factor: o.factor,
        price: o.price.toNumber(),
        duration: o.duration
      };
    })
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false, validationSchema: SearchFlightOffersParamsDtoSchema });

import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import { Decimal } from 'decimal.js';
import isString from 'lodash-es/isString';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type ISearchFlightOffersParamsDto, SearchFlightOffersParamsDtoSchema, type ISearchedFlightOfferDto, type ISearchFlightOffersResultDto, type ISearchedFlightDto, type IAirlineCompanyDto, type IAirplaneDto, type IAirportDto } from '../../dto';
import type { IFlightOffersFilterParams, EntityId, ISorting, FlightOffersSortFactor, IFlight, IAirlineCompany, IAirplane, IAirport, IFlightOffer, MakeSearchResultEntity, ISearchFlightOffersResult } from './../../../shared/interfaces';
import type { IAppLogger } from './../../../shared/applogger';
import { getServerSession } from '#auth';

function performAdditionalDtoValidation (dto: ISearchFlightOffersParamsDto, event : H3Event, logger: IAppLogger) {
  if (dto.price?.to && dto.price?.from && dto.price.from > dto.price.to) {
    logger.warn(`search flights query price range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.dateFrom && dto.dateTo && dto.dateFrom.getTime() > dto.dateTo.getTime()) {
    logger.warn(`search flights query date range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.departureTimeOfDay?.to && dto.departureTimeOfDay?.from && dto.departureTimeOfDay.from > dto.departureTimeOfDay.to) {
    logger.warn(`search flights query departure time of day range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }
}

function mapAirlineCompany (value: MakeSearchResultEntity<IAirlineCompany>): IAirlineCompanyDto {
  const mapped: IAirlineCompanyDto = {
    id: value.id,
    logoImage: {
      slug: value.logoImage.slug,
      timestamp: value.logoImage.timestamp
    },
    city: {
      geo: value.city.geo
    },
    name: value.name,
    numReviews: value.numReviews,
    reviewScore: value.reviewScore
  };
  return mapped;
}

function mapAirplane (value: MakeSearchResultEntity<IAirplane>): IAirplaneDto {
  const mapped: IAirplaneDto = {
    id: value.id,
    name: value.name,
    images: value.images.map((i) => {
      return {
        id: i.id,
        kind: i.kind,
        order: i.order,
        image: {
          slug: i.image.slug,
          timestamp: i.image.timestamp
        }
      };
    })
  };
  return mapped;
}

function mapAirport (value: MakeSearchResultEntity<IAirport>): IAirportDto {
  const mapped: IAirportDto = {
    id: value.id,
    name: value.name,
    city: {
      id: value.city.id,
      name: value.city.name,
      slug: value.city.slug,
      geo: value.city.geo,
      utcOffsetMin: value.city.utcOffsetMin,
      country: {
        name: value.city.country.name,
        id: value.city.country.id
      }
    },
    geo: value.geo
  };
  return mapped;
}

function mapSearchFlightOfferResultEntities (result: ISearchFlightOffersResult): {
  airlineCompanies: IAirlineCompanyDto[],
  airplanes: IAirplaneDto[],
  airports: IAirportDto[]
} {
  const airlineCompaniesMap = new Map<EntityId, IAirlineCompanyDto>();
  const airplanesMap = new Map<EntityId, IAirplaneDto>();
  const airportsMap = new Map<EntityId, IAirportDto>();

  const indexAirport = (airport: MakeSearchResultEntity<IAirport>) => {
    if (!airportsMap.get(airport.id)) {
      airportsMap.set(airport.id, mapAirport(airport));
    }
  };

  const indexAirplane = (airplane: MakeSearchResultEntity<IAirplane>) => {
    if (!airplanesMap.get(airplane.id)) {
      airplanesMap.set(airplane.id, mapAirplane(airplane));
    }
  };

  const indexAirlineCompany = (airlineCompany: MakeSearchResultEntity<IAirlineCompany>) => {
    if (!airlineCompaniesMap.get(airlineCompany.id)) {
      airlineCompaniesMap.set(airlineCompany.id, mapAirlineCompany(airlineCompany));
    }
  };

  const indexFlight = (flight: MakeSearchResultEntity<IFlight>) => {
    indexAirlineCompany(flight.airlineCompany);
    indexAirplane(flight.airplane);
    indexAirport(flight.departAirport);
    indexAirport(flight.arriveAirport);
  };

  result.pagedItems.forEach((offer) => {
    indexFlight(offer.departFlight);
    if (offer.arriveFlight) {
      indexFlight(offer.arriveFlight);
    }
  });

  return {
    airlineCompanies: [...airlineCompaniesMap.values()],
    airplanes: [...airplanesMap.values()],
    airports: [...airportsMap.values()]
  };
}

function mapFlight (value: MakeSearchResultEntity<IFlight>): ISearchedFlightDto {
  const mapped: ISearchedFlightDto = {
    id: value.id,
    airlineCompanyId: value.airlineCompany.id,
    airplaneId: value.airplane.id,
    arriveAirportId: value.arriveAirport.id,
    departAirportId: value.departAirport.id,
    arriveTimeUtc: value.arriveTimeUtc.toISOString(),
    departTimeUtc: value.departTimeUtc.toISOString()
  };
  return mapped;
}

function mapOffer (value: MakeSearchResultEntity<IFlightOffer>): ISearchedFlightOfferDto {
  const mapped: ISearchedFlightOfferDto = {
    id: value.id,
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    class: value.class,
    departFlight: mapFlight(value.departFlight),
    arriveFlight: value.arriveFlight ? mapFlight(value.arriveFlight) : undefined,
    numPassengers: value.numPassengers
  };
  return mapped;
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

  logger.debug('parsing flight offers search query from HTTP body');
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
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

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

  const searchResults = await flightsLogic.searchOffers(filterParams, userId ?? 'guest', primarySorting, secondarySorting, searchParamsDto.pagination, searchParamsDto.narrowFilterParams, searchParamsDto.topOffersStats);

  onHeaders(event.node.res, () => {
    setHeader(event, 'content-type', 'application/json');
  });

  const result: ISearchFlightOffersResultDto = {
    entities: mapSearchFlightOfferResultEntities(searchResults),
    pagedItems: searchResults.pagedItems.map((item) => {
      return mapOffer(item);
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

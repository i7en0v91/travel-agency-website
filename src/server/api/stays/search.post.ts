import { H3Event } from 'h3';
import onHeaders from 'on-headers';
import { Decimal } from 'decimal.js';
import isString from 'lodash-es/isString';
import { AppException, AppExceptionCodeEnum } from '../../../shared/exceptions';
import { defineWebApiEventHandler } from '../../utils/webapi-event-handler';
import { type ISearchedStayOfferDto, type ISearchStayOffersResultDto, type ISearchStayOffersParamsDto, SearchStayOffersParamsDtoSchema, type ICityDto, type ISearchedStayDto } from '../../dto';
import type { MakeSearchResultEntity, ISearchStayOffersResult, IStayOffersFilterParams, EntityId, ISorting, StayOffersSortFactor, IStayOffer, IStayShort } from './../../../shared/interfaces';
import type { IAppLogger } from './../../../shared/applogger';
import { getServerSession } from '#auth';

function performAdditionalDtoValidation (dto: ISearchStayOffersParamsDto, event : H3Event, logger: IAppLogger) {
  if (dto.price?.to && dto.price?.from && dto.price.from > dto.price.to) {
    logger.warn(`search stay query price range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }

  if (dto.checkIn && dto.checkOut && dto.checkIn.getTime() > dto.checkOut.getTime()) {
    logger.warn(`search stay query date range is incorrect, url=${event.node.req.url}`, undefined, dto);
    throw new AppException(AppExceptionCodeEnum.BAD_REQUEST, 'search query arguments are incorrect', 'error-stub');
  }
}

function mapSearchStayOfferResultEntities (result: ISearchStayOffersResult): { cities: ICityDto[] } {
  const citiesMap = new Map<EntityId, ICityDto>();
  result.pagedItems.forEach((offer) => {
    const city = offer.stay.city;
    if (!citiesMap.get(city.id)) {
      citiesMap.set(city.id, city);
    }
  });

  return {
    cities: [...citiesMap.values()]
  };
}

function mapStay (value: MakeSearchResultEntity<IStayShort>): ISearchedStayDto {
  return {
    cityId: value.city.id,
    geo: value.geo,
    id: value.id,
    slug: value.slug,
    name: value.name,
    numReviews: value.numReviews,
    rating: value.rating,
    reviewScore: value.reviewScore,
    photo: {
      slug: value.photo.slug,
      timestamp: value.photo.timestamp
    }
  };
}

function mapOffer (value: MakeSearchResultEntity<IStayOffer>): ISearchedStayOfferDto {
  const mapped: ISearchedStayOfferDto = {
    id: value.id,
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    checkInDate: value.checkIn.toISOString(),
    checkOutDate: value.checkOut.toISOString(),
    numGuests: value.numGuests,
    numRooms: value.numRooms,
    stay: mapStay(value.stay)
  };
  return mapped;
}

function getSortDirection (sort: StayOffersSortFactor): 'asc' | 'desc' {
  switch (sort) {
    case 'price':
      return 'asc';
    default:
      return 'desc';
  }
}

export default defineWebApiEventHandler(async (event : H3Event) => {
  const logger = ServerServicesLocator.getLogger();

  const staysLogic = ServerServicesLocator.getStaysLogic();

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
  let userId : EntityId | undefined = (authSession as any)?.id as EntityId;
  if (userId && isString(userId)) {
    userId = parseInt(userId);
  }

  const sortFactor = searchParamsDto.sort as StayOffersSortFactor;
  const sorting: ISorting<StayOffersSortFactor> = {
    factor: sortFactor,
    direction: getSortDirection(sortFactor)
  };

  const searchResults = await staysLogic.searchOffers(filterParams, userId ?? 'guest', sorting, searchParamsDto.pagination, searchParamsDto.narrowFilterParams);

  onHeaders(event.node.res, () => {
    setHeader(event, 'content-type', 'application/json');
  });

  const result: ISearchStayOffersResultDto = {
    entities: mapSearchStayOfferResultEntities(searchResults),
    pagedItems: searchResults.pagedItems.map((item) => {
      return mapOffer(item);
    }),
    totalCount: searchResults.totalCount,
    paramsNarrowing: searchResults.paramsNarrowing
  };
  return result;
}, { logResponseBody: false, authorizedOnly: false, validationSchema: SearchStayOffersParamsDtoSchema });

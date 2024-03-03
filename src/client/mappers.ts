import { Decimal } from 'decimal.js';
import type { ICity, ISearchFlightOffersResult, ISearchStayOffersResult, MakeSearchResultEntity, IFlightOffer, IFlight, IAirlineCompany, IAirport, IAirplane, IStayOffer, IStayShort } from './../shared/interfaces';
import type { ICityDto, ISearchStayOffersResultDto, IAirlineCompanyDto, ISearchedFlightDto, ISearchedFlightOfferDto, IAirportDto, IAirplaneDto, ISearchedStayOfferDto, ISearchFlightOffersResultDto, ISearchedStayDto } from './../server/dto';
import { AppException, AppExceptionCodeEnum } from './../shared/exceptions';

export function mapAirlineCompany (dto: IAirlineCompanyDto): MakeSearchResultEntity<IAirlineCompany> {
  return {
    id: dto.id,
    logoImage: dto.logoImage,
    name: dto.name,
    city: {
      geo: dto.city.geo
    },
    numReviews: dto.numReviews,
    reviewScore: dto.reviewScore
  };
}

function mapCity (dto: ICityDto): MakeSearchResultEntity<ICity> {
  return {
    id: dto.id,
    country: {
      id: dto.country.id,
      name: dto.country.name
    },
    name: dto.name,
    geo: dto.geo,
    utcOffsetMin: dto.utcOffsetMin,
    slug: dto.slug
  };
}

function mapAirport (dto: IAirportDto): MakeSearchResultEntity<IAirport> {
  return {
    id: dto.id,
    name: dto.name,
    city: mapCity(dto.city),
    geo: dto.geo
  };
}

function mapAirplane (dto: IAirplaneDto): MakeSearchResultEntity<IAirplane> {
  return {
    id: dto.id,
    name: dto.name,
    images: dto.images.map((i) => {
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
}

export interface ISearchFlightOffersResultLookup {
  lookupAirlineCompany: (id: number) => MakeSearchResultEntity<IAirlineCompany>,
  lookupAirplane: (id: number) => MakeSearchResultEntity<IAirplane>,
  lookupAirport: (id: number) => MakeSearchResultEntity<IAirport>
}

export interface ISearchStayOffersResultLookup {
  lookupCity: (id: number) => MakeSearchResultEntity<ICity>,
}

export function mapSearchedFlight (dto: ISearchedFlightDto, lookup: ISearchFlightOffersResultLookup): MakeSearchResultEntity<IFlight> {
  return {
    id: dto.id,
    airlineCompany: lookup.lookupAirlineCompany(dto.airlineCompanyId),
    arriveTimeUtc: new Date(Date.parse(dto.arriveTimeUtc)),
    departTimeUtc: new Date(Date.parse(dto.departTimeUtc)),
    arriveAirport: lookup.lookupAirport(dto.arriveAirportId),
    departAirport: lookup.lookupAirport(dto.departAirportId),
    airplane: lookup.lookupAirplane(dto.airplaneId)
  };
}

export function mapSearchedFlightOffer (dto: ISearchedFlightOfferDto, lookup: ISearchFlightOffersResultLookup): MakeSearchResultEntity<IFlightOffer> {
  return {
    id: dto.id,
    kind: 'flights',
    class: dto.class,
    departFlight: mapSearchedFlight(dto.departFlight, lookup),
    arriveFlight: dto.arriveFlight ? mapSearchedFlight(dto.arriveFlight, lookup) : undefined,
    numPassengers: dto.numPassengers,
    totalPrice: new Decimal(dto.totalPrice),
    isFavourite: dto.isFavourite
  };
}

export function createSearchFlightOfferResultLookup (resultDto: ISearchFlightOffersResultDto): ISearchFlightOffersResultLookup {
  const airlineCompaniesMap = new Map<number, MakeSearchResultEntity<IAirlineCompany>>();
  const airplanesMap = new Map<number, MakeSearchResultEntity<IAirplane>>();
  const airportsMap = new Map<number, MakeSearchResultEntity<IAirport>>();

  const indexAirport = (airport: IAirportDto) => {
    if (!airportsMap.get(airport.id)) {
      airportsMap.set(airport.id, mapAirport(airport));
    }
  };

  const indexAirplane = (airplane: IAirplaneDto) => {
    if (!airplanesMap.get(airplane.id)) {
      airplanesMap.set(airplane.id, mapAirplane(airplane));
    }
  };

  const indexAirlineCompany = (airlineCompany: IAirlineCompanyDto) => {
    if (!airlineCompaniesMap.get(airlineCompany.id)) {
      airlineCompaniesMap.set(airlineCompany.id, mapAirlineCompany(airlineCompany));
    }
  };

  resultDto.entities.airlineCompanies.forEach(indexAirlineCompany);
  resultDto.entities.airplanes.forEach(indexAirplane);
  resultDto.entities.airports.forEach(indexAirport);

  const wrapThrowExceptionOnLookupFailed = <TResult>(innerFunc: (id: number) => TResult | undefined): (id: number) => TResult => {
    const logger = CommonServicesLocator.getLogger();
    const wrapper: (id: number) => TResult = (id: number): TResult => {
      try {
        const result = innerFunc(id);
        if (!result) {
          logger.error(`(mappers) cannot lookup search flight result entity by id=${id}`, undefined, resultDto);
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search flight offers result', 'error-page');
        }
        return result;
      } catch (err: any) {
        logger.error('(mappers) unexpected error occured while processing search flight offers result', err, resultDto);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search flight offers result', 'error-page');
      }
    };
    return wrapper;
  };

  return {
    lookupAirlineCompany (id: number): MakeSearchResultEntity<IAirlineCompany> { return wrapThrowExceptionOnLookupFailed((id: number) => { return airlineCompaniesMap.get(id); })(id); },
    lookupAirport (id: number): MakeSearchResultEntity<IAirport> { return wrapThrowExceptionOnLookupFailed((id: number) => { return airportsMap.get(id); })(id); },
    lookupAirplane (id: number): MakeSearchResultEntity<IAirplane> { return wrapThrowExceptionOnLookupFailed((id: number) => { return airplanesMap.get(id); })(id); }
  };
}

export function createSearchStayOfferResultLookup (resultDto: ISearchStayOffersResultDto): ISearchStayOffersResultLookup {
  const citiesMap = new Map<number, MakeSearchResultEntity<ICity>>();

  resultDto.entities.cities.forEach((city) => {
    if (!citiesMap.get(city.id)) {
      citiesMap.set(city.id, mapCity(city));
    }
  });

  const wrapThrowExceptionOnLookupFailed = <TResult>(innerFunc: (id: number) => TResult | undefined): (id: number) => TResult => {
    const logger = CommonServicesLocator.getLogger();
    const wrapper: (id: number) => TResult = (id: number): TResult => {
      try {
        const result = innerFunc(id);
        if (!result) {
          logger.error(`(mappers) cannot lookup search stay result entity by id=${id}`, undefined, resultDto);
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search stay offers result', 'error-page');
        }
        return result;
      } catch (err: any) {
        logger.error('(mappers) unexpected error occured while processing search stay offers result', err, resultDto);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search stay offers result', 'error-page');
      }
    };
    return wrapper;
  };

  return {
    lookupCity (id: number): MakeSearchResultEntity<ICity> { return wrapThrowExceptionOnLookupFailed((id: number) => { return citiesMap.get(id); })(id); }
  };
}

export function mapSearchFlightOffersResult (resultDto: ISearchFlightOffersResultDto): ISearchFlightOffersResult {
  const lookup = createSearchFlightOfferResultLookup(resultDto);
  return {
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
}

export function mapSearchedStay (dto: ISearchedStayDto, lookup: ISearchStayOffersResultLookup): MakeSearchResultEntity<IStayShort> {
  return {
    city: lookup.lookupCity(dto.cityId),
    id: dto.id,
    geo: {
      lat: dto.geo.lat,
      lon: dto.geo.lon
    },
    name: dto.name,
    numReviews: dto.numReviews,
    rating: dto.rating,
    reviewScore: dto.reviewScore,
    slug: dto.slug,
    photo: dto.photo
  };
}

export function mapSearchedStayOffer (dto: ISearchedStayOfferDto, lookup: ISearchStayOffersResultLookup): MakeSearchResultEntity<IStayOffer> {
  return {
    id: dto.id,
    kind: 'stays',
    checkIn: new Date(Date.parse(dto.checkInDate)),
    checkOut: new Date(Date.parse(dto.checkOutDate)),
    numGuests: dto.numGuests,
    numRooms: dto.numRooms,
    stay: mapSearchedStay(dto.stay, lookup),
    totalPrice: new Decimal(dto.totalPrice),
    isFavourite: dto.isFavourite
  };
}

export function mapSearchStayOffersResult (resultDto: ISearchStayOffersResultDto): ISearchStayOffersResult {
  const lookup = createSearchStayOfferResultLookup(resultDto);
  return {
    pagedItems: resultDto.pagedItems.map((dto) => { return mapSearchedStayOffer(dto, lookup); }),
    totalCount: resultDto.totalCount,
    paramsNarrowing: resultDto.paramsNarrowing
  };
};

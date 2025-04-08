import { AppException, AppExceptionCodeEnum, type ReviewSummary, type IOfferBooking, type IStayImageShort, type IStayOfferDetails, type IStay, type ICity, type ISearchFlightOffersResult, type ISearchStayOffersResult, type EntityDataAttrsOnly, type IFlightOffer, type IFlight, type IAirlineCompany, type IAirport, type IAirplane, type IStayOffer, type IStayShort } from '@golobe-demo/shared';
import type { ILoadOffersResultDto, IStayDto, IFlightDto, IFlightOfferDetailsDto, IStayOfferDetailsDto, ICityDto, ISearchStayOffersResultDto, IAirlineCompanyDto, ISearchedFlightDto, ISearchedFlightOfferDto, IAirportDto, IAirplaneDto, ISearchedStayOfferDto, ISearchFlightOffersResultDto, ISearchedStayDto, IBookingDetailsDto, IReviewSummaryDto } from '../server/api-definitions';
import { Decimal } from 'decimal.js';
import orderBy from 'lodash-es/orderBy';
import { getCommonServices } from './service-accessors';

export function mapAirlineCompany (dto: IAirlineCompanyDto): EntityDataAttrsOnly<IAirlineCompany> {
  return {
    id: dto.id,
    logoImage: dto.logoImage,
    name: dto.name,
    city: {
      geo: dto.city.geo
    },
    reviewSummary: {
      numReviews: dto.numReviews,
      score: dto.reviewScore
    }
  };
}

function mapCity (dto: ICityDto): EntityDataAttrsOnly<ICity> {
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

function mapAirport (dto: IAirportDto): EntityDataAttrsOnly<IAirport> {
  return {
    id: dto.id,
    name: dto.name,
    city: mapCity(dto.city),
    geo: dto.geo
  };
}

function mapAirplane (dto: IAirplaneDto): EntityDataAttrsOnly<IAirplane> {
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
  lookupAirlineCompany: (id: string) => EntityDataAttrsOnly<IAirlineCompany>,
  lookupAirplane: (id: string) => EntityDataAttrsOnly<IAirplane>,
  lookupAirport: (id: string) => EntityDataAttrsOnly<IAirport>
}

export interface ISearchStayOffersResultLookup {
  lookupCity: (id: string) => EntityDataAttrsOnly<ICity>,
}

export function mapSearchedFlight (dto: ISearchedFlightDto, lookup: ISearchFlightOffersResultLookup): EntityDataAttrsOnly<IFlight> {
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

export function mapSearchedFlightOffer (dto: ISearchedFlightOfferDto, lookup: ISearchFlightOffersResultLookup): EntityDataAttrsOnly<IFlightOffer> {
  return {
    id: dto.id,
    kind: 'flights',
    class: dto.class,
    departFlight: mapSearchedFlight(dto.departFlight, lookup),
    arriveFlight: dto.arriveFlight ? mapSearchedFlight(dto.arriveFlight, lookup) : undefined,
    numPassengers: dto.numPassengers,
    totalPrice: new Decimal(dto.totalPrice)
  };
}

function mapFlight (dto: IFlightDto): EntityDataAttrsOnly<IFlight> {
  return {
    id: dto.id,
    airlineCompany: mapAirlineCompany(dto.airlineCompany),
    airplane: mapAirplane(dto.airplane),
    departAirport: mapAirport(dto.departAirport),
    arriveAirport: mapAirport(dto.arriveAirport),
    arriveTimeUtc: new Date(Date.parse(dto.arriveTimeUtc)),
    departTimeUtc: new Date(Date.parse(dto.departTimeUtc))
  };
}

export function mapFlightOfferDetails (dto: IFlightOfferDetailsDto): Omit<IFlightOffer, 'dataHash'> {
  return {
    id: dto.id,
    createdUtc: new Date(Date.parse(dto.createdUtc)),
    modifiedUtc: new Date(Date.parse(dto.modifiedUtc)),
    isDeleted: false,
    kind: 'flights' as const,
    departFlight: mapFlight(dto.departFlight),
    arriveFlight: dto.arriveFlight ? mapFlight(dto.arriveFlight) : undefined,
    numPassengers: dto.numPassengers,
    class: dto.class,
    totalPrice: new Decimal(dto.totalPrice)
  };
}

function mapStay (dto: IStayDto, reviewSummary?: ReviewSummary): EntityDataAttrsOnly<Omit<IStay, 'images' | 'reviews'> & IStayShort & { images: IStayImageShort[], reviewSummary?: ReviewSummary }> {
  return {
    id: dto.id,
    city: mapCity(dto.city),
    name: dto.name,
    geo: {
      lat: dto.geo.lat,
      lon: dto.geo.lon
    },
    slug: dto.slug,
    images: dto.images.map((i) => {
      return {
        slug: i.slug,
        timestamp: i.timestamp,
        order: i.order,
        serviceLevel: i.serviceLevel
      };
    }),
    description: dto.description.map((d, idx) => {
      return {
        id: d.id,
        textStr: d.textStr,
        paragraphKind: d.paragraphKind,
        order: idx
      };
    }),
    reviewSummary: reviewSummary ? {
      numReviews: reviewSummary.numReviews,
      score: reviewSummary.score,
    } : undefined,
    photo: dto.images.filter(i => i.order === 0).map((i) => {
      return {
        slug: i.slug,
        timestamp: i.timestamp
      };
    })[0]
  };
}

export function mapStayOfferDetails (dto: IStayOfferDetailsDto, reviewSummary: ReviewSummary | undefined): Omit<IStayOfferDetails, 'dataHash'> {
  return {
    id: dto.id,
    createdUtc: new Date(Date.parse(dto.createdUtc)),
    modifiedUtc: new Date(Date.parse(dto.modifiedUtc)),
    checkIn: new Date(Date.parse(dto.checkInDate)),
    checkOut: new Date(Date.parse(dto.checkOutDate)),
    isDeleted: false,
    kind: 'stays' as const,
    numGuests: dto.numGuests,
    numRooms: dto.numRooms,
    totalPrice: new Decimal(dto.totalPrice),
    stay: mapStay(dto.stay, reviewSummary),
    prices: {
      Base: new Decimal(dto.prices.Base),
      CityView1: new Decimal(dto.prices.CityView1),
      CityView2: new Decimal(dto.prices.CityView2),
      CityView3: new Decimal(dto.prices.CityView3)
    }
  };
}

export function createSearchFlightOfferResultLookup (resultDto: ISearchFlightOffersResultDto): ISearchFlightOffersResultLookup {
  const airlineCompaniesMap = new Map<string, EntityDataAttrsOnly<IAirlineCompany>>();
  const airplanesMap = new Map<string, EntityDataAttrsOnly<IAirplane>>();
  const airportsMap = new Map<string, EntityDataAttrsOnly<IAirport>>();

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

  const logger = getCommonServices().getLogger().addContextProps({ component: 'Mappers' });
  const wrapThrowExceptionOnLookupFailed = <TResult>(innerFunc: (id: string) => TResult | undefined): (id: string) => TResult => {
    const wrapper: (id: string) => TResult = (id: string): TResult => {
      try {
        const result = innerFunc(id);
        if (!result) {
          logger.error('cannot lookup search flight result entity by', undefined, { ...(resultDto), id });
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search flight offers result', 'error-page');
        }
        return result;
      } catch (err: any) {
        logger.error('unexpected exception occured while processing search flight offers result', err, resultDto);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search flight offers result', 'error-page');
      }
    };
    return wrapper;
  };

  return {
    lookupAirlineCompany (id: string): EntityDataAttrsOnly<IAirlineCompany> { return wrapThrowExceptionOnLookupFailed((id: string) => { return airlineCompaniesMap.get(id); })(id); },
    lookupAirport (id: string): EntityDataAttrsOnly<IAirport> { return wrapThrowExceptionOnLookupFailed((id: string) => { return airportsMap.get(id); })(id); },
    lookupAirplane (id: string): EntityDataAttrsOnly<IAirplane> { return wrapThrowExceptionOnLookupFailed((id: string) => { return airplanesMap.get(id); })(id); }
  };
}

export function createSearchStayOfferResultLookup (resultDto: ISearchStayOffersResultDto): ISearchStayOffersResultLookup {
  const citiesMap = new Map<string, EntityDataAttrsOnly<ICity>>();

  resultDto.entities.cities.forEach((city) => {
    if (!citiesMap.get(city.id)) {
      citiesMap.set(city.id, mapCity(city));
    }
  });

  const logger = getCommonServices().getLogger().addContextProps({ component: 'Mappers' });
  const wrapThrowExceptionOnLookupFailed = <TResult>(innerFunc: (id: string) => TResult | undefined): (id: string) => TResult => {
    const wrapper: (id: string) => TResult = (id: string): TResult => {
      try {
        const result = innerFunc(id);
        if (!result) {
          logger.error('cannot lookup search stay result entity by', undefined, { ...(resultDto), id });
          throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search stay offers result', 'error-page');
        }
        return result;
      } catch (err: any) {
        logger.error('unexpected exception occured while processing search stay offers result', err, resultDto);
        throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'error occured while processing search stay offers result', 'error-page');
      }
    };
    return wrapper;
  };

  return {
    lookupCity (id: string): EntityDataAttrsOnly<ICity> { return wrapThrowExceptionOnLookupFailed((id: string) => { return citiesMap.get(id); })(id); }
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

export function mapSearchedStay (dto: ISearchedStayDto, lookup: ISearchStayOffersResultLookup): EntityDataAttrsOnly<IStayShort> & { reviewSummary?: ReviewSummary } {
  return {
    city: lookup.lookupCity(dto.cityId),
    id: dto.id,
    geo: {
      lat: dto.geo.lat,
      lon: dto.geo.lon
    },
    name: dto.name,
    reviewSummary: dto.reviewSummary ? {
      numReviews: dto.reviewSummary.numReviews,
      score: dto.reviewSummary.score,
    } : undefined,
    slug: dto.slug,
    photo: dto.photo
  };
}

export function mapSearchedStayOffer (dto: ISearchedStayOfferDto, lookup: ISearchStayOffersResultLookup): EntityDataAttrsOnly<IStayOffer> {
  return {
    id: dto.id,
    kind: 'stays',
    checkIn: new Date(Date.parse(dto.checkInDate)),
    checkOut: new Date(Date.parse(dto.checkOutDate)),
    numGuests: dto.numGuests,
    numRooms: dto.numRooms,
    stay: mapSearchedStay(dto.stay, lookup),
    totalPrice: new Decimal(dto.totalPrice)
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

export function mapLoadOffersResult (resultDto: ILoadOffersResultDto): {
  flights: EntityDataAttrsOnly<IFlightOffer>[],
  stays: EntityDataAttrsOnly<IStayOffer>[]
 } {
  const flightsLookup = createSearchFlightOfferResultLookup({
    entities: resultDto.flights.entities,
    pagedItems: resultDto.flights.items,
    totalCount: resultDto.flights.items.length
  });
  const flights = orderBy(resultDto.flights.items.map((i) => { return mapSearchedFlightOffer(i, flightsLookup); }), (i) => i.departFlight.departTimeUtc, 'desc');

  const staysLookup = createSearchStayOfferResultLookup({
    entities: resultDto.stays.entities,
    pagedItems: resultDto.stays.items,
    totalCount: resultDto.stays.items.length
  });
  const stays = orderBy(resultDto.stays.items.map((i) => { return mapSearchedStayOffer(i, staysLookup); }), ['checkIn'], ['desc']);
  
  return {
    flights,
    stays
  };
}

export function mapBookingDetails (dto: IBookingDetailsDto): EntityDataAttrsOnly<IOfferBooking<IFlightOffer | IStayOfferDetails>> {
  return {
    id: dto.id,
    userId: dto.bookedUser.id,
    offer: dto.kind === 'flights' ? mapFlightOfferDetails(dto.flightOffer!) : mapStayOfferDetails(dto.stayOffer!, dto.stayOffer!.reviewSummary),
    serviceLevel: dto.kind === 'stays' ? dto.serviceLevel : undefined
  };
}

export function mapReviewSummary(dto: IReviewSummaryDto): ReviewSummary {
  return {
    numReviews: dto.numReviews,
    score: dto.score
  };
}

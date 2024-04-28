import dayjs from 'dayjs';
import { CheckInOutDateUrlFormat } from './../../shared/constants';
import { type ISearchedStayDto, type ISearchedStayOfferDto, type ISearchedFlightDto, type ISearchedFlightOfferDto, type IFlightDto, type ICityDto, type IStayDto, type IFlightOfferDetailsDto, type IAirlineCompanyDto, type IAirplaneDto, type IAirportDto, type IStayOfferDetailsDto, type IStayReviewDto, type IBookingDetailsDto } from './../dto';
import type { ISearchStayOffersResult, IStayShort, IStayOffer, ISearchFlightOffersResult, EntityId, IOfferBooking, IStay, IStayReview, IStayImageShort, IFlight, ICity, IAirlineCompany, IAirplane, IAirport, IFlightOffer, EntityDataAttrsOnly, IStayOfferDetails } from './../../shared/interfaces';

export function mapAirlineCompany (value: EntityDataAttrsOnly<IAirlineCompany>): IAirlineCompanyDto {
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

export function mapAirplane (value: EntityDataAttrsOnly<IAirplane>): IAirplaneDto {
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

export function mapCity (city: EntityDataAttrsOnly<ICity>): ICityDto {
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    geo: city.geo,
    utcOffsetMin: city.utcOffsetMin,
    country: {
      name: city.country.name,
      id: city.country.id
    }
  };
}

export function mapAirport (value: EntityDataAttrsOnly<IAirport>): IAirportDto {
  const mapped: IAirportDto = {
    id: value.id,
    name: value.name,
    city: mapCity(value.city),
    geo: value.geo
  };
  return mapped;
}

export function mapFlight (value: EntityDataAttrsOnly<IFlight>): IFlightDto {
  const mapped: IFlightDto = {
    id: value.id,
    airlineCompany: mapAirlineCompany(value.airlineCompany),
    airplane: mapAirplane(value.airplane),
    arriveAirport: mapAirport(value.arriveAirport),
    departAirport: mapAirport(value.departAirport),
    arriveTimeUtc: value.arriveTimeUtc.toISOString(),
    departTimeUtc: value.departTimeUtc.toISOString()
  };
  return mapped;
}

export function mapFlightOffer (value: IFlightOffer): IFlightOfferDetailsDto {
  const mapped: IFlightOfferDetailsDto = {
    id: value.id,
    kind: 'flights',
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    class: value.class,
    departFlight: mapFlight(value.departFlight),
    arriveFlight: value.arriveFlight ? mapFlight(value.arriveFlight) : undefined,
    numPassengers: value.numPassengers,
    createdUtc: value.createdUtc.toISOString(),
    modifiedUtc: value.modifiedUtc.toISOString()
  };
  return mapped;
}

export function mapStayReview (stayReview: EntityDataAttrsOnly<IStayReview>, order: number): IStayReviewDto {
  return {
    id: stayReview.id,
    order,
    score: stayReview.score,
    text: stayReview.text,
    user: {
      id: stayReview.user.id,
      firstName: stayReview.user.firstName,
      lastName: stayReview.user.lastName,
      avatar: stayReview.user.avatar
        ? {
            slug: stayReview.user.avatar.slug,
            timestamp: stayReview.user.avatar.timestamp
          }
        : undefined
    }
  };
}

export function mapStay (stay: (Omit<EntityDataAttrsOnly<IStay>, 'images' | 'reviews'> & { images: IStayImageShort[], numReviews: number, reviewScore: number })): IStayDto {
  return {
    id: stay.id,
    city: mapCity(stay.city),
    geo: {
      lat: stay.geo.lat,
      lon: stay.geo.lon
    },
    name: stay.name,
    slug: stay.slug,
    images: stay.images.map((i) => {
      return {
        order: i.order,
        slug: i.slug,
        timestamp: i.timestamp,
        serviceLevel: i.serviceLevel
      };
    }),
    description: stay.description.map((d) => {
      return {
        id: d.id,
        order: d.order,
        paragraphKind: d.paragraphKind,
        textStr: d.textStr
      };
    }),
    numReviews: stay.numReviews,
    reviewScore: stay.reviewScore
  };
}

export function mapStayOffer (value: IStayOfferDetails): IStayOfferDetailsDto {
  const mapped: IStayOfferDetailsDto = {
    id: value.id,
    kind: 'stays',
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    checkInDate: dayjs(value.checkIn).format(CheckInOutDateUrlFormat),
    checkOutDate: dayjs(value.checkOut).format(CheckInOutDateUrlFormat),
    numGuests: value.numGuests,
    numRooms: value.numRooms,
    stay: mapStay(value.stay),
    createdUtc: value.createdUtc.toISOString(),
    modifiedUtc: value.modifiedUtc.toISOString(),
    prices: {
      base: value.prices.base.toNumber(),
      'cityView-1': value.prices['cityView-1'].toNumber(),
      'cityView-2': value.prices['cityView-2'].toNumber(),
      'cityView-3': value.prices['cityView-3'].toNumber()
    }
  };
  return mapped;
}

export function mapBooking (booking: IOfferBooking<IFlightOffer | IStayOfferDetails>): IBookingDetailsDto {
  return {
    id: booking.id,
    kind: booking.offer.kind,
    flightOffer: booking.offer.kind === 'flights' ? mapFlightOffer(booking.offer as IFlightOffer) : undefined,
    stayOffer: booking.offer.kind === 'stays' ? mapStayOffer(booking.offer as IStayOfferDetails) : undefined,
    bookedUser: {
      id: booking.bookedUser.id,
      avatar: booking.bookedUser.avatar,
      firstName: booking.bookedUser.firstName,
      lastName: booking.bookedUser.lastName
    },
    serviceLevel: booking.serviceLevel

  };
}

export function mapSearchFlightOfferResultEntities (result: ISearchFlightOffersResult): {
  airlineCompanies: IAirlineCompanyDto[],
  airplanes: IAirplaneDto[],
  airports: IAirportDto[]
} {
  const airlineCompaniesMap = new Map<EntityId, IAirlineCompanyDto>();
  const airplanesMap = new Map<EntityId, IAirplaneDto>();
  const airportsMap = new Map<EntityId, IAirportDto>();

  const indexAirport = (airport: EntityDataAttrsOnly<IAirport>) => {
    if (!airportsMap.get(airport.id)) {
      airportsMap.set(airport.id, mapAirport(airport));
    }
  };

  const indexAirplane = (airplane: EntityDataAttrsOnly<IAirplane>) => {
    if (!airplanesMap.get(airplane.id)) {
      airplanesMap.set(airplane.id, mapAirplane(airplane));
    }
  };

  const indexAirlineCompany = (airlineCompany: EntityDataAttrsOnly<IAirlineCompany>) => {
    if (!airlineCompaniesMap.get(airlineCompany.id)) {
      airlineCompaniesMap.set(airlineCompany.id, mapAirlineCompany(airlineCompany));
    }
  };

  const indexFlight = (flight: EntityDataAttrsOnly<IFlight>) => {
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

export function mapSearchedFlight (value: EntityDataAttrsOnly<IFlight>): ISearchedFlightDto {
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

export function mapSearchedFlightOffer (value: EntityDataAttrsOnly<IFlightOffer>): ISearchedFlightOfferDto {
  const mapped: ISearchedFlightOfferDto = {
    id: value.id,
    kind: 'flights',
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    class: value.class,
    departFlight: mapSearchedFlight(value.departFlight),
    arriveFlight: value.arriveFlight ? mapSearchedFlight(value.arriveFlight) : undefined,
    numPassengers: value.numPassengers
  };
  return mapped;
}

export function mapSearchStayOfferResultEntities (result: ISearchStayOffersResult): { cities: ICityDto[] } {
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

export function mapSearchedStay (value: EntityDataAttrsOnly<IStayShort>): ISearchedStayDto {
  return {
    cityId: value.city.id,
    geo: value.geo,
    id: value.id,
    slug: value.slug,
    name: value.name,
    numReviews: value.numReviews,
    reviewScore: value.reviewScore,
    photo: {
      slug: value.photo.slug,
      timestamp: value.photo.timestamp
    }
  };
}

export function mapSearchedStayOffer (value: EntityDataAttrsOnly<IStayOffer>): ISearchedStayOfferDto {
  const mapped: ISearchedStayOfferDto = {
    id: value.id,
    kind: 'stays',
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    checkInDate: value.checkIn.toISOString(),
    checkOutDate: value.checkOut.toISOString(),
    numGuests: value.numGuests,
    numRooms: value.numRooms,
    stay: mapSearchedStay(value.stay)
  };
  return mapped;
}

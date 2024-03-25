import dayjs from 'dayjs';
import { type IFlightDto, type ICityDto, type IStayDto, type IFlightOfferDetailsDto, type IAirlineCompanyDto, type IAirplaneDto, type IAirportDto, type IStayOfferDetailsDto, type IStayReviewDto } from './../dto';
import type { IStay, IStayReview, IStayImageShort, IFlight, ICity, IAirlineCompany, IAirplane, IAirport, IFlightOffer, MakeSearchResultEntity, IStayOfferDetails } from './../../shared/interfaces';

export function mapAirlineCompany (value: MakeSearchResultEntity<IAirlineCompany>): IAirlineCompanyDto {
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

export function mapAirplane (value: MakeSearchResultEntity<IAirplane>): IAirplaneDto {
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

export function mapCity (city: MakeSearchResultEntity<ICity>): ICityDto {
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

export function mapAirport (value: MakeSearchResultEntity<IAirport>): IAirportDto {
  const mapped: IAirportDto = {
    id: value.id,
    name: value.name,
    city: mapCity(value.city),
    geo: value.geo
  };
  return mapped;
}

function mapFlight (value: MakeSearchResultEntity<IFlight>): IFlightDto {
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

export function mapStayReview (stayReview: MakeSearchResultEntity<IStayReview>, order: number): IStayReviewDto {
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

export function mapStay (stay: (Omit<MakeSearchResultEntity<IStay>, 'images' | 'reviews'> & { images: IStayImageShort[], numReviews: number, reviewScore: number })): IStayDto {
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
    isFavourite: value.isFavourite,
    totalPrice: value.totalPrice.toNumber(),
    checkInDate: dayjs(value.checkIn).format('YYYY-MM-DD'),
    checkOutDate: dayjs(value.checkOut).format('YYYY-MM-DD'),
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

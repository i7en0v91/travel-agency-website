import { type CSSProperties } from 'vue';
import { Prisma } from '@prisma/client';
import { destr } from 'destr';
import orderBy from 'lodash-es/orderBy';
import omit from 'lodash-es/omit';
import { Decimal } from 'decimal.js';
import { type EntityDataAttrsOnly, type IStayImageShort, type AirplaneImageKind, type IStayDescription, type IStay, type IStayOffer, type IFlightOffer, type IAirport, type IAirplane, type IUserMinimalInfo, type IUserProfileInfo, type IUserEmailInfo, type IImageInfo, type IFileInfo, AuthProvider, ImageCategory, type IAirlineCompany, type ICity, type IFlight, type FlightClass, type EntityId, type IStayShort, type IStayReview, type IStayOfferDetails, type StayServiceLevel, type StayDescriptionParagraphType, type IOfferBooking } from '../shared/interfaces';
import { parseEnumOrThrow } from './../shared/common';
import { DefaultStayReviewScore } from './../shared/constants';

export const FileInfoQuery = {
  select: {
    id: true,
    mime: true,
    originalName: true,
    createdUtc: true,
    modifiedUtc: true,
    isDeleted: true
  }
};

export const ImageInfoQuery = {
  select: {
    id: true,
    slug: true,
    stubCssStyle: true,
    invertForDarkTheme: true,
    category: { select: { kind: true } },
    file: FileInfoQuery
  }
};

export const EmailVerificationTokenInfoQuery = {
  select: {
    id: true,
    attemptsMade: true,
    createdUtc: true,
    isDeleted: true
  }
};

export const UserEmailInfoQuery = {
  include: {
    verificationToken: EmailVerificationTokenInfoQuery
  },
  where: {
    isDeleted: false,
    newEmails: {
      none: {
        id: {
          gt: 0
        }
      }
    }
  }
};

export const UserMinimalQuery = {
  select: {
    id: true,
    passwordHash: true,
    createdUtc: true,
    modifiedUtc: true,
    emails: UserEmailInfoQuery,
    authProvider: true,
    providerIdentity: true,
    passwordSalt: true,
    firstName: true,
    lastName: true
  }
};

export const UserProfileQuery = {
  select: {
    ...UserMinimalQuery.select,
    cover: ImageInfoQuery,
    avatar: ImageInfoQuery
  }
};

export const AirplaneInfoQuery = {
  select: {
    createdUtc: true,
    modifiedUtc: true,
    id: true,
    nameStr: true,
    isDeleted: true,
    images: {
      select: {
        kind: true,
        order: true,
        id: true,
        isDeleted: true,
        modifiedUtc: true,
        createdUtc: true,
        image: {
          select: {
            slug: true,
            file: {
              select: {
                modifiedUtc: true
              }
            }
          }
        }
      }
    }
  }
};

export const CityInfoQuery = {
  select: {
    country: {
      select: {
        id: true,
        nameStr: true
      }
    },
    id: true,
    slug: true,
    nameStr: true,
    lon: true,
    lat: true,
    utcOffsetMin: true,
    createdUtc: true,
    modifiedUtc: true
  }
};

export const AirlineCompanyInfoQuery = {
  select: {
    createdUtc: true,
    modifiedUtc: true,
    numReviews: true,
    reviewScore: true,
    isDeleted: true,
    city: CityInfoQuery,
    id: true,
    logoImage: {
      select: {
        slug: true,
        file: {
          select: {
            modifiedUtc: true
          }
        }
      }
    },
    nameStr: true
  }
};

export const AirportInfoQuery = {
  select: {
    city: CityInfoQuery,
    lon: true,
    lat: true,
    id: true,
    nameStr: true,
    createdUtc: true,
    modifiedUtc: true,
    isDeleted: true
  }
};

export const FlightInfoQuery = {
  select: {
    id: true,
    airlineCompany: AirlineCompanyInfoQuery,
    airplane: AirplaneInfoQuery,
    arrivalAirport: AirportInfoQuery,
    departmentAirport: AirportInfoQuery,
    arrivalUtc: true,
    departmentUtc: true,
    isDeleted: true,
    createdUtc: true,
    modifiedUtc: true,
    dataHash: true
  }
};

export const StayReviewsQuery = {
  include: {
    textStr: true,
    user: {
      select: {
        id: true,
        avatar: ImageInfoQuery,
        firstName: true,
        lastName: true
      }
    }
  }
};

export const StayInfoQuery = {
  select: {
    id: true,
    slug: true,
    createdUtc: true,
    modifiedUtc: true,
    isDeleted: true,
    lat: true,
    lon: true,
    nameStr: true,
    city: CityInfoQuery,
    reviews: {
      include: StayReviewsQuery.include,
      where: {
        isDeleted: false
      }
    },
    images: {
      select: {
        serviceLevel: true,
        order: true,
        image: ImageInfoQuery
      },
      where: {
        isDeleted: false
      }
    },
    description: {
      include: {
        textStr: true
      },
      where: {
        isDeleted: false
      }
    }
  }
};

export const FlightOfferInfoQuery = (userId: EntityId | 'guest') => {
  return {
    select: {
      id: true,
      isDeleted: true,
      modifiedUtc: true,
      createdUtc: true,
      departFlight: FlightInfoQuery,
      returnFlight: FlightInfoQuery,
      class: true,
      numPassengers: true,
      totalPrice: true,
      dataHash: true,
      offerUsers: userId === 'guest'
        ? false
        : {
            where: {
              isDeleted: false,
              userId
            }
          }
    }
  };
};

export const StayOfferInfoQuery = (userId: EntityId | 'guest') => {
  return {
    select: {
      id: true,
      isDeleted: true,
      modifiedUtc: true,
      createdUtc: true,
      checkIn: true,
      checkOut: true,
      hotel: StayInfoQuery,
      numGuests: true,
      numRooms: true,
      dataHash: true,
      totalPrice: true,
      offerUsers: userId === 'guest'
        ? false
        : {
            where: {
              isDeleted: false,
              userId
            }
          }
    }
  };
};

export const BookingInfoQuery = {
  select: {
    flightOffer: {
      where: {
        isDeleted: false
      },
      select: {
        offer: {
          select: FlightOfferInfoQuery('guest').select
        }
      }
    },
    stayOffer: {
      where: {
        isDeleted: false
      },
      select: {
        offer: {
          select: StayOfferInfoQuery('guest').select
        }
      }
    },
    id: true,
    serviceLevel: true,
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: {
          select: ImageInfoQuery.select
        }
      }
    },
    createdUtc: true,
    modifiedUtc: true,
    isDeleted: true
  }
};

export const QFileInfo = Prisma.validator<Prisma.FileDefaultArgs>()(FileInfoQuery);
type TFileInfo = Prisma.FileGetPayload<typeof QFileInfo>;
export const QImageInfo = Prisma.validator<Prisma.UserDefaultArgs>()(ImageInfoQuery);
type TImageInfo = Prisma.ImageGetPayload<typeof QImageInfo>;
export const QUserEmailInfo = Prisma.validator<Prisma.UserEmailDefaultArgs>()(UserEmailInfoQuery);
type TUserEmailInfo = Prisma.UserEmailGetPayload<typeof QUserEmailInfo>;
export const QUserMinimal = Prisma.validator<Prisma.UserDefaultArgs>()(UserMinimalQuery);
type TUserMinimal = Prisma.UserGetPayload<typeof QUserMinimal>;
export const QUserProfile = Prisma.validator<Prisma.UserDefaultArgs>()(UserProfileQuery);
type TUserProfile = Prisma.UserGetPayload<typeof QUserProfile>;
export const QAirlineCompanyInfo = Prisma.validator<Prisma.AirlineCompanyDefaultArgs>()(AirlineCompanyInfoQuery);
type TAirlineCompanyInfo = Prisma.AirlineCompanyGetPayload<typeof QAirlineCompanyInfo>;
export const QCityInfo = Prisma.validator<Prisma.CityDefaultArgs>()(CityInfoQuery);
type TCityInfo = Prisma.CityGetPayload<typeof QCityInfo>;
export const QAirplaneInfo = Prisma.validator<Prisma.AirplaneDefaultArgs>()(AirplaneInfoQuery);
type TAirplaneInfo = Prisma.AirplaneGetPayload<typeof QAirplaneInfo>;
export const QAirportInfo = Prisma.validator<Prisma.AirportDefaultArgs>()(AirportInfoQuery);
type TAirportInfo = Prisma.AirportGetPayload<typeof QAirportInfo>;
export const QFlightInfo = Prisma.validator<Prisma.FlightDefaultArgs>()(FlightInfoQuery);
type TFlightInfo = Prisma.FlightGetPayload<typeof QFlightInfo>;
export const QFlightOfferInfo = Prisma.validator<Prisma.FlightOfferDefaultArgs>()(FlightOfferInfoQuery('guest'));
type TFlightOfferInfo = Prisma.FlightOfferGetPayload<typeof QFlightOfferInfo>;
export const QStayReviewInfo = Prisma.validator<Prisma.HotelReviewDefaultArgs>()(StayReviewsQuery);
type TStayReviewInfo = Prisma.HotelReviewGetPayload<typeof QStayReviewInfo>;
export const QStayInfo = Prisma.validator<Prisma.HotelDefaultArgs>()(StayInfoQuery);
type TStayInfo = Prisma.HotelGetPayload<typeof QStayInfo>;
export const QStayOfferInfo = Prisma.validator<Prisma.StayOfferDefaultArgs>()(StayOfferInfoQuery('guest'));
type TStayOfferInfo = Prisma.StayOfferGetPayload<typeof QStayOfferInfo>;
export const QBookingInfo = Prisma.validator<Prisma.BookingDefaultArgs>()(BookingInfoQuery);
type TBookingInfo = Prisma.BookingGetPayload<typeof QBookingInfo>;


export const MapUserEmail = function (userEmail: TUserEmailInfo): IUserEmailInfo {
  return {
    id: userEmail.id,
    createdUtc: userEmail.createdUtc,
    email: userEmail.email,
    isDeleted: userEmail.isDeleted,
    isVerified: userEmail.isVerified,
    modifiedUtc: userEmail.modifiedUtc,
    order: userEmail.order,
    verificationToken: userEmail.verificationToken
      ? {
          attemptsMade: userEmail.verificationToken?.attemptsMade,
          createdUtc: userEmail.verificationToken.createdUtc,
          id: userEmail.verificationToken.id,
          isDeleted: userEmail.verificationToken.isDeleted
        }
      : undefined
  };
};

export const MapUserEntityMinimal = function<T extends TUserMinimal> (user: T): IUserMinimalInfo {
  return {
    id: user.id,
    authProvider: parseEnumOrThrow(AuthProvider, user.authProvider),
    providerIdentity: user.providerIdentity,
    isDeleted: false,
    passwordHash: user.passwordHash ?? undefined,
    passwordSalt: user.passwordSalt ?? undefined,
    createdUtc: user.createdUtc,
    modifiedUtc: user.modifiedUtc,
    emails: orderBy(user.emails.map(MapUserEmail), ['order'], ['asc']),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? ''
  };
};

export const MapUserEntityProfile = function<T extends TUserProfile> (user: T): IUserProfileInfo {
  const userMinimal = MapUserEntityMinimal(user);
  return {
    avatar: (user.avatar && !user.avatar.file.isDeleted) ? MapImageInfo(user.avatar) : undefined,
    cover: (user.cover && !user.cover.file.isDeleted) ? MapImageInfo(user.cover) : undefined,
    ...userMinimal
  };
};

export const MapFileInfo = function (fileInfo: TFileInfo): IFileInfo {
  return {
    id: fileInfo.id,
    createdUtc: fileInfo.createdUtc,
    modifiedUtc: fileInfo.modifiedUtc,
    isDeleted: false,
    mime: fileInfo.mime ?? undefined,
    originalName: fileInfo.originalName ?? undefined
  };
};

export const mapCssJson = (cssJson: string): CSSProperties => {
  return destr<any>(cssJson) as CSSProperties;
};

export const MapImageInfo = function (imageInfo: TImageInfo): IImageInfo {
  return {
    id: imageInfo.id,
    category: parseEnumOrThrow(ImageCategory, imageInfo.category.kind),
    file: MapFileInfo(imageInfo.file),
    slug: imageInfo.slug,
    stubCssStyle: imageInfo.stubCssStyle ? mapCssJson(imageInfo.stubCssStyle.toString()) : undefined,
    invertForDarkTheme: imageInfo.invertForDarkTheme
  };
};

export const MapAirlineCompany = function (airlineCompany: TAirlineCompanyInfo): IAirlineCompany {
  const result: IAirlineCompany = {
    createdUtc: airlineCompany.createdUtc,
    id: airlineCompany.id,
    isDeleted: airlineCompany.isDeleted,
    logoImage: {
      slug: airlineCompany.logoImage!.slug,
      timestamp: airlineCompany.logoImage!.file.modifiedUtc.getTime()
    },
    city: {
      geo: {
        lon: airlineCompany.city.lon.toNumber(),
        lat: airlineCompany.city.lat.toNumber()
      }
    },
    modifiedUtc: airlineCompany.modifiedUtc,
    name: airlineCompany.nameStr,
    numReviews: airlineCompany.numReviews,
    reviewScore: airlineCompany.reviewScore.toNumber()
  };
  return result;
};

export const MapAirplane = function (airplane: TAirplaneInfo): IAirplane {
  const result: IAirplane = {
    createdUtc: airplane.createdUtc,
    modifiedUtc: airplane.modifiedUtc,
    id: airplane.id,
    name: airplane.nameStr,
    isDeleted: airplane.isDeleted,
    images: airplane.images.filter(i => !i.isDeleted).map((i) => {
      return {
        kind: <AirplaneImageKind>i.kind,
        order: i.order,
        modifiedUtc: i.modifiedUtc,
        createdUtc: i.createdUtc,
        id: i.id,
        isDeleted: i.isDeleted,
        image: {
          slug: i.image.slug,
          timestamp: i.image.file.modifiedUtc.getDate()
        }
      };
    })
  };
  return result;
};

export const MapAirport = function (airport: TAirportInfo): IAirport {
  const result: IAirport = {
    createdUtc: airport.createdUtc,
    modifiedUtc: airport.modifiedUtc,
    isDeleted: airport.isDeleted,
    id: airport.id,
    name: airport.nameStr,
    city: MapCity(airport.city),
    geo: {
      lat: airport.lat.toNumber(),
      lon: airport.lon.toNumber()
    }
  };
  return result;
};

export const MapCity = function (city: TCityInfo): ICity {
  const result: ICity = {
    id: city.id,
    slug: city.slug,
    country: {
      id: city.country.id,
      name: city.country.nameStr
    },
    name: city.nameStr,
    geo: {
      lon: city.lon.toNumber(),
      lat: city.lat.toNumber()
    },
    createdUtc: city.createdUtc,
    modifiedUtc: city.modifiedUtc,
    utcOffsetMin: city.utcOffsetMin,
    isDeleted: false
  };
  return result;
};

export const MapFlight = function (flight: TFlightInfo): IFlight {
  return {
    id: flight.id,
    createdUtc: flight.createdUtc,
    modifiedUtc: flight.modifiedUtc,
    isDeleted: flight.isDeleted,
    airlineCompany: MapAirlineCompany(flight.airlineCompany),
    airplane: MapAirplane(flight.airplane),
    arriveAirport: MapAirport(flight.arrivalAirport),
    departAirport: MapAirport(flight.departmentAirport),
    arriveTimeUtc: flight.arrivalUtc,
    departTimeUtc: flight.departmentUtc,
    dataHash: flight.dataHash
  };
};

export const MapFlightOffer = function (flightOffer: TFlightOfferInfo): IFlightOffer {
  return {
    id: flightOffer.id,
    createdUtc: flightOffer.createdUtc,
    modifiedUtc: flightOffer.modifiedUtc,
    isDeleted: flightOffer.isDeleted,
    class: flightOffer.class as FlightClass,
    departFlight: MapFlight(flightOffer.departFlight),
    arriveFlight: flightOffer.returnFlight ? MapFlight(flightOffer.returnFlight) : undefined,
    numPassengers: flightOffer.numPassengers,
    kind: 'flights',
    totalPrice: new Decimal(flightOffer.totalPrice),
    dataHash: flightOffer.dataHash,
    isFavourite: flightOffer.offerUsers?.some(u => u.isFavourite) ?? false
  };
};

export const MapStayShort = function (stay: TStayInfo): IStayShort {
  const photoImg = stay.images.find(x => x.order === 0 && !x.serviceLevel)!;
  return {
    id: stay.id,
    slug: stay.slug,
    createdUtc: stay.createdUtc,
    modifiedUtc: stay.modifiedUtc,
    isDeleted: stay.isDeleted,
    city: MapCity(stay.city),
    name: stay.nameStr,
    geo: {
      lon: stay.lon.toNumber(),
      lat: stay.lat.toNumber()
    },
    numReviews: stay.reviews.length,
    reviewScore: stay.reviews.length > 0 ? stay.reviews.map(r => r.score).reduce((sum, v) => sum + v, 0) / stay.reviews.length : DefaultStayReviewScore,
    photo: {
      slug: photoImg.image.slug,
      timestamp: photoImg.image.file.modifiedUtc.getTime()
    }
  };
};

export const MapStayReview = function (review: TStayReviewInfo): EntityDataAttrsOnly<IStayReview> {
  return {
    id: review.id,
    score: review.score,
    text: review.textStr,
    user: {
      id: review.user.id,
      firstName: review.user.firstName ?? '',
      lastName: review.user.lastName ?? '',
      avatar: review.user.avatar
        ? {
            slug: review.user.avatar.slug,
            timestamp: review.user.avatar.file.modifiedUtc.getTime()
          }
        : undefined
    }
  };
};

export const MapStayDetails = function (stay: TStayInfo): IStay {
  return {
    id: stay.id,
    slug: stay.slug,
    createdUtc: stay.createdUtc,
    modifiedUtc: stay.modifiedUtc,
    isDeleted: stay.isDeleted,
    city: MapCity(stay.city),
    name: stay.nameStr,
    geo: {
      lon: stay.lon.toNumber(),
      lat: stay.lat.toNumber()
    },
    reviews: stay.reviews.map(MapStayReview),
    images: orderBy(stay.images, ['order'], ['asc']).map((i) => {
      return <IStayImageShort>{
        slug: i.image.slug,
        timestamp: i.image.file.modifiedUtc.getTime(),
        order: i.order,
        serviceLevel: (i.serviceLevel as StayServiceLevel) ?? undefined
      };
    }),
    description: orderBy(stay.description.map((d) => { return { ...d, ord: d.modifiedUtc.getTime() }; }), ['ord'], ['asc']).map((d, idx) => {
      return {
        id: d.id,
        createdUtc: d.createdUtc,
        modifiedUtc: d.modifiedUtc,
        isDeleted: d.isDeleted,
        order: idx,
        paragraphKind: d.paragraphKind as StayDescriptionParagraphType,
        textStr: d.textStr
      };
    })
  };
};

export const MapStay = function (stay: TStayInfo): IStay {
  return {
    ...((omit(MapStayShort(stay), ['numReviews', 'reviewScore']) as any) as IStayShort),
    description: stay.description.map(d => <IStayDescription>{
      id: d.id,
      createdUtc: d.createdUtc,
      isDeleted: d.isDeleted,
      modifiedUtc: d.modifiedUtc,
      order: d.order,
      paragraphKind: d.paragraphKind,
      textStr: d.textStr
    }),
    images: stay.images.map(i => <IStayImageShort>{
      slug: i.image.slug,
      timestamp: i.image.file.modifiedUtc.getTime(),
      order: i.order,
      serviceLevel: i.serviceLevel ?? undefined,
      image: MapImageInfo(i.image)
    }),
    reviews: stay.reviews.map(r => <IStayReview>{
      id: r.id,
      createdUtc: r.createdUtc,
      modifiedUtc: r.modifiedUtc,
      isDeleted: r.isDeleted,
      score: r.score,
      text: r.textStr,
      user: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        avatar: r.user.avatar ? MapImageInfo(r.user.avatar) : undefined
      }
    })
  };
};

export const MapStayOfferCommon = function (stayOffer: TStayOfferInfo): Omit<IStayOffer, 'stay'> {
  return {
    id: stayOffer.id,
    createdUtc: stayOffer.createdUtc,
    modifiedUtc: stayOffer.modifiedUtc,
    isDeleted: stayOffer.isDeleted,
    checkIn: stayOffer.checkIn,
    checkOut: stayOffer.checkOut,
    numGuests: stayOffer.numGuests,
    numRooms: stayOffer.numRooms,
    kind: 'stays',
    dataHash: stayOffer.dataHash,
    isFavourite: stayOffer.offerUsers?.some(u => u.isFavourite) ?? false,
    totalPrice: new Decimal(stayOffer.totalPrice)
  };
};

export const MapStayOffer = function (stayOffer: TStayOfferInfo): IStayOffer {
  return {
    ...(MapStayOfferCommon(stayOffer)),
    stay: MapStayShort(stayOffer.hotel)
  };
};

export const MapStayOfferDetails = function (stayOffer: TStayOfferInfo): Omit<IStayOfferDetails, 'prices'> {
  const stayDetails = MapStayDetails(stayOffer.hotel);
  return {
    ...(MapStayOfferCommon(stayOffer)),
    stay: {
      ...omit(stayDetails, ['reviews']),
      reviewScore: stayDetails.reviews.length > 0 ? stayDetails.reviews.map(r => r.score).reduce((sum, v) => sum + v, 0) / stayDetails.reviews.length : DefaultStayReviewScore,
      numReviews: stayDetails.reviews.length,
      photo: stayDetails.images.filter(i => i.order === 0).map((i) => {
        return {
          slug: i.slug,
          timestamp: i.timestamp
        };
      })[0]
    }
  };
};

export const MapBooking = function (booking: TBookingInfo): IOfferBooking<IFlightOffer | IStayOfferDetails> {
  return {
    id: booking.id,
    createdUtc: booking.createdUtc,
    isDeleted: booking.isDeleted,
    modifiedUtc: booking.modifiedUtc,
    bookedUser: {
      id: booking.user.id,
      firstName: booking.user.firstName ?? undefined,
      lastName: booking.user.lastName ?? undefined,
      avatar: booking.user.avatar ? { slug: booking.user.avatar.slug, timestamp: booking.user.avatar.file.modifiedUtc.getTime() } : undefined
    },
    offer: booking.flightOffer?.offer ? MapFlightOffer(booking.flightOffer!.offer) : MapStayOfferDetails(booking.stayOffer!.offer),
    serviceLevel: booking.stayOffer?.offer ? (booking.serviceLevel as StayServiceLevel) : undefined
  };
};

import { type CSSProperties } from 'vue';
import { Prisma } from '@prisma/client';
import { destr } from 'destr';
import orderBy from 'lodash-es/orderBy';
import omit from 'lodash-es/omit';
import { Decimal } from 'decimal.js';
import { type AirplaneImageKind, type IStayDescription, type IStay, type IStayOffer, type IFlightOffer, type IAirport, type IAirplane, type IUserMinimalInfo, type IUserProfileInfo, type IUserEmailInfo, type IImageInfo, type IFileInfo, AuthProvider, ImageCategory, type IAirlineCompany, type ICity, type IFlight, type FlightClass, type EntityId, type IStayShort, type IStayImage, type IStayReview } from '../shared/interfaces';
import { parseEnumOrThrow } from './../shared/common';
import { DefaultStayReviewScore } from '~/shared/constants';

export class Queries {
  public static readonly FileInfoQuery = {
    select: {
      id: true,
      mime: true,
      originalName: true,
      createdUtc: true,
      modifiedUtc: true,
      isDeleted: true
    }
  };

  public static readonly ImageInfoQuery = {
    select: {
      id: true,
      slug: true,
      stubCssStyle: true,
      invertForDarkTheme: true,
      category: { select: { kind: true } },
      file: Queries.FileInfoQuery
    }
  };

  public static readonly EmailVerificationTokenInfoQuery = {
    select: {
      id: true,
      attemptsMade: true,
      createdUtc: true,
      isDeleted: true
    }
  };

  public static readonly UserEmailInfoQuery = {
    include: {
      verificationToken: Queries.EmailVerificationTokenInfoQuery
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

  public static readonly UserMinimalQuery = {
    select: {
      id: true,
      passwordHash: true,
      createdUtc: true,
      modifiedUtc: true,
      emails: Queries.UserEmailInfoQuery,
      authProvider: true,
      providerIdentity: true,
      passwordSalt: true,
      firstName: true,
      lastName: true
    }
  };

  public static UserProfileQuery = {
    select: {
      ...this.UserMinimalQuery.select,
      cover: Queries.ImageInfoQuery,
      avatar: Queries.ImageInfoQuery
    }
  };

  public static AirplaneInfoQuery = {
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

  public static CityInfoQuery = {
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

  public static AirlineCompanyInfoQuery = {
    select: {
      createdUtc: true,
      modifiedUtc: true,
      numReviews: true,
      reviewScore: true,
      isDeleted: true,
      city: this.CityInfoQuery,
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

  public static AirportInfoQuery = {
    select: {
      city: Queries.CityInfoQuery,
      lon: true,
      lat: true,
      id: true,
      nameStr: true,
      createdUtc: true,
      modifiedUtc: true,
      isDeleted: true
    }
  };

  public static FlightInfoQuery = {
    select: {
      id: true,
      airlineCompany: Queries.AirlineCompanyInfoQuery,
      airplane: Queries.AirplaneInfoQuery,
      arrivalAirport: Queries.AirportInfoQuery,
      departmentAirport: Queries.AirportInfoQuery,
      arrivalUtc: true,
      departmentUtc: true,
      isDeleted: true,
      createdUtc: true,
      modifiedUtc: true,
      dataHash: true
    }
  };

  public static StayInfoQuery = {
    select: {
      id: true,
      slug: true,
      createdUtc: true,
      modifiedUtc: true,
      isDeleted: true,
      lat: true,
      lon: true,
      nameStr: true,
      rating: true,
      city: Queries.CityInfoQuery,
      reviews: {
        include: {
          textStr: true,
          user: {
            select: {
              id: true,
              avatar: Queries.ImageInfoQuery,
              firstName: true,
              lastName: true
            }
          }
        },
        where: {
          isDeleted: false
        }
      },
      images: {
        include: {
          image: Queries.ImageInfoQuery
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

  public static FlightOfferInfoQuery = (userId: EntityId | 'guest') => {
    return {
      select: {
        id: true,
        isDeleted: true,
        modifiedUtc: true,
        createdUtc: true,
        departFlight: Queries.FlightInfoQuery,
        returnFlight: Queries.FlightInfoQuery,
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

  public static StayOfferInfoQuery = (userId: EntityId | 'guest') => {
    return {
      select: {
        id: true,
        isDeleted: true,
        modifiedUtc: true,
        createdUtc: true,
        checkIn: true,
        checkOut: true,
        hotel: Queries.StayInfoQuery,
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
}

const QFileInfo = Prisma.validator<Prisma.FileDefaultArgs>()(Queries.FileInfoQuery);
type TFileInfo = Prisma.FileGetPayload<typeof QFileInfo>;
const QImageInfo = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.ImageInfoQuery);
type TImageInfo = Prisma.ImageGetPayload<typeof QImageInfo>;
const QUserEmailInfo = Prisma.validator<Prisma.UserEmailDefaultArgs>()(Queries.UserEmailInfoQuery);
type TUserEmailInfo = Prisma.UserEmailGetPayload<typeof QUserEmailInfo>;
const QUserMinimal = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.UserMinimalQuery);
type TUserMinimal = Prisma.UserGetPayload<typeof QUserMinimal>;
const QUserProfile = Prisma.validator<Prisma.UserDefaultArgs>()(Queries.UserProfileQuery);
type TUserProfile = Prisma.UserGetPayload<typeof QUserProfile>;
const QAirlineCompanyInfo = Prisma.validator<Prisma.AirlineCompanyDefaultArgs>()(Queries.AirlineCompanyInfoQuery);
type TAirlineCompanyInfo = Prisma.AirlineCompanyGetPayload<typeof QAirlineCompanyInfo>;
const QCityInfo = Prisma.validator<Prisma.CityDefaultArgs>()(Queries.CityInfoQuery);
type TCityInfo = Prisma.CityGetPayload<typeof QCityInfo>;
const QAirplaneInfo = Prisma.validator<Prisma.AirplaneDefaultArgs>()(Queries.AirplaneInfoQuery);
type TAirplaneInfo = Prisma.AirplaneGetPayload<typeof QAirplaneInfo>;
const QAirportInfo = Prisma.validator<Prisma.AirportDefaultArgs>()(Queries.AirportInfoQuery);
type TAirportInfo = Prisma.AirportGetPayload<typeof QAirportInfo>;
const QFlightInfo = Prisma.validator<Prisma.FlightDefaultArgs>()(Queries.FlightInfoQuery);
type TFlightInfo = Prisma.FlightGetPayload<typeof QFlightInfo>;
const QFlightOfferInfo = Prisma.validator<Prisma.FlightOfferDefaultArgs>()(Queries.FlightOfferInfoQuery('guest'));
type TFlightOfferInfo = Prisma.FlightOfferGetPayload<typeof QFlightOfferInfo>;
const QStayInfo = Prisma.validator<Prisma.HotelDefaultArgs>()(Queries.StayInfoQuery);
type TStayInfo = Prisma.HotelGetPayload<typeof QStayInfo>;
const QStayOfferInfo = Prisma.validator<Prisma.StayOfferDefaultArgs>()(Queries.StayOfferInfoQuery('guest'));
type TStayOfferInfo = Prisma.StayOfferGetPayload<typeof QStayOfferInfo>;

export class Mappers {
  static MapUserEmail = function (userEmail: TUserEmailInfo): IUserEmailInfo {
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

  static MapUserEntityMinimal = function<T extends TUserMinimal> (user: T): IUserMinimalInfo {
    return {
      id: user.id,
      authProvider: parseEnumOrThrow(AuthProvider, user.authProvider),
      providerIdentity: user.providerIdentity,
      isDeleted: false,
      passwordHash: user.passwordHash ?? undefined,
      passwordSalt: user.passwordSalt ?? undefined,
      createdUtc: user.createdUtc,
      modifiedUtc: user.modifiedUtc,
      emails: orderBy(user.emails.map(Mappers.MapUserEmail), ['order'], ['asc']),
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined
    };
  };

  static MapUserEntityProfile = function<T extends TUserProfile> (user: T): IUserProfileInfo {
    const userMinimal = Mappers.MapUserEntityMinimal(user);
    return {
      avatar: (user.avatar && !user.avatar.file.isDeleted) ? Mappers.MapImageInfo(user.avatar) : undefined,
      cover: (user.cover && !user.cover.file.isDeleted) ? Mappers.MapImageInfo(user.cover) : undefined,
      ...userMinimal
    };
  };

  static MapFileInfo = function (fileInfo: TFileInfo): IFileInfo {
    return {
      id: fileInfo.id,
      createdUtc: fileInfo.createdUtc,
      modifiedUtc: fileInfo.modifiedUtc,
      isDeleted: false,
      mime: fileInfo.mime ?? undefined,
      originalName: fileInfo.originalName ?? undefined
    };
  };

  static mapCssJson = (cssJson: string): CSSProperties => {
    return destr<any>(cssJson) as CSSProperties;
  };

  static MapImageInfo = function (imageInfo: TImageInfo): IImageInfo {
    return {
      id: imageInfo.id,
      category: parseEnumOrThrow(ImageCategory, imageInfo.category.kind),
      file: Mappers.MapFileInfo(imageInfo.file),
      slug: imageInfo.slug,
      stubCssStyle: imageInfo.stubCssStyle ? Mappers.mapCssJson(imageInfo.stubCssStyle.toString()) : undefined,
      invertForDarkTheme: imageInfo.invertForDarkTheme
    };
  };

  static MapAirlineCompany = function (airlineCompany: TAirlineCompanyInfo): IAirlineCompany {
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

  static MapAirplane = function (airplane: TAirplaneInfo): IAirplane {
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

  static MapAirport = function (airport: TAirportInfo): IAirport {
    const result: IAirport = {
      createdUtc: airport.createdUtc,
      modifiedUtc: airport.modifiedUtc,
      isDeleted: airport.isDeleted,
      id: airport.id,
      name: airport.nameStr,
      city: Mappers.MapCity(airport.city),
      geo: {
        lat: airport.lat.toNumber(),
        lon: airport.lon.toNumber()
      }
    };
    return result;
  };

  static MapCity = function (city: TCityInfo): ICity {
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

  static MapFlight = function (flight: TFlightInfo): IFlight {
    return {
      id: flight.id,
      createdUtc: flight.createdUtc,
      modifiedUtc: flight.modifiedUtc,
      isDeleted: flight.isDeleted,
      airlineCompany: Mappers.MapAirlineCompany(flight.airlineCompany),
      airplane: Mappers.MapAirplane(flight.airplane),
      arriveAirport: Mappers.MapAirport(flight.arrivalAirport),
      departAirport: Mappers.MapAirport(flight.departmentAirport),
      arriveTimeUtc: flight.arrivalUtc,
      departTimeUtc: flight.departmentUtc,
      dataHash: flight.dataHash
    };
  };

  static MapFlightOffer = function (flightOffer: TFlightOfferInfo): IFlightOffer {
    return {
      id: flightOffer.id,
      createdUtc: flightOffer.createdUtc,
      modifiedUtc: flightOffer.modifiedUtc,
      isDeleted: flightOffer.isDeleted,
      class: flightOffer.class as FlightClass,
      departFlight: Mappers.MapFlight(flightOffer.departFlight),
      arriveFlight: flightOffer.returnFlight ? Mappers.MapFlight(flightOffer.returnFlight) : undefined,
      numPassengers: flightOffer.numPassengers,
      kind: 'flights',
      totalPrice: new Decimal(flightOffer.totalPrice),
      dataHash: flightOffer.dataHash,
      isFavourite: flightOffer.offerUsers?.some(u => u.isFavourite) ?? false
    };
  };

  static MapStayShort = function (stay: TStayInfo): IStayShort {
    const photoImg = stay.images.find(x => x.order === 0 && !x.serviceLevel)!;
    return {
      id: stay.id,
      slug: stay.slug,
      createdUtc: stay.createdUtc,
      modifiedUtc: stay.modifiedUtc,
      isDeleted: stay.isDeleted,
      city: Mappers.MapCity(stay.city),
      name: stay.nameStr,
      geo: {
        lon: stay.lon.toNumber(),
        lat: stay.lat.toNumber()
      },
      numReviews: stay.reviews.length,
      reviewScore: stay.reviews.length > 0 ? stay.reviews.map(r => r.score).reduce((sum, v) => sum + v, 0) / stay.reviews.length : DefaultStayReviewScore,
      rating: stay.rating,
      photo: {
        slug: photoImg.image.slug,
        timestamp: photoImg.modifiedUtc.getTime()
      }
    };
  };

  static MapStay = function (stay: TStayInfo): IStay {
    return {
      ...((omit(Mappers.MapStayShort(stay), ['numReviews', 'reviewScore']) as any) as IStayShort),
      description: stay.description.map(d => <IStayDescription>{
        id: d.id,
        createdUtc: d.createdUtc,
        isDeleted: d.isDeleted,
        modifiedUtc: d.modifiedUtc,
        order: d.order,
        paragraphKind: d.paragraphKind,
        textStr: d.textStr
      }),
      images: stay.images.map(i => <IStayImage>{
        id: i.id,
        createdUtc: i.createdUtc,
        isDeleted: i.isDeleted,
        modifiedUtc: i.modifiedUtc,
        order: i.order,
        serviceLevel: i.serviceLevel ?? undefined,
        image: Mappers.MapImageInfo(i.image)
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
          avatar: r.user.avatar ? Mappers.MapImageInfo(r.user.avatar) : undefined
        }
      })
    };
  };

  static MapStayOffer = function (stayOffer: TStayOfferInfo): IStayOffer {
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
      totalPrice: new Decimal(stayOffer.totalPrice),
      stay: Mappers.MapStayShort(stayOffer.hotel)
    };
  };
}

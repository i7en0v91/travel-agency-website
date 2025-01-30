import type { StayOffersSortFactorEnum, FlightOffersSortFactorEnum, StayDescriptionParagraphEnum, StayServiceLevelEnum, AirplaneImageEnum, ImageCategory, FlightClassEnum, CacheEntityTypeEnum } from './index';
import type { PageCacheVaryOptionsEnum, UninitializedPageTimestampValue, ThemeEnum, LocaleEnum, LogLevelEnum, AuthProvider } from './constants';
import type { Decimal } from 'decimal.js';
import type { IAppLogger } from './logging/common';
export { type IAppConfig } from './appconfig';
export { type I18nResName } from './i18n';

export type LogLevel = keyof typeof LogLevelEnum;
export type Theme = Lowercase<keyof typeof ThemeEnum>;
export type Locale = Lowercase<keyof typeof LocaleEnum>;

export type Timestamp = number;
export type PreviewMode = boolean;

export type UninitializedPageTimestamp = typeof UninitializedPageTimestampValue;
export declare type PageCacheVaryOptions = keyof typeof PageCacheVaryOptionsEnum;

export interface IPagination {
  skip: number,
  take: number
}

export interface ISorting<TFactor> {
  direction: 'asc' | 'desc',
  factor?: TFactor
}

export type SessionValue = string | number | null;
export type SessionValues = Record<string, SessionValue>;
export type SessionId = string;

export type UserSession = { sessionId: SessionId, values: SessionValues };

export type EntityDataAttrsOnly<TEntity extends IEditableEntity & ISoftDeleteEntity> = Omit<TEntity, keyof IEditableEntity | keyof ISoftDeleteEntity | 'dataHash'> & { id: EntityId };

export type EntityId = string;
export interface IEntity {
  id: EntityId,
  previewMode?: PreviewMode
}
export interface IEditableEntity extends IEntity {
  createdUtc: Date,
  modifiedUtc: Date
}
export interface ISoftDeleteEntity extends IEntity {
  isDeleted: boolean
}

export interface IImageEntitySrc {
  slug: string,
  timestamp?: Timestamp
}

export interface ILocalizableValue {
  en: string,
  fr: string,
  ru: string
}

export type CacheEntityType = keyof typeof CacheEntityTypeEnum;
export interface IEntityCacheItem {
  id: EntityId,
  type: CacheEntityType,
  expireAt?: Date
}
export interface IEntityCacheSlugItem extends IEntityCacheItem {
  slug: string,
}
export interface IEntityCacheCityItem extends IEntityCacheSlugItem {
  displayName: ILocalizableValue
}
export type GetEntityCacheItem<TEntity extends CacheEntityType> = TEntity extends 'City' ? (IEntityCacheCityItem & { type: TEntity }) : never;

export interface IImageProcessor {
  getImageSize (imgData: Buffer): Promise<{width: number, height: number}>;
  scaleImage (bytes: Buffer, scale: number, expectedWidth?: number): Promise<Buffer>;
  extractImageRegion (bytes: Buffer, width: number, height: number, mimeType: 'webp' | 'jpeg'): Promise<Buffer>;
  createBlankImage(width: number, height: number, format: 'png'): Promise<Buffer>;
  convert (bytes: Buffer, targetFormat: 'jpeg'): Promise<Buffer>;
}

/* Business logic types */
export type GeoPoint = { lon: number, lat: number };
export type Price = Decimal;
export type DistanceUnitKm = number;

export type OfferKind = 'flights' | 'stays';
export type TripType = 'oneway' | 'return';
export type FlightClass = Lowercase<keyof typeof FlightClassEnum>;
export type FlightOffersSortFactor = Lowercase<keyof typeof FlightOffersSortFactorEnum>;
export type AirplaneImageKind = (Lowercase<keyof typeof AirplaneImageEnum>) | FlightClass;
export type StayServiceLevel = keyof typeof StayServiceLevelEnum;
export type StayDescriptionParagraphType = keyof typeof StayDescriptionParagraphEnum;
export type StayOffersSortFactor = Lowercase<keyof typeof StayOffersSortFactorEnum>;

export type PaymentMethodType = 'full' | 'part';

/**
 Denotes list of CSS styling directives. 
 Was introduced for serialization/deserialization of gradient background CSS directives 
 for large images to display it as stubs while actual image is loading.
 @example const cssStyling: CssPropertyList = fromPairs([
    ['backgroundImage', 'linear-gradient(0deg, hsl(213, 8%, 77%, 0.0) 0%, hsl(213, 8%, 77%, 0.0) 70%, hsla(213, 8%, 77%, 0.8) 100%), radial-gradient(circle at 52% 49%, hsla(148, 13%, 26%, 0.2) 0%, hsl(154, 11%, 25%) 152%), linear-gradient(0deg, hsla(148, 13%, 26%, 0.34) 32%, hsl(213, 8%, 77%) 52%), radial-gradient(ellipse at 54% 192%, hsla(30, 66%, 56%, 0.79) 43%, hsla(213, 8%, 77%, 0.18) 106%)'],
    ['backgroundSize', '100% 100%, 100% 50%, 100% 100%, 100% 100%'],
    ['backgroundRepeat', 'no-repeat, repeat-y, no-repeat, no-repeat'],
    ['backgroundPosition', '0 0, 0 0, 0 0, 0 0'])
 */
export type CssPropertyList = Record<string, string>;

export type ReviewSummary = {
  numReviews: number,
  score: number
};

export interface IUserEmailInfo extends IEditableEntity, ISoftDeleteEntity {
  email: string,
  order: number,
  isVerified: boolean,
  verificationToken?: {
    id: EntityId,
    attemptsMade: number,
    createdUtc: Date,
    isDeleted: boolean
  }
}

export interface IUserMinimalInfo extends IEditableEntity, ISoftDeleteEntity {
  authProvider: AuthProvider,
  providerIdentity: string,
  passwordHash?: string,
  passwordSalt?: string,
  firstName?: string,
  lastName?: string,
  emails: IUserEmailInfo[]
}

export interface IUserProfileInfo extends IUserMinimalInfo {
  cover?: IImageInfo,
  avatar?: IImageInfo
}

export interface IFileData {
  bytes: Buffer,
  originalName?: string
  mimeType: string
}

export type IFileInfo = Omit<IEditableEntity & ISoftDeleteEntity & {
  originalName?: string,
  mime: string
}, 'createdUtc'>;

export interface IImageCategoryInfo extends IEditableEntity {
  id: EntityId,
  width: number,
  height: number,
  kind: ImageCategory
}

export interface IImageInfo extends IEntity {
  slug: string,
  category: ImageCategory,
  file: IFileInfo,
  ownerId?: EntityId,
  stubCssStyle: CssPropertyList | undefined,
  invertForDarkTheme: boolean
}

export type IImageData = IFileData & {
  slug: string,
  category: ImageCategory,
  invertForDarkTheme: boolean | undefined,
  stubCssStyle: CssPropertyList | undefined,
  ownerId?: EntityId
};


export interface ICountry extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue
}

export interface ICity extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  slug: string,
  geo: GeoPoint,
  utcOffsetMin: number,
  country: Pick<ICountry, 'id' | 'name'>
}

export interface IAirlineCompany extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  logoImage: {
    slug: string,
    timestamp?: Timestamp
  },
  city: Pick<ICity, 'geo'>,
  reviewSummary: ReviewSummary
}

export interface IOffer extends IEditableEntity, ISoftDeleteEntity {
  kind: OfferKind,
  totalPrice: Price,
  dataHash: string,
  isFavourite: boolean
}

export interface IAirport extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  city: EntityDataAttrsOnly<ICity>
  geo: GeoPoint
}

export interface IAirplaneImage extends IEditableEntity, ISoftDeleteEntity {
  kind: AirplaneImageKind,
  order: number,
  image: {
    slug: string,
    timestamp: Timestamp
  }
}

export interface IAirplaneData {
  name: ILocalizableValue,
  images: {
    imageId: EntityId,
    kind: AirplaneImageKind,
    order: number
  }[]
}

export interface IAirplane extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  images: EntityDataAttrsOnly<IAirplaneImage>[]
}

export interface IFlight extends IEditableEntity, ISoftDeleteEntity {
  airlineCompany: EntityDataAttrsOnly<IAirlineCompany>,
  airplane: EntityDataAttrsOnly<IAirplane>,
  departAirport: EntityDataAttrsOnly<IAirport>,
  arriveAirport: EntityDataAttrsOnly<IAirport>,
  departTimeUtc: Date,
  arriveTimeUtc: Date,
  dataHash: string
}

export interface IFlightOffer extends IOffer {
  departFlight: EntityDataAttrsOnly<IFlight>,
  arriveFlight?: EntityDataAttrsOnly<IFlight>,
  numPassengers: number,
  class: FlightClass
}

export interface IFlightOffersFilterParams {
  fromCitySlug?: string,
  toCitySlug?: string,
  tripType?: TripType,
  numPassengers?: number,
  class?: FlightClass,
  dateFrom?: Date,
  dateTo?: Date
  price?: {
    from?: Price,
    to?: Price
  },
  departureTimeOfDay?: { // in minutes, i.e. from 0 to 1439
    from?: number,
    to?: number
  },
  airlineCompanyIds?: EntityId[],
  ratings?: number[],
  flexibleDates?: boolean
}

export interface ITopFlightOfferInfo {
  factor: FlightOffersSortFactor,
  price: Price,
  duration: number // flight duration in minutes
}

export interface ISearchFlightOffersResultFilterParams {
  priceRange?: {
    from: number,
    to: number
  },
  airlineCompanies?: {
    id: EntityId,
    name: ILocalizableValue
  }[],
}

export interface ISearchFlightOffersResult<TOffer extends IFlightOffer = IFlightOffer> {
  pagedItems: EntityDataAttrsOnly<TOffer>[],
  totalCount: number,
  paramsNarrowing?: ISearchFlightOffersResultFilterParams,
  topOffers?: ITopFlightOfferInfo[]
}

export interface IStayImage extends IEditableEntity, ISoftDeleteEntity {
  image: IImageInfo,
  serviceLevel?: StayServiceLevel,
  order: number
}
export type IStayImageData = Omit<IStayImage, keyof (IEditableEntity & ISoftDeleteEntity) | 'image'> & { imageId: EntityId };

export interface IStayDescription extends IEditableEntity, ISoftDeleteEntity {
  textStr: ILocalizableValue,
  paragraphKind: StayDescriptionParagraphType,
  order: number
}

export type IStayDescriptionData = Omit<IStayDescription, keyof (IEditableEntity & ISoftDeleteEntity)>;
export type IStayReviewData = Omit<IStayReview, keyof (IEditableEntity & ISoftDeleteEntity) | 'user'> & { userId: EntityId };

export type IStayData = Omit<IStay, keyof (IEditableEntity & ISoftDeleteEntity) | 'description' | 'reviews' | 'images' | 'city'> & {
  cityId: EntityId,
  descriptionData: IStayDescriptionData[],
  reviewsData: IStayReviewData[],
  imagesData: IStayImageData[]
};

export interface IStayReview extends IEditableEntity, ISoftDeleteEntity {
  user: {
    id: EntityId,
    avatar?: {
      slug: string,
      timestamp: Timestamp
    },
    firstName: string,
    lastName: string
  },
  text: ILocalizableValue,
  score: number
}

export interface IStayImageShort {
  slug: string,
  timestamp: Timestamp,
  serviceLevel?: StayServiceLevel,
  order: number
}

export interface IStay extends IEditableEntity, ISoftDeleteEntity {
  city: EntityDataAttrsOnly<ICity>,
  slug: string,
  geo: GeoPoint,
  name: ILocalizableValue,
  description: EntityDataAttrsOnly<IStayDescription>[],
  reviews: EntityDataAttrsOnly<IStayReview>[],
  images: IStayImageShort[]
}

export type IStayShort = Omit<IStay, 'description' | 'reviews' | 'images'> & {
  photo: {
    slug: string,
    timestamp: Timestamp
  }
};

export interface IStayOffer extends IOffer {
  stay: EntityDataAttrsOnly<IStayShort> & { reviewSummary?: ReviewSummary },
  checkIn: Date,
  checkOut: Date,
  numGuests: number,
  numRooms: number
}

export interface IStayOffersFilterParams {
  citySlug?: string,
  checkIn?: Date,
  checkOut?: Date,
  price?: {
    from?: Price,
    to?: Price
  },
  ratings?: number[],
  numGuests?: number,
  numRooms?: number
}

export interface ISearchStayOffersResultFilterParams {
  priceRange?: {
    from: number,
    to: number
  }
}

export interface ISearchStayOffersResult<TOffer extends IStayOffer = IStayOffer> {
  pagedItems: EntityDataAttrsOnly<TOffer>[],
  totalCount: number,
  paramsNarrowing?: ISearchStayOffersResultFilterParams
}

export interface IStayOfferDetails extends Omit<IStayOffer, 'stay'> {
  stay: EntityDataAttrsOnly<Omit<EntityDataAttrsOnly<IStay>, 'images' | 'reviews'>  & IStayShort & { images: IStayImageShort[], reviewSummary?: ReviewSummary }>,
  prices: { [SL in StayServiceLevel]: Price }
}

export interface IStaySearchHistory {
  popularCityIds: EntityId[]
}

export type IOfferBookingData = {
  offerId: EntityId,
  kind: OfferKind,
  bookedUserId: EntityId,
  serviceLevel?: StayServiceLevel
};

export interface IBooking extends IEditableEntity, ISoftDeleteEntity {
  bookedUser: {
    id: EntityId,
    avatar: IImageEntitySrc | undefined,
    firstName?: string,
    lastName?: string
  }
}

/**
 * Typings for some app pages query params
 */
export type AppPageCommonArgs = {
  i: '0' | '1' | null
};

export type BookingPageArgs = AppPageCommonArgs & {
  isSecondPage: '0' | '1' | null,
  theme: Theme | null
};

export type BookStayPageArgs = AppPageCommonArgs & {
  serviceLevel: StayServiceLevel | null
}; 

export interface IOfferBooking<TOffer extends IFlightOffer | IStayOfferDetails> extends IBooking {
  offer: EntityDataAttrsOnly<TOffer>
  serviceLevel: TOffer extends IStayOffer ? StayServiceLevel : undefined
}

export type DocumentCommonParams = {
  theme: Theme,
  locale: Locale
};

export interface ICommonServicesLocator {
  getLogger() : IAppLogger
}
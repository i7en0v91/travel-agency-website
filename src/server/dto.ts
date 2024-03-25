import { type InferType, string, number, object, array, tuple, boolean, date, lazy } from 'yup';
import { AppExceptionCodeEnum, type AppExceptionAppearance } from '../shared/exceptions';
import { type StayDescriptionParagraphType, type AirplaneImageKind, type FlightOffersSortFactor, type CacheEntityType, type TripType, type FlightClass, AvailableFlightOffersSortFactor, AvailableStayOffersSortFactor, type StayServiceLevel } from '../shared/interfaces';
import { AvailableLocaleCodes, AvailableThemeCodes, FlightMinPassengers, FlightMaxPassengers, StaysMaxRoomsCount, StaysMaxGuestsCount, SearchOffersListConstants, MaxStayReviewLength } from '../shared/constants';

/**
 * Dto Schemas
 */
export const SessionDtoSchema = object({
  sessionId: string().max(256).required(),
  values: array().of(tuple([
    string().max(256).required(),
    string().max(1024).defined().required()
  ]).required()).required()
});

export const SignUpDtoSchema = object({
  firstName: string().max(128).required(),
  lastName: string().max(128).required(),
  email: string().max(256).required(),
  password: string().max(256).required(),
  locale: string().max(4).required(),
  theme: string().max(32).oneOf(AvailableThemeCodes).required(),
  captchaToken: string().max(2048).optional()
});

export const SignUpCompleteDtoSchema = object({
  id: number().required(),
  value: string().max(256).required()
});

export const RecoverPasswordDtoSchema = object({
  email: string().max(256).required(),
  locale: string().max(4).required(),
  theme: string().max(32).oneOf(AvailableThemeCodes).required(),
  captchaToken: string().max(2048).optional()
});

export const RecoverPasswordCompleteDtoSchema = object({
  id: number().required(),
  value: string().max(256).required(),
  password: string().max(256).required()
});

export const NewsletterSubscribeDtoSchema = object({
  email: string().max(256).required()
});

export const UpdateAccountDtoSchema = object({
  firstName: string().max(128).optional(),
  lastName: string().max(128).optional(),
  emails: array().of(string().max(256).required()).optional(),
  password: string().max(256).optional(),
  locale: string().max(4).required(),
  theme: string().max(32).oneOf(AvailableThemeCodes).required(),
  captchaToken: string().max(2048).optional()
});

export const EmailVerifyCompleteDtoSchema = object({
  id: number().required(),
  value: string().max(256).required()
});

export const CitiesSearchQuerySchema = object({
  locale: string().max(4).oneOf(AvailableLocaleCodes).required(),
  size: number().required().min(0).max(1024),
  searchTerm: string().max(256).optional(),
  includeCountry: boolean().optional()
});

export const EntityCacheQuerySchema = object({
  ids: lazy(val => (Array.isArray(val) ? array().of(number().required().min(0)) : number().required().min(0))).optional(),
  slugs: lazy(val => (Array.isArray(val) ? array().of(string().required().max(256)) : string().required().max(256))).optional(),
  type: string<CacheEntityType>().max(64).lowercase().required()
});

export const PaginationDtoSchema = object({
  skip: number().required().min(0).max(10000),
  take: number().required().min(0).max(100)
});

export const SearchFlightOffersMainParamsDtoSchema = object().shape({
  fromCitySlug: string().max(256).optional(),
  toCitySlug: string().max(256).optional(),
  tripType: string<TripType>().max(16).optional(),
  dateFrom: date().optional(),
  dateTo: date().optional(),
  numPassengers: number().min(FlightMinPassengers).max(FlightMaxPassengers).optional(),
  class: string<FlightClass>().max(16).optional()
});

export const SearchFlightOffersParamsDtoSchema = SearchFlightOffersMainParamsDtoSchema.shape({
  price: object({
    from: number().optional().min(SearchOffersListConstants.Price.min).max(SearchOffersListConstants.Price.max),
    to: number().optional().min(SearchOffersListConstants.Price.min).max(SearchOffersListConstants.Price.max)
  }).optional(),
  departureTimeOfDay: object({
    from: number().optional().min(0).max(SearchOffersListConstants.NumMinutesInDay - 1),
    to: number().optional().min(0).max(SearchOffersListConstants.NumMinutesInDay - 1)
  }).optional(),
  airlineCompanyIds: array().of(number().required()).optional(),
  ratings: array().of(number().min(0).max(5).required()).optional(),
  flexibleDates: boolean().optional(),
  primarySort: string().max(32).oneOf(AvailableFlightOffersSortFactor).required(),
  secondarySort: string().max(32).oneOf(AvailableFlightOffersSortFactor).required(),
  pagination: PaginationDtoSchema.required(),
  narrowFilterParams: boolean().required(),
  topOffersStats: boolean().required()
});

export const SearchStayOffersMainParamsDtoSchema = object({
  citySlug: string().max(256).optional(),
  checkIn: date().optional(),
  checkOut: date().optional(),
  numRooms: number().min(0).max(StaysMaxRoomsCount).optional(),
  numGuests: number().min(0).max(StaysMaxGuestsCount).optional()
});

export const SearchStayOffersParamsDtoSchema = SearchStayOffersMainParamsDtoSchema.shape({
  price: object({
    from: number().optional().min(SearchOffersListConstants.Price.min).max(SearchOffersListConstants.Price.max),
    to: number().optional().min(SearchOffersListConstants.Price.min).max(SearchOffersListConstants.Price.max)
  }).optional(),
  ratings: array().of(number().min(0).max(5).required()).optional(),
  sort: string().max(32).oneOf(AvailableStayOffersSortFactor).required(),
  pagination: PaginationDtoSchema.required(),
  narrowFilterParams: boolean().required()
});

export const CreateOrUpdateStayReviewDtoSchema = object({
  textOrHtml: string().max(MaxStayReviewLength).required(),
  score: number().min(0).max(5).required()
});

/**
 * Interface Types
 */
export interface ILocalizableValueDto {
  en: string,
  ru: string,
  fr: string
}

export interface IGeoPointDto {
  lon: number,
  lat: number
}

export interface ICaptchaVerificationDto {
  captchaToken?: string
}
export interface ISessionDto extends InferType<typeof SessionDtoSchema> {};

export interface IAuthUserDto {
  id: string,
  firstName?: string,
  lastName?: string,
  avatarSlug?: string,
  avatarTimestamp?: number,
}

export interface IApiErrorDto {
  code: AppExceptionCodeEnum,
  internalMsg: string,
  appearance: AppExceptionAppearance,
  params?: any
};

export interface IWorldMapDataDto {
  cellRelativeSize: number,
  points: { x:number, y:number }[],
  source: {
    width: number,
    height: number
  },
  viewport: {
    x: number,
    y: number,
    width: number,
    height: number
  },
  origin: {
    relative: {
      x: number,
      y: number
    },
    geo: IGeoPointDto
  },
  step: {
    relative: {
      x: number,
      y: number
    },
    geo: IGeoPointDto
  }
}

export interface IImageDetailsDto {
  slug: string,
  invertForDarkTheme: boolean,
  stubCssStyle: [string, string][]
};

export enum SignUpResultCode {
  SUCCESS = 'SUCCESS',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  AUTOVERIFIED = 'AUTOVERIFIED'
}
export interface ISignUpResultDto {
  code: SignUpResultCode
}
export interface ISignUpDto extends InferType<typeof SignUpDtoSchema> {};

export enum SignUpCompleteResultCode {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}
export interface ISignUpCompleteResultDto {
  code: SignUpCompleteResultCode
}
export interface ISignUpCompleteDto extends ICaptchaVerificationDto, InferType<typeof SignUpCompleteDtoSchema> {};

export enum RecoverPasswordResultCode {
  SUCCESS = 'SUCCESS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED'
}
export interface IRecoverPasswordResultDto {
  code: RecoverPasswordResultCode
}
export interface IRecoverPasswordDto extends ICaptchaVerificationDto, InferType<typeof RecoverPasswordDtoSchema> {};

export enum RecoverPasswordCompleteResultCode {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}
export interface IRecoverPasswordCompleteResultDto {
  code: RecoverPasswordCompleteResultCode
}
export interface IRecoverPasswordCompleteDto extends InferType<typeof RecoverPasswordCompleteDtoSchema> {};

export interface IUserAccountDto {
  userId?: number,
  firstName?: string,
  lastName?: string,
  emails?: string[],
  avatarSlug?: string,
  avatarTimestamp?: number,
  coverSlug?: string,
  coverTimestamp?: number
};

export interface IImageUploadResultDto {
  id: number,
  slug: string,
  timestamp: number
};

export enum EmailVerifyCompleteResultCode {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}
export interface IEmailVerifyCompleteResultDto {
  code: EmailVerifyCompleteResultCode
}
export interface IEmailVerifyCompleteDto extends InferType<typeof EmailVerifyCompleteDtoSchema> {};

export interface IUpdateAccountDto extends InferType<typeof UpdateAccountDtoSchema> {};
export enum UpdateAccountResultCode {
  SUCCESS = 'SUCCESS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  DELETING_LAST_EMAIL = 'DELETING_LAST_EMAIL',
  EMAIL_AUTOVERIFIED = 'EMAIL_AUTOVERIFIED'
}
export interface IUpdateAccountResultDto {
  code: UpdateAccountResultCode
}

export interface ICitiesSearchQuery extends InferType<typeof CitiesSearchQuerySchema> {};
export interface IEntityCacheQuery extends InferType<typeof EntityCacheQuerySchema> {};

export interface ISearchFlightOffersMainParamsDto extends InferType<typeof SearchFlightOffersMainParamsDtoSchema> {};
export interface ISearchFlightOffersParamsDto extends InferType<typeof SearchFlightOffersParamsDtoSchema> {};
export interface ISearchStayOffersMainParamsDto extends InferType<typeof SearchStayOffersMainParamsDtoSchema> {};
export interface ISearchStayOffersParamsDto extends InferType<typeof SearchStayOffersParamsDtoSchema> {};
export interface ICreateOrUpdateStayReviewDto extends InferType<typeof CreateOrUpdateStayReviewDtoSchema> {};

export interface IListItemDto {
  id: number,
  slug?: string,
  displayName: ILocalizableValueDto
};

export interface IPopularCityDto {
  id: number,
  slug: string,
  imgSlug: string,
  cityDisplayName: ILocalizableValueDto,
  countryDisplayName: ILocalizableValueDto,
  promoLine: ILocalizableValueDto,
  promoPrice: number,
  geo: IGeoPointDto,
  visibleOnWorldMap: boolean,
  numStays: number,
  timestamp: number
};

export type ISearchedCityHistoryDto = Omit<IPopularCityDto, 'promoPrice'> & { numStays: number };

export interface ICompanyReviewDto {
  id: number,
  header: ILocalizableValueDto,
  body: ILocalizableValueDto,
  userName: ILocalizableValueDto,
  img?: {
    slug: string,
    timestamp: number
  }
};

export interface ITravelDetailsDto {
  city: {
    id: number,
    slug: string
  },
  header: ILocalizableValueDto,
  text: ILocalizableValueDto,
  price: number,
  images: {
    slug: string,
    timestamp: number
  }[]
}

export interface IAirplaneImageDto {
  id: number,
  kind: AirplaneImageKind,
  order: number,
  image: {
    slug: string,
    timestamp: number
  }
};

export interface IAirplaneDto {
  id: number,
  name: ILocalizableValueDto,
  images: IAirplaneImageDto[]
}

export interface ICityDto {
  id: number,
  slug: string,
  name: ILocalizableValueDto,
  geo: IGeoPointDto,
  utcOffsetMin: number,
  country: {
    id: number,
    name: ILocalizableValueDto
  }
}

export interface IAirportDto {
  id: number,
  name: ILocalizableValueDto,
  city: ICityDto,
  geo: IGeoPointDto
}

export interface IAirlineCompanyDto {
  id: number,
  name: ILocalizableValueDto,
  logoImage: {
    slug: string,
    timestamp?: number
  },
  city: {
    geo: IGeoPointDto
  },
  numReviews: number,
  reviewScore: number
}

export interface IOfferDto {
  id: number,
  totalPrice: number,
  isFavourite: boolean
}

export interface ISearchedFlightDto {
  id: number,
  airlineCompanyId: number,
  airplaneId: number,
  departAirportId: number,
  arriveAirportId: number,
  departTimeUtc: string,
  arriveTimeUtc: string
}

export interface ISearchedFlightOfferDto extends IOfferDto {
  departFlight: ISearchedFlightDto,
  arriveFlight?: ISearchedFlightDto,
  numPassengers: number,
  class: FlightClass
}

export interface ISearchedStayDto {
  id: number,
  slug: string,
  cityId: number,
  geo: IGeoPointDto,
  name: ILocalizableValueDto,
  numReviews: number,
  reviewScore: number,
  photo: {
    slug: string,
    timestamp: number,
  }
}

export interface ISearchedStayOfferDto extends IOfferDto {
  stay: ISearchedStayDto,
  checkInDate: string,
  checkOutDate: string,
  numGuests: number,
  numRooms: number
}

export interface ITopFlightOfferInfoDto {
  factor: FlightOffersSortFactor,
  price: number,
  duration: number // flight duration in minutes
}

export interface ISearchFlightOffersResultDto {
  entities: {
    airlineCompanies: IAirlineCompanyDto[],
    airplanes: IAirplaneDto[],
    airports: IAirportDto[]
  },
  pagedItems: ISearchedFlightOfferDto[],
  totalCount: number,
  paramsNarrowing?: {
    priceRange?: {
      from: number,
      to: number
    },
    airlineCompanyIds?: number[]
  },
  topOffers?: ITopFlightOfferInfoDto[]
}

export interface ISearchStayOffersResultDto {
  entities: {
    cities: ICityDto[]
  },
  pagedItems: ISearchedStayOfferDto[],
  totalCount: number,
  paramsNarrowing?: {
    priceRange?: {
      from: number,
      to: number
    }
  }
}

export interface IToggleFavouriteOfferResultDto {
  isFavourite: boolean
}

export interface IOfferDetailsDto extends IOfferDto {
  createdUtc: string,
  modifiedUtc: string
}

export interface IFlightDto {
  id: number,
  airlineCompany: IAirlineCompanyDto,
  airplane: IAirplaneDto,
  departAirport: IAirportDto,
  arriveAirport: IAirportDto,
  departTimeUtc: string,
  arriveTimeUtc: string
}

export interface IFlightOfferDetailsDto extends IOfferDetailsDto {
  departFlight: IFlightDto,
  arriveFlight?: IFlightDto,
  numPassengers: number,
  class: FlightClass
}

export interface IStayDescriptionDto {
  id: number,
  textStr: ILocalizableValueDto,
  paragraphKind: StayDescriptionParagraphType,
  order: number
}

export interface IStayReviewDto {
  id: number,
  user: {
    id: number,
    avatar?: {
      slug: string,
      timestamp: number,
    },
    firstName: string,
    lastName: string
  },
  text: ILocalizableValueDto,
  score: number,
  order: number
}

export interface IStayDto {
  id: number,
  slug: string,
  city: ICityDto,
  geo: IGeoPointDto,
  name: ILocalizableValueDto,
  images: {
    slug: string,
    timestamp: number,
    serviceLevel?: StayServiceLevel
    order: number
  }[],
  description: IStayDescriptionDto[],
  reviewScore: number,
  numReviews: number
}

export interface IStayOfferDetailsDto extends IOfferDetailsDto {
  stay: IStayDto,
  checkInDate: string,
  checkOutDate: string,
  numGuests: number,
  numRooms: number,
  prices: { [SL in StayServiceLevel]: number }
}

export interface IModifyStayReviewResultDto {
  reviewId: number
}

export interface IStayReviewsDto {
  reviews: IStayReviewDto[]
}

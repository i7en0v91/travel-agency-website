import { type InferType, string, number, object, array, boolean, date, lazy } from 'yup';
import { NumMinutesInDay, SearchOffersPriceRange, AvailableLocaleCodes, AvailableThemeCodes, FlightMinPassengers, FlightMaxPassengers, StaysMaxRoomsCount, StaysMaxGuestsCount, MaxStayReviewLength, type SignUpResultEnum, type SignUpCompleteResultEnum, type RecoverPasswordResultEnum, type RecoverPasswordCompleteResultEnum, AllHtmlPages, type AppExceptionAppearance, RestApiPrefix, RestApiLogging, RestApiAuth, type StayDescriptionParagraphType, type AirplaneImageKind, type FlightOffersSortFactor, type CacheEntityType, type TripType, type FlightClass, AvailableFlightOffersSortFactor, AvailableStayOffersSortFactor, type StayServiceLevel, type OfferKind, type EntityId, RestAppPrefix } from '@golobe-demo/shared';

const EntityIdMaxLength = 256;

export enum TestingPageCacheActionEnum {
  Prepare = 'Prepare',
  Change = 'Change',
  Complete = 'Complete'
}
const AllTestingPageCacheActions = Object.values(TestingPageCacheActionEnum).map(e => e.valueOf());

/**
 * Endpoints
 */
export const ApiEndpointPrefix = RestApiPrefix;
export const ApiEndpointNuxtContentPrefix = `${ApiEndpointPrefix}/_content`;
export const ApiAppEndpointPrefix = RestAppPrefix;
export const ApiEndpointLogging = RestApiLogging;
export const ApiEndpointTestingInvlidatePage = `${ApiAppEndpointPrefix}/testing/invalidate-page`;
export const ApiEndpointTestingPageCacheAction = `${ApiAppEndpointPrefix}/testing/test-page-cache`;
export const ApiEndpointTestingCacheCleanup = `${ApiAppEndpointPrefix}/testing/cache-cleanup`;
export const ApiEndpointPurgeCache = `${ApiAppEndpointPrefix}/purge-cache`;
export const ApiEndpointAuthentication = RestApiAuth;
export const ApiEndpointImage = `${ApiAppEndpointPrefix}/img`;
export const ApiEndpointImageDetails = `${ApiAppEndpointPrefix}/img/details`;
export const ApiEndpointImageList = `${ApiAppEndpointPrefix}/img/list`;
export const ApiEndpointAuthFormPhotos = `${ApiAppEndpointPrefix}/img/auth-forms`;
export const ApiEndpointSignUp = `${ApiAppEndpointPrefix}/account/signup`;
export const ApiEndpointSignUpComplete = `${ApiAppEndpointPrefix}/account/signup-complete`;
export const ApiEndpointPasswordRecovery = `${ApiAppEndpointPrefix}/account/recover-password`;
export const ApiEndpointPasswordRecoveryComplete = `${ApiAppEndpointPrefix}/account/recover-password-complete`;
export const ApiEndpointEmailVerifyComplete = `${ApiAppEndpointPrefix}/account/email-verify-complete`;
export const ApiEndpointNewsletterSubscribe = `${ApiAppEndpointPrefix}/newsletter-subscribe`;
export const ApiEndpointUserAccount = `${ApiAppEndpointPrefix}/user/account`;
export const ApiEndpointUserFavourites = `${ApiAppEndpointPrefix}/user/favourites`;
export const ApiEndpointUserTickets = `${ApiAppEndpointPrefix}/user/tickets`;
export const ApiEndpointUserImageUpload = `${ApiAppEndpointPrefix}/user/upload-image`;
export const ApiEndpointCitiesSearch = `${ApiAppEndpointPrefix}/cities/search`;
export const ApiEndpointPopularCitiesList = `${ApiAppEndpointPrefix}/popular-cities`;
export const ApiEndpointPopularCityTravelDetails = `${ApiAppEndpointPrefix}/popular-cities/travel-details`;
export const ApiEndpointCompanyReviewsList = `${ApiAppEndpointPrefix}/company-reviews`;
export const ApiEndpointEntityCache = `${ApiAppEndpointPrefix}/entity-cache`;
export const ApiEndpointFlightOffersSearch = `${ApiAppEndpointPrefix}/flight-offers/search`;
export const ApiEndpointFlightOfferDetails = (id: EntityId) => `${ApiAppEndpointPrefix}/flight-offers/${id}/details`;
export const ApiEndpointFlightOfferFavourite = (id: EntityId) => `${ApiAppEndpointPrefix}/flight-offers/${id}/favourite`;
export const ApiEndpointFlightOfferBook = (id: EntityId) => `${ApiAppEndpointPrefix}/flight-offers/${id}/book`;
export const ApiEndpointStayOffersSearch = `${ApiAppEndpointPrefix}/stay-offers/search`;
export const ApiEndpointStayOfferDetails = (id: EntityId) => `${ApiAppEndpointPrefix}/stay-offers/${id}/details`;
export const ApiEndpointStayOfferReviewSummary = (id: EntityId) => `${ApiAppEndpointPrefix}/stay-offers/${id}/review-summary`;
export const ApiEndpointStayOfferFavourite = (id: EntityId) => `${ApiAppEndpointPrefix}/stay-offers/${id}/favourite`;
export const ApiEndpointStayOfferBook = (id: EntityId) => `${ApiAppEndpointPrefix}/stay-offers/${id}/book`;
export const ApiEndpointStayOffersSearchHistory = `${ApiAppEndpointPrefix}/stay-offers/search-history`;
export const ApiEndpointStayReviews = (id: EntityId) => `${ApiAppEndpointPrefix}/stays/${id}/reviews`;

export const ApiEndpointBookingDetails = (id: EntityId) => `${ApiAppEndpointPrefix}/booking/${id}`;
export const ApiEndpointBookingOffer = (id: EntityId) => `${ApiAppEndpointPrefix}/booking/${id}/offer`;
export const ApiEndpointBookingDownload = (id: EntityId) => `${ApiAppEndpointPrefix}/booking/${id}/download`;

/**
 * Dto Schemas
 */
export const TestingInvalidateCacheDtoSchema = object({
  values: array().of(
    object({
      page: string().max(128).oneOf(AllHtmlPages.map(p => p.valueOf())),
      id: string().max(EntityIdMaxLength).optional(),
      query: object().optional()
    }).required()).min(1).required()
});

export const TestingPageCacheActionDtoSchema = object({
  page: string().max(128).oneOf(AllHtmlPages.map(p => p.toString())).required(),
  action: string().max(128).oneOf(AllTestingPageCacheActions).required(),
  testId: string().max(EntityIdMaxLength).optional(),
  testToken: string().max(256).optional()
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
  id: string().max(EntityIdMaxLength).required(),
  value: string().max(256).required()
});

export const RecoverPasswordDtoSchema = object({
  email: string().max(256).required(),
  locale: string().max(4).required(),
  theme: string().max(32).oneOf(AvailableThemeCodes).required(),
  captchaToken: string().max(2048).optional()
});

export const RecoverPasswordCompleteDtoSchema = object({
  id: string().max(EntityIdMaxLength).required(),
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
  id: string().max(EntityIdMaxLength).required(),
  value: string().max(256).required()
});

export const CitiesSearchQuerySchema = object({
  locale: string().max(4).oneOf(AvailableLocaleCodes).required(),
  size: number().required().min(0).max(1024),
  searchTerm: string().max(256).optional(),
  includeCountry: boolean().optional()
});

export const EntityCacheQuerySchema = object({
  ids: lazy(val => (Array.isArray(val) ? array().of(string().max(EntityIdMaxLength).required()) : string().max(EntityIdMaxLength).required())).optional(),
  slugs: lazy(val => (Array.isArray(val) ? array().of(string().required().max(256)) : string().required().max(256))).optional(),
  type: string<CacheEntityType>().max(64).lowercase().required()
});

export const BookingDownloadQuerySchema = object({
  locale: string().max(4).oneOf(AvailableLocaleCodes).required(),
  theme: string().max(32).oneOf(AvailableThemeCodes).required()
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
    from: number().optional().min(SearchOffersPriceRange.min).max(SearchOffersPriceRange.max),
    to: number().optional().min(SearchOffersPriceRange.min).max(SearchOffersPriceRange.max)
  }).optional(),
  departureTimeOfDay: object({
    from: number().optional().min(0).max(NumMinutesInDay - 1),
    to: number().optional().min(0).max(NumMinutesInDay - 1)
  }).optional(),
  airlineCompanyIds: array().of(string().max(EntityIdMaxLength).required()).optional(),
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
    from: number().optional().min(SearchOffersPriceRange.min).max(SearchOffersPriceRange.max),
    to: number().optional().min(SearchOffersPriceRange.min).max(SearchOffersPriceRange.max)
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

export interface IAuthUserDto {
  id: string,
  firstName?: string,
  lastName?: string,
  avatarSlug?: string,
  avatarTimestamp?: number,
}

export interface IApiErrorDto {
  code: number, //AppExceptionCodeEnum
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


export interface ISignUpResultDto {
  code: SignUpResultEnum
}
export interface ISignUpDto extends InferType<typeof SignUpDtoSchema> {};


export interface ISignUpCompleteResultDto {
  code: SignUpCompleteResultEnum
}
export interface ISignUpCompleteDto extends ICaptchaVerificationDto, InferType<typeof SignUpCompleteDtoSchema> {};



export interface IRecoverPasswordResultDto {
  code: RecoverPasswordResultEnum
}
export interface IRecoverPasswordDto extends ICaptchaVerificationDto, InferType<typeof RecoverPasswordDtoSchema> {};


export interface IRecoverPasswordCompleteResultDto {
  code: RecoverPasswordCompleteResultEnum
}
export interface IRecoverPasswordCompleteDto extends InferType<typeof RecoverPasswordCompleteDtoSchema> {};

export interface IUserAccountDto {
  userId?: string,
  firstName?: string,
  lastName?: string,
  emails?: string[],
  avatarSlug?: string,
  avatarTimestamp?: number,
  coverSlug?: string,
  coverTimestamp?: number
};

export interface IImageUploadResultDto {
  id: string,
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
export interface IBookingDownloadQuery extends InferType<typeof BookingDownloadQuerySchema> {};

export interface ITestingInvalidateCacheDto extends InferType<typeof TestingInvalidateCacheDtoSchema>{};
export interface ISearchFlightOffersMainParamsDto extends InferType<typeof SearchFlightOffersMainParamsDtoSchema> {};
export interface ISearchFlightOffersParamsDto extends InferType<typeof SearchFlightOffersParamsDtoSchema> {};
export interface ISearchStayOffersMainParamsDto extends InferType<typeof SearchStayOffersMainParamsDtoSchema> {};
export interface ISearchStayOffersParamsDto extends InferType<typeof SearchStayOffersParamsDtoSchema> {};
export interface ICreateOrUpdateStayReviewDto extends InferType<typeof CreateOrUpdateStayReviewDtoSchema> {};
export interface ITestingPageCacheActionDto extends InferType<typeof TestingPageCacheActionDtoSchema> {};

export interface IListItemDto {
  id: string,
  slug?: string,
  displayName: ILocalizableValueDto
};

export interface IPopularCityDto {
  id: string,
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
  id: string,
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
    id: string,
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
  id: string,
  kind: AirplaneImageKind,
  order: number,
  image: {
    slug: string,
    timestamp: number
  }
};

export interface IAirplaneDto {
  id: string,
  name: ILocalizableValueDto,
  images: IAirplaneImageDto[]
}

export interface ICityDto {
  id: string,
  slug: string,
  name: ILocalizableValueDto,
  geo: IGeoPointDto,
  utcOffsetMin: number,
  country: {
    id: string,
    name: ILocalizableValueDto
  }
}

export interface IAirportDto {
  id: string,
  name: ILocalizableValueDto,
  city: ICityDto,
  geo: IGeoPointDto
}

export interface IAirlineCompanyDto {
  id: string,
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
  id: string,
  kind: OfferKind,
  totalPrice: number,
  isFavourite: boolean
}

export interface ISearchedFlightDto {
  id: string,
  airlineCompanyId: string,
  airplaneId: string,
  departAirportId: string,
  arriveAirportId: string,
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
  id: string,
  slug: string,
  cityId: string,
  geo: IGeoPointDto,
  name: ILocalizableValueDto,
  reviewSummary?: IReviewSummaryDto,
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

export interface ISearchFlightOffersResultDto<TOfferDto = ISearchedFlightOfferDto> {
  entities: {
    airlineCompanies: IAirlineCompanyDto[],
    airplanes: IAirplaneDto[],
    airports: IAirportDto[]
  },
  pagedItems: TOfferDto[],
  totalCount: number,
  paramsNarrowing?: {
    priceRange?: {
      from: number,
      to: number
    },
    airlineCompanyIds?: EntityId[]
  },
  topOffers?: ITopFlightOfferInfoDto[]
}

export interface ISearchStayOffersResultDto<TOfferDto = ISearchedStayOfferDto> {
  entities: {
    cities: ICityDto[]
  },
  pagedItems: TOfferDto[],
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
  id: string,
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
  id: string,
  textStr: ILocalizableValueDto,
  paragraphKind: StayDescriptionParagraphType,
  order: number
}

export interface IStayReviewDto {
  id: string,
  user: {
    id: string,
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
  id: string,
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
  reviewId: string
}

export interface IStayReviewsDto {
  reviews: IStayReviewDto[]
}

export interface IReviewSummaryDto {
  numReviews: number,
  score: number
}

export interface IBookingDetailsDto {
  id: string,
  kind: OfferKind,
  bookedUser: {
    id: string,
    firstName?: string,
    lastName?: string,
    avatar?: {
      slug: string,
      timestamp?: number,
    }
  },
  flightOffer?: IFlightOfferDetailsDto,
  stayOffer?: IStayOfferDetailsDto & { reviewSummary?: IReviewSummaryDto },
  serviceLevel?: StayServiceLevel
}

export interface IBookingResultDto {
  bookingId: string
}

export interface IUserFavouriteFlightOfferDto extends ISearchedFlightOfferDto {
  addTimestamp: number
}
export interface IUserFavouriteStayOfferDto extends ISearchedStayOfferDto {
  addTimestamp: number
}
export interface IUserFavouritesResultDto {
  flights: Omit<ISearchFlightOffersResultDto<IUserFavouriteFlightOfferDto>, 'paramsNarrowing' | 'topOffers'>,
  stays: Omit<ISearchStayOffersResultDto<IUserFavouriteStayOfferDto>, 'paramsNarrowing'>
};

export interface IUserTicketDto {
  bookedTimestamp: number,
  bookingId: string
}
export type IUserFlightTicketDto = ISearchedFlightOfferDto & IUserTicketDto;
export type IUserStayTicketDto = ISearchedStayOfferDto & IUserTicketDto;
export interface IUserTicketsResultDto {
  flights: Omit<ISearchFlightOffersResultDto<IUserFlightTicketDto>, 'paramsNarrowing' | 'topOffers'>,
  stays: Omit<ISearchStayOffersResultDto<IUserStayTicketDto>, 'paramsNarrowing'>
};

export interface ITestingInvalidateCacheResultDto {
  success: boolean
}
export interface ITestingPageCacheActionResultDto {
  testId: EntityId | undefined
}


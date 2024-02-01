import { type InferType, string, number, object, array, tuple, boolean, date, lazy } from 'yup';
import { AppExceptionCodeEnum, type AppExceptionAppearance } from '../shared/exceptions';
import { type EntityId, type Timestamp, type CacheEntityType, type TripType, type FlightClass } from '../shared/interfaces';
import { AvailableLocaleCodes, AvailableThemeCodes, FlightMinPassengers, FlightMaxPassengers, StaysMaxRoomsCount, StaysMaxGuestsCount } from '../shared/constants';

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
  ids: lazy(val => (Array.isArray(val) ? array().of(number().required().min(0)) : number().required().min(0))),
  slugs: lazy(val => (Array.isArray(val) ? array().of(string().max(256)) : string().max(256))),
  type: string<CacheEntityType>().max(64).lowercase().required()
});

export const SearchFlightOffersParamsQuerySchema = object({
  fromCitySlug: string().max(256).optional(),
  toCitySlug: string().max(256).optional(),
  tripType: string<TripType>().max(16).optional(),
  dateFrom: date().optional(),
  dateTo: date().optional(),
  numPassengers: number().min(FlightMinPassengers).max(FlightMaxPassengers).optional(),
  class: string<FlightClass>().max(16).optional()
});

export const SearchStayOffersParamsQuerySchema = object({
  citySlug: string().max(256).optional(),
  checkIn: date().optional(),
  checkOut: date().optional(),
  numRooms: number().min(0).max(StaysMaxRoomsCount).optional(),
  numGuests: number().min(0).max(StaysMaxGuestsCount).optional()
});

/**
 * Interface Types
 */
export interface ILocalizableValueDto {
  en: string,
  ru: string,
  fr: string
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
  avatarTimestamp?: Timestamp,
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
    geo: {
      lon: number,
      lat: number
    }
  },
  step: {
    relative: {
      x: number,
      y: number
    },
    geo: {
      lon: number,
      lat: number
    }
  }
}

export interface IImageDetailsDto {
  slug: string,
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
  avatarTimestamp?: Timestamp,
  coverSlug?: string,
  coverTimestamp?: Timestamp
};

export interface IImageUploadResultDto {
  id: number,
  slug: string,
  timestamp: Timestamp
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

export interface ISearchFlightOffersParamsQuery extends InferType<typeof SearchFlightOffersParamsQuerySchema> {};
export interface ISearchStayOffersParamsQuery extends InferType<typeof SearchStayOffersParamsQuerySchema> {};

export interface IListItemDto {
  id: number,
  slug?: string,
  displayName: ILocalizableValueDto
};

export interface IPopularCityDto {
  id: number,
  slug: string,
  cityDisplayName: ILocalizableValueDto,
  countryDisplayName: ILocalizableValueDto,
  promoLine: ILocalizableValueDto,
  promoPrice: number,
  geo: {
    lon: number,
    lat: number
  }
  visibleOnWorldMap: boolean,
  timestamp: number
};

export interface ICompanyReviewDto {
  id: EntityId,
  header: ILocalizableValueDto,
  body: ILocalizableValueDto,
  userName: ILocalizableValueDto,
  img?: {
    slug: string,
    timestamp: Timestamp
  }
};

export interface ITravelDetailsDto {
  cityId: EntityId,
  header: ILocalizableValueDto,
  text: ILocalizableValueDto,
  price: number,
  images: {
    slug: string,
    timestamp: Timestamp
  }[]
}

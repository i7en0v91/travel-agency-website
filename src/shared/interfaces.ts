import { type CSSProperties } from 'vue';
import type { Decimal } from '@prisma/client/runtime/library';
import { type ICitiesSearchQuery } from '../server/dto';
import { type Locale, DefaultUserCoverSlug, DefaultUserAvatarSlug, type Theme } from './constants';
import { type I18nResName } from './i18n';

export type Price = Decimal;

export type EntityId = number;
export interface IEntity {
  id: EntityId
}
export interface ISoftDeleteEntity extends IEntity {
  isDeleted: boolean
}
export interface IEditableEntity extends IEntity {
  createdUtc: Date,
  modifiedUtc: Date
}
export interface IConcurrentlyModifyingEntity {
  version: number;
}

export type Timestamp = number;

export interface ILocalizableValue {
  en: string,
  fr: string,
  ru: string
}

// Demo-specific optimization concept, designed to reduce number of records in DB.
// Flights/stays are generated on-the-fly in memory on request and do not exists in DB until user has performed some actions, e.g. opened details or booked.
// When this happens, in-memory flights/stays are materialized into DB records and become specific only to particular user which performed the operation.
// This is for simplicity of domain's logic DB representation and is not critical for demonstration purposes
export type PrivacyScope = 'visible-to-all' | 'session-user-only';

export interface IPagination {
  skip: number,
  take: number
}

export interface ISorting<TFactor> {
  direction?: 'asc' | 'desc' | null,
  factor?: TFactor
}

/**
 * User Session
 */
export enum AuthProvider {
  Email = 'EMAIL',
  Google = 'GOOGLE',
  GitHub = 'GITHUB',
  TestLocal = 'TESTLOCAL'
}
export type RegisterVerificationFlow = 'verified' | 'send-email';
export type UserDataSet = 'minimal' | 'profile';

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

export type SessionValue = string;
export type SessionValues = [string, SessionValue][];
export type SessionId = string;

export type UserSession = { sessionId: SessionId, userId?: EntityId, values: SessionValues };
export type Session = UserSession & IConcurrentlyModifyingEntity;

export interface IUserSession {
  getValue: (key: string) => SessionValue | undefined,
  ensureSession: () => Promise<UserSession>
}

export interface IUserSessionClient extends IUserSession {
  setValue: (key: string, value: SessionValue | undefined, persistOnServer: boolean) => void,
}

export interface IUserSessionServer extends IUserSession {
  setValue: (key: string, value: SessionValue | undefined) => Promise<void>,
}

export interface ISessionLogic {
  createNewSessionId(): SessionId;
  findSession(id: SessionId): Promise<Session | undefined>;
  persistSession(session: Session): Promise<void>;
  clearSessionCache(id: SessionId): Promise<void>;
  setSessionUser(sessionId: SessionId, userId: EntityId): Promise<void>;
}

/**
 * Entity Cache
 */
export enum CacheEntityTypeEnum {
  City = 'City'
};
export type CacheEntityType = keyof typeof CacheEntityTypeEnum;

export interface IEntityCacheItem {
  id: EntityId,
  slug: string,
  type: CacheEntityType,
  expireAt?: Date
}

export interface IEntityCacheCityItem extends IEntityCacheItem {
  type: CacheEntityType,
  displayName: ILocalizableValue
}

export interface IEntityCacheLogic {
  get: <TEntityType extends CacheEntityType, TCacheItem extends ({ type: TEntityType } & IEntityCacheItem)>(idsOrSlugs: EntityId[] | string[], type: TEntityType) => Promise<TCacheItem[]>
}

/**
 * Files
 */
export interface IFileInfo extends IEditableEntity, ISoftDeleteEntity {
  originalName?: string,
  mime?: string
}

export interface IFileData {
  bytes: Buffer,
  ownerId?: EntityId,
  originalName?: string
  mimeType?: string
}

export interface IFileLogic {
  findFile(id: EntityId): Promise<IFileInfo>;
  createFile(data: IFileData): Promise<{ id: EntityId, timestamp: Timestamp }>;
  updateFile(id: EntityId, data: Partial<IFileData>, recoverDeleted?: boolean): Promise<{ timestamp: Timestamp }>;
  getFileBytes(id: EntityId): Promise<Buffer>;
}

/**
 * Images
 */
export enum ImageCategory {
  UserAvatar = 'UserAvatar',
  UserCover = 'UserCover',
  MainTitle = 'MainTitle',
  PageTitle = 'PageTitle',
  CityCard = 'CityCard',
  TravelBlock = 'TravelBlock',
  CompanyReview = 'CompanyReview',
  AirlineLogo = 'AirlineLogo',
  Airplane = 'Airplane',
  AirplaneFeature = 'AirplaneFeature',
  Hotel = 'Hotel',
  HotelRoom = 'HotelRoom',
  AuthFormsImage = 'AuthFormsImage'
}
export const ImageAuthRequiredCategories = [ImageCategory.UserAvatar, ImageCategory.UserCover];
export const ImagePublicSlugs = [DefaultUserCoverSlug, DefaultUserAvatarSlug];

export interface IImageInfo extends IEntity {
  slug: string,
  category: ImageCategory,
  file: IFileInfo,
  stubCssStyle: CSSProperties | undefined
}

export interface IImageCategoryInfo {
  id: EntityId,
  width: number,
  height: number
}

export type ImageCheckAccessResult = 'granted' | 'denied' | 'unprotected';
export type ImageBytesOptions = number | 'leave-as-is';
export interface IImageBytes {
  bytes: Buffer,
  mimeType?: string,
  modifiedUtc: Date
}

export type IImageData = IFileData & {
  slug: string,
  category: ImageCategory,
  stubCssStyle: CSSProperties | undefined
};

export interface IImageBytesProvider {
  getImageBytes(idOrSlug: EntityId | string, category: ImageCategory, bytesOptions: ImageBytesOptions): Promise<IImageBytes | undefined>;
  clearImageCache(idOrSlug: EntityId | string, category: ImageCategory): Promise<void>;
}
export interface IImageLogic {
  checkAccess(idOrSlug: EntityId | string, category: ImageCategory, userId?: EntityId): Promise<ImageCheckAccessResult | undefined>;
  findImage(idOrSlug: EntityId | string, category: ImageCategory): Promise<IImageInfo | undefined>;
  getImageBytes(idOrSlug: EntityId | string, category: ImageCategory): Promise<IImageBytes | undefined>;
  createImage(data: IImageData): Promise<{ id: EntityId, timestamp: Timestamp }>;
  updateImage(imageId: EntityId, data: Partial<IImageData>, imageFileId?: EntityId): Promise<{ timestamp: Timestamp }>;
  getAllImagesByCategory(category: ImageCategory): Promise<IImageInfo[]>;
}

export interface IImageCategoryLogic {
  getImageCategoryInfos(): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>>;
  findCategory(type: ImageCategory): Promise<IImageCategoryInfo | undefined>;
  createCategory(type: ImageCategory, width: number, height: number): Promise<EntityId>;
}

/**
 * User Profile
 */

export interface IUserProfileInfo extends IUserMinimalInfo {
  cover?: IImageInfo,
  avatar?: IImageInfo
}

export interface UserResponseDataSet {
  minimal: IUserMinimalInfo,
  profile: IUserProfileInfo
}
export type RegisterUserByEmailResponse = EntityId | 'already-exists' | 'insecure-password';
export type PasswordRecoveryResult = 'success' | 'user-not-found' | 'email-not-verified';
export type UpdateUserAccountResult = 'success' | 'email-already-exists' | 'deleting-last-email' | 'email-autoverified';
export interface IUserLogic {
  getUser<TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined>;
  findUser<TDataSet extends keyof UserResponseDataSet>(authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined>;
  findUserByEmail<TDataSet extends keyof UserResponseDataSet>(email: string, mustBeVerified: boolean, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined>
  registerUserByEmail(email: string, password: string, verification: RegisterVerificationFlow, firstName?: string, lastName?: string, theme?: Theme, locale?: Locale) : Promise<RegisterUserByEmailResponse>;
  updateUserAccount(userId: EntityId, firstName?: string, lastName?: string, password?: string, emails?: string[], theme?: Theme, locale?: Locale) : Promise<UpdateUserAccountResult>;
  ensureOAuthUser(authProvider: AuthProvider, providerIdentity: string, firstName?: string, lastName?: string, email?: string, emailVerified?: boolean): Promise<IUserProfileInfo>;
  verifyUserPassword(email: string, password: string): Promise<IUserMinimalInfo | undefined>;
  recoverUserPassword(email: string, theme?: Theme, locale?: Locale): Promise<PasswordRecoveryResult>;
  setUserPassword(userId: EntityId, password: string): Promise<void>;
  uploadUserImage(userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName?: string): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }>;
};

/**
 * Geo logic
 */
export interface ICountry extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue
}

export interface ICity extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  slug: string,
  geo: {
    lon: number,
    lat: number
  },
  country: ICountry
}
export type ICityShort = Omit<ICity, 'country'>;
export type ICityData = Omit<ICity, 'country' | keyof (IEditableEntity & ISoftDeleteEntity)> & { countryId: EntityId, population: number };
export type ICountryData = Omit<ICountry, keyof (IEditableEntity & ISoftDeleteEntity)>;

export interface IGeoLogic {
  getAllCountries(): Promise<ICountry[]>;
  getAllCities(): Promise<ICityShort[]>;
  createCountry(data: ICountryData): Promise<EntityId>;
  createCity(data: ICityData): Promise<EntityId>;
};

/**
 * Cities logic
 */
export interface ICitySearchItem {
  id: EntityId,
  slug: string,
  displayName: ILocalizableValue
}
export interface IPopularCityItem {
  id: EntityId,
  slug: string,
  visibleOnWorldMap: boolean,
  cityDisplayName: ILocalizableValue,
  countryDisplayName: ILocalizableValue,
  promoLine: ILocalizableValue,
  geo: {
    lon: number,
    lat: number
  },
  timestamp: number
}

export interface ITravelDetails {
  header: ILocalizableValue,
  text: ILocalizableValue,
  price: number,
  images: {
    slug: string,
    timestamp: Timestamp
  }[],
  modifiedUtc: Date
}

export interface IPopularCityData {
  cityId: EntityId,
  rating: number,
  promoLineStr: ILocalizableValue,
  travelHeaderStr: ILocalizableValue,
  travelTextStr: ILocalizableValue,
  visibleOnWorldMap: boolean
}

export interface ICitiesLogic {
  search(query: ICitiesSearchQuery): Promise<ICitySearchItem[]>;
  getPopularCities(): Promise<IPopularCityItem[]>;
  setPopularCityImages(cityId: EntityId, images: { id: EntityId, order: number }[]): Promise<void>;
  getCity(slug: string): Promise<ICityShort>;
  makeCityPopular(data: IPopularCityData): Promise<void>;
  getTravelDetails(cityId: EntityId): Promise<ITravelDetails>;
};

/** Airport logic */
export type FlightClass = 'economy' | 'business' | 'comfort';
export type TripType = 'oneway' | 'return';

export interface IAirlineCompany extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  logoImage: {
    slug: string,
    timestamp?: Timestamp
  },
  numReviews: number,
  reviewScore: number
}

export interface IAirplane extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue
}

export interface IAirport extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  city: ICity,
  geo: {
    lon: number,
    lat: number
  }
}

export type IAirportShort = Omit<IAirport, 'city' | 'geo' | Exclude<keyof (IEditableEntity & ISoftDeleteEntity), 'id'>>;
export type IAirportData = Omit<IAirport, 'city' | keyof (IEditableEntity & ISoftDeleteEntity)> & { cityId: EntityId };
export interface IAirportLogic {
  getAllAirports(): Promise<IAirportShort[]>;
  createAirport(data: IAirportData): Promise<EntityId>;
};

/** Flights logic */
export interface IFlight extends IEditableEntity, ISoftDeleteEntity {
  airlineCompany: IAirlineCompany,
  airplane: IAirplane,
  departAirport: IAirport,
  arriveAirport: IAirport,
  departTimeUtc: Date,
  arriveTimeUtc: Date
}

export interface IFlightOffer extends IEditableEntity, ISoftDeleteEntity {
  departFlight: IFlight,
  arriveFlight?: IFlight,
  numPassengers: number,
  totalPrice: Price,
  class: FlightClass,
  privacyScope: PrivacyScope,
  isFavourite: boolean
}

export interface IFlightOffersFilterParams {
  fromCityId: EntityId,
  toCityId: EntityId,
  tripType: TripType,
  numPassengers: number,
  class: FlightClass,
  departDate: Date,
  returnDate?: Date,
  departureTimeOfDay?: number, // in minutes, i.e. from 0 to 1439
  airlineCompanyIds?: EntityId[],
  flexibleDates?: boolean
}

export type FlightOffersSortFactor = 'Price' | 'Score' | 'Duration' | 'TimeToDeparture' | 'Rating';

export interface ISearchFlightOffersResult {
  pagedItems: IFlightOffer[],
  totalItemsCount: number,
  paramsNarrowing?: {
    priceRange?: {
      from: number,
      to: number
    },
    airlineCompanyIds?: EntityId[],
  }
}

export interface IFlightsLogic {
  searchOffers(filter: IFlightOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean): Promise<ISearchFlightOffersResult>;
};

/**
 * Company reviews logic
 */
export interface ICompanyReview {
  id: EntityId,
  header: ILocalizableValue,
  body: ILocalizableValue,
  userName: ILocalizableValue,
  imgSlug?: string,
  timestamp: Timestamp
}
export type CompanyReviewData = Omit<ICompanyReview, 'id' | 'timestamp' | 'imgSlug'> & { imageId: EntityId };

export interface ICompanyReviewsLogic {
  getReviews(): Promise<ICompanyReview[]>;
  createReview(data: CompanyReviewData): Promise<EntityId>;
};

/** Verification tokens */
export enum TokenKind {
  EmailVerify = 'EmailVerify',
  PasswordRecovery = 'PasswordRecovery',
  RegisterAccount = 'RegisterAccount'
};

export interface ITokenIssueResult {
  id: EntityId,
  value: string
}

export type TokenConsumeResultCode = 'success' | 'already-consumed' | 'not-found' | 'failed' | 'token-expired';
export type TokenConsumeResult = { code: TokenConsumeResultCode, userId?: EntityId };

export interface ITokenLogic {
  issueToken(kind: TokenKind, userId?: EntityId, expirePrevious?: boolean): Promise<ITokenIssueResult>;
  isTokenActive(isDeleted: boolean, attemptsMade: number, createdUtc: Date): 'token-expired' | 'already-consumed' | 'active';
  consumeToken(id: EntityId, value: string): Promise<TokenConsumeResult>;
};

/** Emails */
export interface IEmailParams {
  to: string,
  subject: string,
  title: string,
  preheader?: string,
  token?: {
    id: EntityId,
    value: string
  },
  userId?: EntityId,
  locale: Locale,
  theme: Theme
}

export enum EmailTemplate {
  EmailVerify = 'EmailVerify',
  PasswordRecovery = 'PasswordRecovery',
  RegisterAccount = 'RegisterAccount'
};

export interface IEmailSender {
  sendEmail(kind: EmailTemplate, params: IEmailParams): Promise<void>;
  verifySetup(): Promise<void>;
};

export interface IMailTemplateLogic {
  getTemplateMarkup(kind: EmailTemplate, locale: Locale): Promise<string | undefined>,
  createTemplate(kind: EmailTemplate, markup: ILocalizableValue): Promise<EntityId>
}

/** Client */
export type SimplePropertyType = 'text' | 'email' | 'password';
export type PropertyGridControlButtonType = 'change' | 'apply' | 'cancel' | 'delete' | 'add';

export type ConfirmBoxButton = 'yes' | 'no' | 'cancel';

export type NavBarMode = 'landing' | 'inApp';
export type ButtonKind = 'default' | 'accent' | 'support' | 'icon';
export interface IImageEntitySrc {
  slug: string,
  timestamp?: Timestamp
};

/** Client - entity cache */
export interface IEntityCache {
  set: <TEntityType extends CacheEntityType, TCacheItem extends ({ type: TEntityType } & IEntityCacheItem)>(item: TCacheItem, expireInSeconds: number | undefined) => Promise<void>,
  remove: <TEntityType extends CacheEntityType>(idOrSlug: EntityId | string, type: TEntityType) => Promise<void>,
  get: <TEntityType extends CacheEntityType, TCacheItem extends ({ type: TEntityType } & IEntityCacheItem)>(idsOrSlugs: EntityId[] | string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }) => Promise<TCacheItem[] | undefined>
}

/** Components - option buttons */
export interface IOptionButtonProps {
  ctrlKey: string,
  enabled: boolean,
  isActive?: boolean,
  labelResName: I18nResName,
  subtextResName?: I18nResName,
  subtextResArgs?: any,
  shortIcon: string
}

export interface IOtherOptionsButtonGroupProps extends Omit<IOptionButtonProps, 'isActive' | 'shortIcon' | 'labelResName'> {
  defaultResName: I18nResName,
  selectedResName: I18nResName,
  variants: Omit<IOptionButtonProps, 'subtextResName' | 'subtextResArgs' | 'shortIcon'>[]
}

export interface IOptionButtonGroupProps {
  ctrlKey: string,
  options: IOptionButtonProps[],
  otherOptions?: IOtherOptionsButtonGroupProps,
  activeOptionCtrl?: string
}

/** Components - dropdown lists */
export type DropdownListValue = string | number;
export interface IDropdownListItemProps {
  value: DropdownListValue,
  resName: I18nResName
}
export interface IDropdownListProps {
  ctrlKey: string,
  captionResName: I18nResName,
  persistent: boolean,
  selectedValue?: DropdownListValue | undefined,
  defaultValue?: DropdownListValue | undefined,
  initiallySelectedValue?: DropdownListValue | null | undefined,
  placeholderResName?: I18nResName,
  listContainerClass?: string,
  items: IDropdownListItemProps[]
};

/** Components - travel details */
export type TravelDetailsImageStatus = 'loading' | 'ready' | 'error';
export interface ITravelDetailsTextingData {
  header: ILocalizableValue,
  text: ILocalizableValue,
  price: number
};
export interface ITravelDetailsData {
  cityId: EntityId,
  texting?: ITravelDetailsTextingData | undefined,
  images?: { slug: string, timestamp: Timestamp }[] | undefined
};

/** Components - search lists (with autocomplete) */
export type SearchListItemType = 'destination';
export interface ISearchListItem {
  id: EntityId,
  slug?: string,
  displayName: ILocalizableValue | string
};

/** Components - search offers */
export type SearchOfferKind = 'flights' | 'stays';

export type FilterType = 'range' | 'choice' | 'checklist';
export interface ISearchOffersFilterProps<TValue> {
  filterId: string,
  captionResName: I18nResName,
  type: FilterType,
  currentValue?: TValue
}

export interface ISearchOffersRangeFilterProps extends ISearchOffersFilterProps<number> {
  type: 'range',
  valueRange: {
    min: number,
    max: number
  },
  limitLabelFormatter: (value: number) => string
}

export type SearchOffersFilterVariantId = string;
export interface ISearchOffersFilterVariant {
  id: SearchOffersFilterVariantId,
  labelResName: I18nResName
}

export interface ISearchOffersChoiceFilterProps extends ISearchOffersFilterProps<SearchOffersFilterVariantId> {
  type: 'choice',
  variants: ISearchOffersFilterVariant[]
}

export interface ISearchOffersChecklistFilterProps extends ISearchOffersFilterProps<SearchOffersFilterVariantId[]> {
  type: 'checklist',
  variants: ISearchOffersFilterVariant[]
}

export interface ISearchOffersCommonParams {
  kind: SearchOfferKind
}

export interface ISearchOffersFilterParams {
  filters: (ISearchOffersRangeFilterProps | ISearchOffersChoiceFilterProps | ISearchOffersChecklistFilterProps)[]
}

export interface ISearchFlightOffersMainParams {
  fromCity: ISearchListItem,
  toCity: ISearchListItem,
  tripType: TripType,
  dateFrom: Date,
  dateTo: Date,
  numPassengers: number,
  class: FlightClass
}

export interface ISearchStayOffersMainParams {
  city: ISearchListItem,
  checkIn: Date,
  checkOut: Date,
  numRooms: number,
  numGuests: number
}

export type ISearchFlightOffersParams = ISearchFlightOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'flights' };
export type ISearchStayOffersParams = ISearchStayOffersMainParams & ISearchOffersFilterParams & ISearchOffersCommonParams & { kind: 'stays' };

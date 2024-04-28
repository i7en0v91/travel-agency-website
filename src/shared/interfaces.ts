import { type H3Event } from 'h3';
import { type CSSProperties } from 'vue';
import type { Decimal } from 'decimal.js';
import { type ICitiesSearchQuery } from '../server/dto';
import { type PagePath, type Locale, DefaultUserCoverSlug, DefaultUserAvatarSlug, type Theme } from './constants';
import { type I18nResName } from './i18n';

export type Price = Decimal;
export type DistanceUnitKm = number;

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
export interface IImageEntitySrc {
  slug: string,
  timestamp?: Timestamp
};

export type PaymentMethodType = 'full' | 'part';

export interface ILocalizableValue {
  en: string,
  fr: string,
  ru: string
}

export interface IPagination {
  skip: number,
  take: number
}

export interface ISorting<TFactor> {
  direction: 'asc' | 'desc',
  factor?: TFactor
}

export type OfferKind = 'flights' | 'stays';

export enum FlightClassEnum {
  Economy = 'economy',
  Comfort = 'comfort',
  Business = 'business'
};
export type FlightClass = Lowercase<keyof typeof FlightClassEnum>;
export const AvailableFlightClasses: FlightClass[] = Object.keys(FlightClassEnum).map(x => x.toLowerCase() as FlightClass);

export type TripType = 'oneway' | 'return';
export interface IOffer extends IEditableEntity, ISoftDeleteEntity {
  kind: OfferKind,
  totalPrice: Price,
  dataHash: string,
  isFavourite: boolean
}
export type EntityDataAttrsOnly<TEntity extends IEditableEntity & ISoftDeleteEntity> = Omit<TEntity, keyof IEditableEntity | keyof ISoftDeleteEntity | 'dataHash'> & { id: EntityId };

/**
 * Assets provider
 */
export interface IAppAssetsProvider {
  getAppData(filename: string): Promise<NonNullable<unknown>>;
  getPdfFont(filename: string): Promise<Buffer>;
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

export type SessionValue = string | number | null;
export type SessionValues = Record<string, SessionValue>;
export type SessionId = string;

export type UserSession = { sessionId: SessionId, values: SessionValues };
/**
 * Entity Cache
 */
export enum CacheEntityTypeEnum {
  City = 'City'
};
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
export const ImageAuthRequiredCategories = [ImageCategory.UserCover];
export const ImagePublicSlugs = [DefaultUserCoverSlug, DefaultUserAvatarSlug];

export interface IImageInfo extends IEntity {
  slug: string,
  category: ImageCategory,
  file: IFileInfo,
  stubCssStyle: CSSProperties | undefined,
  invertForDarkTheme: boolean
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
  invertForDarkTheme: boolean | undefined,
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
export type GeoPoint = { lon: number, lat: number };
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
export type ICityShort = Omit<ICity, 'country' | 'utcOffsetMin'>;
export type ICityData = Omit<ICity, 'country' | keyof (IEditableEntity & ISoftDeleteEntity)> & { countryId: EntityId, population: number };
export type ICountryData = Omit<ICountry, keyof (IEditableEntity & ISoftDeleteEntity)>;

export interface IGeoLogic {
  getAllCountries(): Promise<ICountry[]>;
  getAllCities(): Promise<ICityShort[]>;
  createCountry(data: ICountryData): Promise<EntityId>;
  createCity(data: ICityData): Promise<EntityId>;
  getAverageDistance(cityId: EntityId): Promise<DistanceUnitKm>;
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
  imgSlug: string,
  visibleOnWorldMap: boolean,
  cityDisplayName: ILocalizableValue,
  countryDisplayName: ILocalizableValue,
  promoLine: ILocalizableValue,
  geo: GeoPoint,
  numStays: number,
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
  city: ICityShort
}

export interface IPopularCityData {
  cityId: EntityId,
  rating: number,
  promoLineStr: ILocalizableValue,
  travelHeaderStr: ILocalizableValue,
  travelTextStr: ILocalizableValue,
  visibleOnWorldMap: boolean,
  geo?: GeoPoint
}

export interface ICitiesLogic {
  search(query: ICitiesSearchQuery): Promise<ICitySearchItem[]>;
  getPopularCities(): Promise<IPopularCityItem[]>;
  setPopularCityImages(cityId: EntityId, images: { id: EntityId, order: number }[]): Promise<void>;
  getCity(slug: string): Promise<ICity>;
  makeCityPopular(data: IPopularCityData): Promise<void>;
  getTravelDetails(cityId: EntityId): Promise<Omit<ITravelDetails, 'price'>>;
};

/** Airline company logic */
export interface IAirlineCompany extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  logoImage: {
    slug: string,
    timestamp?: Timestamp
  },
  city: Pick<ICity, 'geo'>,
  numReviews: number,
  reviewScore: number
}

export type IAirlineCompanyData = Omit<IAirlineCompany, 'logoImage' | keyof (IEditableEntity & ISoftDeleteEntity)> & { cityId: EntityId, logoImageId: EntityId };
export interface IAirlineCompanyLogic {
  getNearestCompany() : Promise<IAirlineCompany>;
  createAirlineCompany(data: IAirlineCompanyData): Promise<EntityId>;
  getAllAirlineCompanies() : Promise<IAirlineCompany[]>;
}

/** Airplane logic */
export type AirplaneImageKind = 'main' | 'window' | 'cabin' | 'common' | FlightClass;

export interface IAirplaneImage extends IEditableEntity, ISoftDeleteEntity {
  kind: AirplaneImageKind,
  order: number,
  image: {
    slug: string,
    timestamp: Timestamp
  }
};

export interface IAirplane extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  images: EntityDataAttrsOnly<IAirplaneImage>[]
}

export interface IAirplaneData {
  name: ILocalizableValue,
  images: {
    imageId: EntityId,
    kind: AirplaneImageKind,
    order: number
  }[]
};
export interface IAirplaneLogic {
  getAllAirplanes(): Promise<IAirplane[]>;
  createAirplane(data: IAirplaneData): Promise<EntityId>;
};

/** Airport logic */
export interface IAirport extends IEditableEntity, ISoftDeleteEntity {
  name: ILocalizableValue,
  city: EntityDataAttrsOnly<ICity>
  geo: GeoPoint
}

export type IAirportShort = Omit<IAirport, 'city' | 'geo' | Exclude<keyof (IEditableEntity & ISoftDeleteEntity), 'id'>>;
export type IAirportData = Omit<IAirport, 'city' | keyof (IEditableEntity & ISoftDeleteEntity)> & { cityId: EntityId };
export interface IAirportLogic {
  getAirport(id: EntityId): Promise<IAirport>;
  getAllAirportsShort(): Promise<IAirportShort[]>;
  createAirport(data: IAirportData): Promise<EntityId>;
  getAirportsForSearch(citySlugs: string[], addPopular: boolean): Promise<EntityDataAttrsOnly<IAirport>[]>;
};

/** Flights logic */
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

export enum FlightOffersSortFactorEnum {
  Price,
  Score,
  Duration,
  TimeToDeparture,
  Rating
};
export const AvailableFlightOffersSortFactor = Object.keys(FlightOffersSortFactorEnum).map(x => x.toLowerCase());
export type FlightOffersSortFactor = Lowercase<keyof typeof FlightOffersSortFactorEnum>;

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

export interface IFlightsLogic {
  getFlightPromoPrice(cityId: EntityId): Promise<Price>;
  getFlightOffer(id: EntityId, userId: EntityId | 'guest'): Promise<IFlightOffer>;
  searchOffers(filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean): Promise<ISearchFlightOffersResult>;
  getUserFavouriteOffers(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { addDateUtc: Date }>>;
  getUserTickets(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { bookingId: EntityId, bookDateUtc: Date; }>>;
  toggleFavourite(offerId: EntityId, userId: EntityId): Promise<boolean>;
};

/** Stays logic */
export enum StayOffersSortFactorEnum {
  Price = 'price',
  Score = 'score',
  Rating = 'rating'
};

export type StayServiceLevel = 'base' | 'cityView-1' | 'cityView-2' | 'cityView-3';
export type StayDescriptionParagraphType = 'title' | 'main' | 'footer' | 'feature-caption' | 'feature-text';

export const AvailableStayOffersSortFactor = Object.keys(StayOffersSortFactorEnum).map(x => x.toLowerCase());
export type StayOffersSortFactor = Lowercase<keyof typeof StayOffersSortFactorEnum>;

export interface IStayDescription extends IEditableEntity, ISoftDeleteEntity {
  textStr: ILocalizableValue,
  paragraphKind: StayDescriptionParagraphType,
  order: number
}
export type IStayDescriptionData = Omit<IStayDescription, keyof (IEditableEntity & ISoftDeleteEntity)>;

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
export type IStayReviewData = Omit<IStayReview, keyof (IEditableEntity & ISoftDeleteEntity) | 'user'> & { userId: EntityId };

export interface IStayImage extends IEditableEntity, ISoftDeleteEntity {
  image: IImageInfo,
  serviceLevel?: StayServiceLevel,
  order: number
}
export type IStayImageData = Omit<IStayImage, keyof (IEditableEntity & ISoftDeleteEntity) | 'image'> & { imageId: EntityId };
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
export type IStayData = Omit<IStay, keyof (IEditableEntity & ISoftDeleteEntity) | 'description' | 'reviews' | 'images' | 'city'> & {
  cityId: EntityId,
  descriptionData: IStayDescriptionData[],
  reviewsData: IStayReviewData[],
  imagesData: IStayImageData[]
};

export type IStayShort = Omit<IStay, 'description' | 'reviews' | 'images'> & {
  numReviews: number,
  reviewScore: number,
  photo: {
    slug: string,
    timestamp: Timestamp
  }
};

export interface IStayOffer extends IOffer {
  stay: EntityDataAttrsOnly<IStayShort>,
  checkIn: Date,
  checkOut: Date,
  numGuests: number,
  numRooms: number
}

export interface IStayOfferDetails extends Omit<IStayOffer, 'stay'> {
  stay: EntityDataAttrsOnly<Omit<EntityDataAttrsOnly<IStay>, 'images' | 'reviews'> & { images: IStayImageShort[] } & IStayShort>,
  prices: { [SL in StayServiceLevel]: Price }
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

export interface IStaySearchHistory {
  popularCityIds: EntityId[]
}

export interface IStaysLogic {
  calculatePrice(stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Price;
  createStay(data: IStayData): Promise<EntityId>;
  getStayOffer(id: EntityId, userId: EntityId | 'guest'): Promise<IStayOfferDetails>;
  findStay(idOrSlug: EntityId | string): Promise<IStay | undefined>;
  searchOffers(filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean): Promise<ISearchStayOffersResult>;
  getUserFavouriteOffers(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date }>>;
  getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>>;
  toggleFavourite(offerId: EntityId, userId: EntityId): Promise<boolean>;
  createOrUpdateReview(stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId>;
  deleteReview(stayId: EntityId, userId: EntityId): Promise<EntityId | undefined>;
  getStayReviews(stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]>;
};

/**
 *  Booking logic
 */
export interface IBooking extends IEditableEntity, ISoftDeleteEntity {
  bookedUser: {
    id: EntityId,
    avatar: IImageEntitySrc | undefined,
    firstName?: string,
    lastName?: string
  }
}

export interface IOfferBooking<TOffer extends IFlightOffer | IStayOfferDetails> extends IBooking {
  offer: EntityDataAttrsOnly<TOffer>
  serviceLevel: TOffer extends IStayOffer ? StayServiceLevel : undefined
}

export type IOfferBookingData = {
  offerId: EntityId,
  kind: OfferKind,
  bookedUserId: EntityId,
  serviceLevel?: StayServiceLevel
};

export interface IBookingLogic {
  getBooking(id: EntityId): Promise<IOfferBooking<IFlightOffer | IStayOfferDetails>>;
  createBooking(data: IOfferBookingData): Promise<EntityId>;
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

/** Document generation */
export type DocumentCommonParams = {
  theme: Theme,
  locale: Locale
};

export interface IDocumentCreator {
  getBookingTicket(booking: IOfferBooking<IFlightOffer | IStayOfferDetails>, params: DocumentCommonParams, event: H3Event | undefined): Promise<Buffer>;
}

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

export type ActivePageLink = PagePath.Flights | PagePath.Stays | PagePath.Favourites;
export type NavBarMode = 'landing' | 'inApp';
export type ButtonKind = 'default' | 'accent' | 'support' | 'icon';

/** Client - entity cache */
export interface IEntityCache {
  set: <TEntityType extends CacheEntityType, TCacheItem extends ({ type: TEntityType } & IEntityCacheItem)>(item: TCacheItem, expireInSeconds: number | undefined) => Promise<void>,
  remove: <TEntityType extends CacheEntityType>(idOrSlug: EntityId | string, type: TEntityType) => Promise<void>,
  get: <TEntityType extends CacheEntityType, TCacheItem extends ({ type: TEntityType } & IEntityCacheItem)>(idsOrSlugs: EntityId[] | string[], type: TEntityType, fetchOnCacheMiss: false | { expireInSeconds: number | undefined }) => Promise<TCacheItem[] | undefined>
}

/** Components - option buttons */
export type IOptionButtonRole = { role: 'radio'} | { role: 'tab', tabPanelId: string };

export interface IOptionButtonProps {
  ctrlKey: string,
  enabled: boolean,
  isActive?: boolean,
  labelResName: I18nResName,
  subtextResName?: I18nResName | null | undefined,
  subtextResArgs?: any,
  shortIcon?: string,
  tabName?: string,
  role: IOptionButtonRole
}

export type OtherOptionButtonVariant = Omit<IOptionButtonProps, 'subtextResName' | 'subtextResArgs' | 'shortIcon'>;

export interface IOtherOptionsButtonGroupProps extends Omit<IOptionButtonProps, 'isActive' | 'shortIcon' | 'labelResName'> {
  defaultResName: I18nResName,
  selectedResName: I18nResName,
  variants: OtherOptionButtonVariant[]
}

export interface IOptionButtonGroupProps {
  ctrlKey: string,
  options: IOptionButtonProps[],
  otherOptions?: IOtherOptionsButtonGroupProps,
  activeOptionCtrl?: string,
  useAdaptiveButtonWidth?: boolean,
  role: 'radiogroup' | 'tablist'
}

/** Components - dropdown lists */
export type DropdownListValue = string | number;
export interface IDropdownListItemProps {
  value: DropdownListValue,
  resName: I18nResName
}
export interface IDropdownListProps {
  ctrlKey: string,
  captionResName?: I18nResName,
  persistent: boolean,
  selectedValue?: DropdownListValue | undefined,
  defaultValue?: DropdownListValue | undefined,
  initiallySelectedValue?: DropdownListValue | null | undefined,
  placeholderResName?: I18nResName,
  listContainerClass?: string,
  items: IDropdownListItemProps[],
  kind?: 'primary' | 'secondary'
};

/** Components - travel details */
export type TravelDetailsImageStatus = 'loading' | 'ready' | 'error';
export interface ITravelDetailsTextingData {
  header: ILocalizableValue,
  text: ILocalizableValue,
  price: number,
  slug: string
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

// Filters
export type FilterType = 'range' | 'checklist';
export interface ISearchOffersFilterProps<TValue> {
  filterId: string,
  captionResName: I18nResName,
  type: FilterType,
  currentValue?: TValue,
  displayOrder: number
}

export interface ISearchOffersRangeFilterProps extends ISearchOffersFilterProps<{ min: number, max: number }> {
  type: 'range',
  valueRange: {
    min: number,
    max: number
  },
  limitLabelFormatter: 'price' | 'daytime',
  applyNarrowing: (min: number, max: number) => void
}

export type SearchOffersFilterVariantId = string;
export interface ISearchOffersFilterVariant {
  id: SearchOffersFilterVariantId,
  displayText?: I18nResName | ILocalizableValue
}

export interface ISearchOffersChecklistFilterProps extends ISearchOffersFilterProps<SearchOffersFilterVariantId[]> {
  type: 'checklist',
  display: 'list' | 'flow',
  variants: ISearchOffersFilterVariant[],
  applyNarrowing: (variants: ISearchOffersFilterVariant[]) => void
}

export interface ISearchOffersCommonParams {
  kind: OfferKind
}

export interface ISearchOffersFilterParams {
  filters: (ISearchOffersRangeFilterProps | ISearchOffersChecklistFilterProps)[]
}

// Search parameters
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

// Display options
export type FlightOffersDisplayOptionType = FlightOffersSortFactor;

export interface ISearchOffersCommonDisplayOptions {
  totalCount: number
}

export interface ISearchFlightOffersDisplayOption {
  type: FlightOffersDisplayOptionType,
  price?: Price,
  duration?: number, // flights duration in minutes
  isActive: boolean
}
export interface ISearchFlightOffersDisplayOptions extends ISearchOffersCommonDisplayOptions {
  primaryOptions: ISearchFlightOffersDisplayOption[],
  additionalSorting: FlightOffersDisplayOptionType
}
export interface ISearchStayOffersDisplayOptions extends ISearchOffersCommonDisplayOptions {
  sorting: StayOffersSortFactor
}

/** Components - maps */
export interface IMapControlProps {
  ctrlKey: string,
  origin: GeoPoint,
  cssClass?: string,
  webUrl?: string
};

/** Components - review editor */
export type ReviewEditorButtonType = 'bold' | 'italic' | 'strikethrough' | 'underline' | 'bulletList' | 'orderedList' | 'blockquote' | 'undo' | 'redo';

/** Components - booking ticket */
export interface IBookingTicketGeneralProps {
  ctrlKey: string,
  avatar?: IImageEntitySrc | null | undefined,
  texting?: {
    name: string,
    sub?: I18nResName | null | undefined
  },
  classResName?: I18nResName
}

export interface IBookingTicketDatesItemProps {
  ctrlKey: string,
  label?: string | undefined,
  sub?: ILocalizableValue | I18nResName | undefined
}

export interface IBookingTicketDatesProps {
  ctrlKey: string,
  from?: IBookingTicketDatesItemProps | undefined,
  to?: IBookingTicketDatesItemProps | undefined,
  offerKind?: OfferKind
}

export interface IBookingTicketDetailsItemProps {
  ctrlKey: string,
  icon: string,
  caption: I18nResName,
  text?: I18nResName | undefined
}

export interface IBookingTicketDetailsProps {
  ctrlKey: string,
  items?: IBookingTicketDetailsItemProps[]
}

export interface IBookingTicketStayTitleProps {
  ctrlKey: string,
  stayName: ILocalizableValue,
  cityName: ILocalizableValue
}

export interface IBookingTicketFlightGfxProps {
  ctrlKey: string,
  userName: string
}

export interface IBookingTicketProps {
  ctrlKey: string,
  offerKind?: OfferKind,
  generalInfo?: IBookingTicketGeneralProps | undefined,
  dates?: Omit<IBookingTicketDatesProps, 'offerKind'> | undefined,
  details?: IBookingTicketDetailsProps | undefined,
  titleOrGfx?: IBookingTicketFlightGfxProps | IBookingTicketStayTitleProps | undefined
}

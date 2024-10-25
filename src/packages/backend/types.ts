import type { QueryInternalRequestParam, QueryPageTimestampParam, QueryPagePreviewModeParam, EmailTemplateEnum, TokenKind, AuthProvider, AppPage, ImageCategory, PageCacheVaryOptions, ISearchStayOffersResult, ISearchFlightOffersResult, UninitializedPageTimestamp, IOfferBookingData, IUserMinimalInfo, IUserProfileInfo, IStayOffersFilterParams, IFlightOffersFilterParams, DocumentCommonParams, IFileInfo, IImageInfo, IFileData, IImageData, IAirplaneData, IStayData, ICommonServicesLocator, StayOffersSortFactor, FlightOffersSortFactor, IBooking, IStayOfferDetails, IStayOffer, IStayShort, IStay, IStayReview, IFlightOffer, IAirplane, EntityDataAttrsOnly, IAirport, IAirlineCompany, ICountry, ICity, StayServiceLevel, IPagination, ISorting, Price, GeoPoint, ReviewSummary, IImageCategoryInfo, CacheEntityType, GetEntityCacheItem, DistanceUnitKm, PreviewMode, EntityId, IEditableEntity, ISoftDeleteEntity, ILocalizableValue, Timestamp, PreviewModeParamEnabledValue, EntityChangeSubscribersOrder, Locale, Theme } from '@golobe-demo/shared';
import { type H3Event } from 'h3';
import { type IServerI18n } from './common-services/i18n';
import { type IChangeDependencyTracker, type EntityModel } from './common-services/change-dependency-tracker';
import { type IHtmlPageModelMetadata }  from './common-services/html-page-model-metadata';
import { type IAcsysClientProvider } from './acsys/client/interfaces';

export enum EmptyParams {};
export { type IServerI18n } from './common-services/i18n';
export { type IHtmlPageModelMetadata }  from './common-services/html-page-model-metadata';
export { type IChangeDependencyTracker } from './common-services/change-dependency-tracker';

export interface IConcurrentlyModifyingEntity {
  version: number;
}
export type RegisterVerificationFlow = 'verified' | 'send-email';

export interface IInitializableOnStartup {
  initialize(): Promise<void>;
}

/**
 * Assets provider
 */
export interface IAppAssetsProvider {
  getAppData(filename: string): Promise<NonNullable<unknown>>;
  getPdfFont(filename: string): Promise<Buffer>;
}

/** Og Image */
export interface IOgImageContext {
  locale: Locale
}

/** Preview mode */
export interface IPreviewModeContext {
  mode: PreviewMode
}

/**
 * Callback notifications on entity changes
 */
export type EntityChangeNotificationSubscriberId = string;
export type EntityChangeNotificationSubscriptionOptions = {
  target: { entity: EntityModel, ids: EntityId[] | 'all' }[] | 'all',
  order: EntityChangeSubscribersOrder
};
export type EntityChangeNotificationCallbackArgs = {
  target: {
    entity: EntityModel,
    ids: EntityId[]
  }[] | 'too-much'
};
export type EntityChangeNotificationCallback = (subscriberId: EntityChangeNotificationSubscriberId, args: EntityChangeNotificationCallbackArgs) => Promise<void>;
export interface IEntityChangeNotificationTask extends IInitializableOnStartup {
  subscribeForChanges(options: EntityChangeNotificationSubscriptionOptions, callback: EntityChangeNotificationCallback): EntityChangeNotificationSubscriberId;
  unsubscribeFromChanges(subscriberId: EntityChangeNotificationSubscriberId): void;
}

/**
 * Url & query variants for cacheable pages
 */
export type UrlArgValue = string | number | boolean;
export type EmptyParamListOptions = Record<keyof typeof EmptyParams, CachePageParamOptions>;

export declare type BoolTrue = true;
export type BoolFalse = false;
export type VariantsRangeValue = string[];
export type AnyParamValue = 'anyValue';

export declare type CachePageParamOptions = {
  isRequired: BoolTrue | BoolFalse,
  isSystem: BoolTrue | BoolFalse,
  acceptableValues: VariantsRangeValue | AnyParamValue,
  defaultValue?: string | undefined
};

declare type UnwrapParamValueType<TParamDesc> = TParamDesc extends Array<infer TArrItem> ? TArrItem : (TParamDesc extends 'anyValue' ? string : never);
export declare type GetCachePageParamListObj<
  TParamListOptions extends Record<any, CachePageParamOptions> = any
> = { [P in keyof TParamListOptions]: (TParamListOptions[P]['isRequired'] extends BoolTrue ? UnwrapParamValueType<TParamListOptions[P]['acceptableValues']> : (UnwrapParamValueType<TParamListOptions[P]['acceptableValues']> | null)) };

export type InternalSystemParamOptions = { [P in typeof QueryInternalRequestParam]: { isRequired: BoolFalse, isSystem: BoolTrue, acceptableValues: ('0' | '1')[] } };
export type TimestampSystemParamOptions = { [P in typeof QueryPageTimestampParam]: { isRequired: BoolTrue, isSystem: BoolTrue, acceptableValues: AnyParamValue } };
export type PreviewSystemParamOptions = { [P in typeof QueryPagePreviewModeParam]: { isRequired: BoolFalse, isSystem: BoolTrue, acceptableValues: (typeof PreviewModeParamEnabledValue | 'false')[] } };
export type GetParamsOptionsKind = 'cache' | 'allowed' | 'system' | 'all';

export declare type SystemQueryParamsListOptions<TVaryMode extends PageCacheVaryOptions> = (TVaryMode extends 'UseEntityChangeTimestamp' ? TimestampSystemParamOptions : unknown) & InternalSystemParamOptions & PreviewSystemParamOptions;
declare type GetSystemQueryParamsListObj<TVaryMode extends PageCacheVaryOptions> = GetCachePageParamListObj<SystemQueryParamsListOptions<TVaryMode>>;

export declare type NormalizedQueryResult<
  TVaryMode extends PageCacheVaryOptions, 
  TAddAllowedParamsOptions extends Record<any, CachePageParamOptions>,
  TCacheParamsOptions extends Record<any, CachePageParamOptions>
> = GetSystemQueryParamsListObj<TVaryMode> &
    GetCachePageParamListObj<TAddAllowedParamsOptions> &
    GetCachePageParamListObj<TCacheParamsOptions>;
declare type CacheKeyObjCommon<TVaryMode extends PageCacheVaryOptions> = GetSystemQueryParamsListObj<TVaryMode>;
declare type CacheKeyObj<TVaryMode extends PageCacheVaryOptions, TCacheParamsOptions extends Record<any, CachePageParamOptions>> = GetCachePageParamListObj<TCacheParamsOptions> & CacheKeyObjCommon<TVaryMode>;

export type GetParamsOptionsResult<
  TKind extends GetParamsOptionsKind,
  TVaryMode extends PageCacheVaryOptions, 
  TAddAllowedParamsOptions extends Record<any, CachePageParamOptions>,
  TCacheParamsOptions extends Record<any, CachePageParamOptions>> = 
    TKind extends 'allowed' ? TAddAllowedParamsOptions :
    TKind extends 'cache' ? TCacheParamsOptions : 
    TKind extends 'system' ? SystemQueryParamsListOptions<TVaryMode> : 
    (TAddAllowedParamsOptions & TCacheParamsOptions & SystemQueryParamsListOptions<TVaryMode>);
export interface CacheablePageParamsBase<
    TVaryMode extends PageCacheVaryOptions = PageCacheVaryOptions, 
    TAddAllowedParamsOptions extends Record<any, CachePageParamOptions> = Record<any, CachePageParamOptions>,
    TCacheParamsOptions extends Record<any, CachePageParamOptions> = Record<any, CachePageParamOptions>
> {
  /** Cache vary mode used by this page */
  getCacheVaryOptions(): TVaryMode;
  /** Options for query parameters by category. If {@param kind} = "all" passed, then function returns all parameters configured for page query*/
  getParamsOptions<TKind extends GetParamsOptionsKind>(kind: TKind): GetParamsOptionsResult<TKind, TVaryMode, TAddAllowedParamsOptions, TCacheParamsOptions>;
  /** 
   * Returns normalized and filtered according to {@link getAllowedQueryParams} url query object 
   * */
  getNormalizedUrlQuery(): NormalizedQueryResult<TVaryMode, TAddAllowedParamsOptions, TCacheParamsOptions>;
  /** Returns object which fields-values are used to compute page cache key (excluding locale, which is taken from url and handled separately) */
  getCacheKeyObject(): TVaryMode extends 'UseEntityChangeTimestamp' ? never : CacheKeyObj<TVaryMode, TCacheParamsOptions>
}

export type GetCachePageParamsVaryMode<TCachePpageParams> = TCachePpageParams extends CacheablePageParamsBase<infer TVaryMode> ? TVaryMode : never;

declare type CacheablePageParamsInlinedAsProps<
  TVaryMode extends PageCacheVaryOptions, 
  TAddAllowedParamsOptions extends Record<any, CachePageParamOptions>,
  TCacheParamsOptions extends Record<any, CachePageParamOptions>,
> = CacheablePageParamsBase<TVaryMode, TAddAllowedParamsOptions, TCacheParamsOptions> & 
    GetSystemQueryParamsListObj<TVaryMode> &
    GetCachePageParamListObj<TAddAllowedParamsOptions> & 
    GetCachePageParamListObj<TCacheParamsOptions>;

export declare type CacheParamsVariedByValueRanges<
  TAllowedAndCacheParamsOptions extends Record<any, CachePageParamOptions>
> = CacheablePageParamsInlinedAsProps<'PathAndPredefinedVariants', EmptyParamListOptions, TAllowedAndCacheParamsOptions>;
export declare type CacheParamsVariedBySystemParamsOnly<
  TQueryParamsOptions extends Record<any, CachePageParamOptions>
> = CacheablePageParamsInlinedAsProps<'VaryByIdAndSystemParamsOnly', TQueryParamsOptions, EmptyParamListOptions>;
export declare type CacheByPageTimestamp<
  TQueryParamsOptions extends Record<any, CachePageParamOptions>
> = CacheablePageParamsInlinedAsProps<'UseEntityChangeTimestamp', TQueryParamsOptions, EmptyParamListOptions>;

/**
 * Nitro rendered page's html & og-image cache cleaner
 */
export interface IHtmlPageCacheCleaner extends IInitializableOnStartup {

  invalidatePage(mode: 'schedule' | 'immediate', page: AppPage, id: EntityId | undefined): Promise<void>;
  /**
   * Perform's additional instant "out-of-schedule" ({@link IAppConfig.caching.invalidation.intervalSeconds}) cache reset for pages modified since last cleanup.
   * Joins currently executing cleanup task if any
   */
  performCleanup(): Promise<void>;
  /**
   * Removes every page's html from cache
   */
  purge(): Promise<void>;
  /**
   * Returns actual page timestamp.
   * If page haven't been cached & updated and doens't have stored timestamp - returns 0.
   * If page doesn't use {@link QueryPageTimestampParam} timestamp param for caching than function returns configured cache vary mode
   */
  getPageTimestamp(page: AppPage, id: EntityId | undefined, initializeIfNotExists: boolean): Promise<Date | UninitializedPageTimestamp | (Exclude<PageCacheVaryOptions, 'UseEntityChangeTimestamp'>)>;
}

export declare enum ParseQueryCacheResultEnum {
  SUCCESS,
  REQUIRED_PARAM_MISSED,
  VALUE_NOT_ALLOWED,
  REDUNDANT_PARAM
}

export declare type ParseQueryCacheSuccess<
  TCacheQuery extends CacheablePageParamsBase = CacheablePageParamsBase
> = { result: 'SUCCESS', parsedQuery: TCacheQuery };
export declare type ParseQueryCacheRequiredParamMissed = { result: 'REQUIRED_PARAM_MISSED', missedParamNames: string[], providedDefaults: ReadonlyMap<string, string> };
export declare type ParseQueryCacheValueNotAllowed = { result: 'VALUE_NOT_ALLOWED', paramName: string, invalidValue: string };
export declare type ParseQueryCacheRedundantParam = { result: 'REDUNDANT_PARAM', redundantParamNames: string[] };
export declare type ParseQueryCacheError = ParseQueryCacheRequiredParamMissed | ParseQueryCacheValueNotAllowed | ParseQueryCacheRedundantParam;
export declare type ParseQueryCacheResult<
  TCacheQuery extends CacheablePageParamsBase = CacheablePageParamsBase
> = ParseQueryCacheSuccess<TCacheQuery> | ParseQueryCacheError;

/**
 * Entity Cache
 */
export interface IEntityCacheLogic {
  get: <TEntityType extends CacheEntityType>(searchIds: EntityId[], searchSlugs: string[], type: TEntityType, previewMode: PreviewMode) => Promise<GetEntityCacheItem<TEntityType>[]>
}

/**
 * Files
 */
export interface IFileLogic {
  findFiles(ids: EntityId[], event?: H3Event): Promise<IFileInfo[]>;
  createFile(data: IFileData, userId: EntityId | undefined): Promise<{ id: EntityId, timestamp: Timestamp }>;
  updateFile(id: EntityId, data: IFileData, userId: EntityId | undefined, recoverDeleted: boolean | undefined, event: H3Event): Promise<{ id: EntityId, timestamp: Timestamp }>;
  getFileData(id: EntityId, event: H3Event): Promise<IFileInfo & { bytes: Buffer }>;
}

/**
 * Images
 */
export type IImageFileInfoUnresolved = Omit<IImageInfo, 'file'> & { fileId: EntityId };

export type ImageCheckAccessResult = 'granted' | 'denied' | 'unprotected';
export type ImageBytesOptions = number | 'leave-as-is';
export interface IImageBytes {
  bytes: Buffer,
  mimeType: string,
  modifiedUtc: Date
}

export interface IImageBytesProvider extends IInitializableOnStartup {
  getImageBytes(id: EntityId | undefined, slug: string | undefined, category: ImageCategory, bytesOptions: ImageBytesOptions, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined>;
  clearImageCache(idOrSlug: EntityId | string, category: ImageCategory): Promise<void>;
}
export interface IImageLogic {
  checkAccess(id: EntityId | undefined, slug: string | undefined, category: ImageCategory, previewMode: PreviewMode, userId?: EntityId): Promise<ImageCheckAccessResult | undefined>;
  findImage(id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageInfo | undefined>;
  getImagesByIds(ids: EntityId[], previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]>;
  getImageBytes(id: EntityId | undefined, slug: string | undefined, category: ImageCategory, event: H3Event, previewMode: PreviewMode): Promise<IImageBytes | undefined>;
  createImage(data: IImageData, userId: EntityId | undefined, previewMode: PreviewMode): Promise<{ id: EntityId, timestamp: Timestamp }>;
  updateImage(imageId: EntityId, data: IImageData, imageFileId: EntityId | undefined, userId: EntityId | undefined, event: H3Event, previewMode: PreviewMode): Promise<{ timestamp: Timestamp }>;
  getAllImagesByCategory(category: ImageCategory, skipAuthChecks: boolean, previewMode: PreviewMode): Promise<IImageFileInfoUnresolved[]>;
  deleteImage(id: EntityId): Promise<void>;
  resolveImageFiles(imageInfos: IImageFileInfoUnresolved[], event: H3Event, previewMode: PreviewMode): Promise<IImageInfo[]>;
}

export interface IImageCategoryLogic extends IInitializableOnStartup {
  getImageCategoryInfos(allowCachedValue: boolean): Promise<ReadonlyMap<ImageCategory, IImageCategoryInfo>>;
  findCategory(category: ImageCategory | EntityId): Promise<IImageCategoryInfo | undefined>;
  createCategory(type: ImageCategory, width: number, height: number): Promise<EntityId>;
}

/**
 * AuthForm Images
 */
export interface IAuthFormImageInfo extends IEditableEntity, ISoftDeleteEntity {
  order: number,
  image: {
    slug: string,
    timestamp: Timestamp
  }
}
export type AuthFormImageData = IFileData & { slug: string };

export interface IAuthFormImageLogic {
  createImage(imageData: AuthFormImageData | EntityId, order: number, previewMode: PreviewMode): Promise<EntityId>;
  getAllImages(event: H3Event, previewMode: PreviewMode): Promise<IAuthFormImageInfo[]>;
  deleteImage(id: EntityId): Promise<void>;
}


/**
 * User Profile
 */

export interface IUserProfileFileInfoUnresolved extends IUserMinimalInfo {
  cover?: IImageFileInfoUnresolved,
  avatar?: IImageFileInfoUnresolved
}

export interface UserResponseDataSet {
  minimal: IUserMinimalInfo,
  profile: IUserProfileInfo
}
export type RegisterUserByEmailResponse = EntityId | 'already-exists' | 'insecure-password';
export type PasswordRecoveryResult = 'success' | 'user-not-found' | 'email-not-verified';
export type UpdateUserAccountResult = 'success' | 'email-already-exists' | 'deleting-last-email' | 'email-autoverified';
export interface IUserLogic {
  getUser<TDataSet extends keyof UserResponseDataSet>(userId: EntityId, dataSet: TDataSet, event: H3Event): Promise<UserResponseDataSet[TDataSet] | undefined>;
  findUser<TDataSet extends keyof UserResponseDataSet>(authProvider: AuthProvider, providerIdentity: string, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined>;
  findUserByEmail<TDataSet extends keyof UserResponseDataSet>(email: string, mustBeVerified: boolean, dataSet: TDataSet): Promise<UserResponseDataSet[TDataSet] | undefined>
  registerUserByEmail(email: string, password: string, verification: RegisterVerificationFlow, firstName: string | undefined, lastName: string | undefined, theme: Theme | undefined, locale: Locale | undefined) : Promise<RegisterUserByEmailResponse>;
  updateUserAccount(userId: EntityId, firstName: string | undefined, lastName: string | undefined, password: string | undefined, emails: string[] | undefined, theme: Theme | undefined, locale: Locale | undefined) : Promise<UpdateUserAccountResult>;
  ensureOAuthUser(authProvider: AuthProvider, providerIdentity: string, firstName?: string, lastName?: string, email?: string, emailVerified?: boolean): Promise<IUserProfileInfo>;
  verifyUserPassword(email: string, password: string): Promise<IUserMinimalInfo | undefined>;
  recoverUserPassword(email: string, theme: Theme | undefined, locale: Locale | undefined): Promise<PasswordRecoveryResult>;
  setUserPassword(userId: EntityId, password: string): Promise<void>;
  uploadUserImage(userId: EntityId, category: ImageCategory, bytes: Buffer, mimeType: string, fileName: string | undefined, event: H3Event): Promise<{ id: EntityId, slug: string, timestamp: Timestamp }>;
  deleteUser(userId: EntityId): Promise<void>;
}

/**
 * Geo logic
 */
export type ICityShort = Omit<ICity, 'country' | 'utcOffsetMin'>;
export type ICityData = Omit<ICity, 'country' | keyof (IEditableEntity & ISoftDeleteEntity)> & { countryId: EntityId, population: number };
export type ICountryData = Omit<ICountry, keyof (IEditableEntity & ISoftDeleteEntity)>;

export interface IGeoLogic {
  getAllCountries(): Promise<ICountry[]>;
  getAllCities(previewMode: PreviewMode): Promise<ICityShort[]>;
  createCountry(data: ICountryData): Promise<EntityId>;
  createCity(data: ICityData, previewMode: PreviewMode): Promise<EntityId>;
  getAverageDistance(cityId: EntityId, allowCachedValue: boolean, previewMode: PreviewMode): Promise<DistanceUnitKm>;
  deleteCountry(countryId: EntityId): Promise<void>;
}

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

export type CitiesSearchParams = {
  locale: Locale,
  size: number,
  searchTerm?: string,
  includeCountry?: boolean
};

export interface ICitiesLogic {
  search(params: CitiesSearchParams): Promise<ICitySearchItem[]>;
  getPopularCities(previewMode: PreviewMode): Promise<IPopularCityItem[]>;
  setPopularCityImages(cityId: EntityId, images: { id: EntityId, order: number }[], previewMode: PreviewMode): Promise<void>;
  getCity(slug: string, previewMode: PreviewMode): Promise<ICity>;
  makeCityPopular(data: IPopularCityData, previewMode: PreviewMode): Promise<void>;
  getTravelDetails(cityId: EntityId, previewMode: PreviewMode): Promise<Omit<ITravelDetails, 'price'>>;
  deleteCity(cityId: EntityId): Promise<void>;
}

/** Airline company logic */
export type IAirlineCompanyData = Omit<IAirlineCompany, 'logoImage' | keyof (IEditableEntity & ISoftDeleteEntity)> & { cityId: EntityId, logoImageId: EntityId };
export interface IAirlineCompanyLogic extends IInitializableOnStartup {
  getNearestCompany(allowCachedValue: boolean) : Promise<IAirlineCompany>;
  createAirlineCompany(data: IAirlineCompanyData, previewMode: PreviewMode): Promise<EntityId>;
  getAllAirlineCompanies(allowCachedValue: boolean, previewMode: PreviewMode) : Promise<IAirlineCompany[]>;
  deleteCompany(id: EntityId): Promise<void>;
}

/** Airplane logic */
export interface IAirplaneLogic extends IInitializableOnStartup {
  getAllAirplanes(allowCachedValue: boolean, previewMode: PreviewMode): Promise<IAirplane[]>;
  createAirplane(data: IAirplaneData, previewMode: PreviewMode): Promise<EntityId>;
  deleteAirplane(id: EntityId): Promise<void>;
}

/** Airport logic */
export type IAirportShort = Omit<IAirport, 'city' | 'geo' | Exclude<keyof (IEditableEntity & ISoftDeleteEntity), 'id'>>;
export type IAirportData = Omit<IAirport, 'city' | keyof (IEditableEntity & ISoftDeleteEntity)> & { cityId: EntityId };
export interface IAirportLogic {
  getAirport(id: EntityId, previewMode: PreviewMode): Promise<IAirport>;
  getAllAirportsShort(previewMode: PreviewMode): Promise<IAirportShort[]>;
  createAirport(data: IAirportData, previewMode: PreviewMode): Promise<EntityId>;
  getAirportsForSearch(citySlugs: string[], addPopular: boolean, previewMode: PreviewMode): Promise<EntityDataAttrsOnly<IAirport>[]>;
  deleteAirport(id: EntityId): Promise<void>;
}

/** Flights logic */
export interface IFlightsLogic {
  getFlightPromoPrice(cityId: EntityId, previewMode: boolean): Promise<Price>;
  getFlightOffer(id: EntityId, userId: EntityId | 'guest', previewMode: boolean): Promise<IFlightOffer>;
  searchOffers(filter: IFlightOffersFilterParams, userId: EntityId | 'guest', primarySorting: ISorting<FlightOffersSortFactor>, secondarySorting: ISorting<FlightOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, topOffersStats: boolean, previewMode: boolean): Promise<ISearchFlightOffersResult>;
  getUserFavouriteOffers(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { addDateUtc: Date }>>;
  getUserTickets(userId: EntityId): Promise<ISearchFlightOffersResult<IFlightOffer & { bookingId: EntityId, bookDateUtc: Date; }>>;
  toggleFavourite(offerId: EntityId, userId: EntityId): Promise<boolean>;
  deleteFlightOffer(id: EntityId): Promise<void>;
  deleteFlight(Id: EntityId): Promise<void>;
}

/** Stays logic */
export interface IStaysLogic {
  getAllStays(previewMode: PreviewMode): Promise<IStayShort[]>;
  calculatePrice(stay: EntityDataAttrsOnly<IStayShort>, serviceLevel: StayServiceLevel): Price;
  createStay(data: IStayData, previewMode: PreviewMode): Promise<EntityId>;
  getStayOffer(id: EntityId, userId: EntityId | 'guest', previewMode: PreviewMode): Promise<IStayOfferDetails>;
  findStay(idOrSlug: EntityId | string, previewMode: PreviewMode): Promise<IStay | undefined>;
  searchOffers(filter: IStayOffersFilterParams, userId: EntityId | 'guest', sorting: ISorting<StayOffersSortFactor>, pagination: IPagination, narrowFilterParams: boolean, previewMode: PreviewMode, availableStays?: (IStayShort & { reviewSummary: ReviewSummary })[] | undefined): Promise<ISearchStayOffersResult>;
  getUserFavouriteOffers(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { addDateUtc: Date }>>;
  getUserTickets(userId: EntityId): Promise<ISearchStayOffersResult<IStayOffer & { bookingId: EntityId, bookDateUtc: Date; }>>;
  toggleFavourite(offerId: EntityId, userId: EntityId): Promise<boolean>;
  createOrUpdateReview(stayId: EntityId, textOrHtml: string, score: number, userId: EntityId): Promise<EntityId>;
  deleteReview(stayId: EntityId, userId: EntityId): Promise<EntityId | undefined>;
  getStayReviews(stayId: EntityId): Promise<EntityDataAttrsOnly<IStayReview>[]>;
  deleteStayOffer(id: EntityId): Promise<void>;
  deleteStay(stayId: EntityId): Promise<void>;
}

/**
 *  Booking logic
 */
export interface IOfferBooking<TOffer extends IFlightOffer | IStayOfferDetails> extends IBooking {
  offer: EntityDataAttrsOnly<TOffer>
  serviceLevel: TOffer extends IStayOffer ? StayServiceLevel : undefined
}

export interface IBookingLogic {
  getBooking(id: EntityId): Promise<IOfferBooking<IFlightOffer | IStayOfferDetails>>;
  createBooking(data: IOfferBookingData): Promise<EntityId>;
  deleteBooking(id: EntityId): Promise<void>;
}

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
  getReviews(previewMode: PreviewMode): Promise<ICompanyReview[]>;
  createReview(data: CompanyReviewData, previewMode: PreviewMode): Promise<EntityId>;
  deleteReview(entityId: EntityId): Promise<void>;
}

/** Verification tokens */
export interface ITokenIssueResult {
  id: EntityId,
  value: string
}

export type TokenConsumeResultCode = 'success' | 'already-consumed' | 'not-found' | 'failed' | 'token-expired';
export type TokenConsumeResult = { code: TokenConsumeResultCode, userId?: EntityId };

export interface ITokenLogic {
  issueToken(kind: TokenKind, userId?: EntityId, expirePrevious?: boolean): Promise<ITokenIssueResult>;
  consumeToken(id: EntityId, value: string): Promise<TokenConsumeResult>;
  deleteToken(id: EntityId): Promise<void>;
}

/** Document generation */
export interface IDocumentCreator {
  getBookingTicket(booking: IOfferBooking<IFlightOffer | IStayOfferDetails>, params: DocumentCommonParams, imageDownloadFn: (url: string, query: any) => Promise<Buffer | undefined>, event: H3Event | undefined): Promise<Buffer>;
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

export interface IEmailSender extends IInitializableOnStartup {
  sendEmail(kind: EmailTemplateEnum, template: string, params: IEmailParams): Promise<void>;
}

export interface IMailTemplateLogic {
  getTemplateMarkup(kind: EmailTemplateEnum, locale: Locale, previewMode: PreviewMode): Promise<string | undefined>;
  createTemplate(kind: EmailTemplateEnum, markup: ILocalizableValue, previewMode: PreviewMode): Promise<EntityId>;
  deleteTemplate(id: EntityId): Promise<void>;
}

export interface IServerServicesLocator extends ICommonServicesLocator {
  getAssetsProvider(): IAppAssetsProvider,
  getHtmlPageCacheCleaner() : IHtmlPageCacheCleaner,
  getUserLogic(): IUserLogic,
  getImageBytesProvider(): IImageBytesProvider,
  getImageLogic(): IImageLogic,
  getImageCategoryLogic(): IImageCategoryLogic,
  getAuthFormImageLogic(): IAuthFormImageLogic,
  getEmailSender(): IEmailSender,
  getMailTemplateLogic(): IMailTemplateLogic,
  getTokenLogic(): ITokenLogic,
  getServerI18n(): IServerI18n,
  getEntityCacheLogic(): IEntityCacheLogic,
  getGeoLogic(): IGeoLogic,
  getAirplaneLogic(): IAirplaneLogic,
  getAirportLogic(): IAirportLogic,
  getFlightsLogic(): IFlightsLogic,
  getStaysLogic(): IStaysLogic,
  getAirlineCompanyLogic(): IAirlineCompanyLogic,
  getCitiesLogic(): ICitiesLogic,
  getCompanyReviewsLogic(): ICompanyReviewsLogic,
  getBookingLogic(): IBookingLogic,
  getDocumentCreator(): IDocumentCreator,
  getPageModelMetadata(): IHtmlPageModelMetadata,
  getChangeDependencyTracker(): IChangeDependencyTracker,
  getEntityChangeNotifications(): IEntityChangeNotificationTask,
  getDataSeedingLogic(): IDataSeedingLogic
}

export interface IAcsysServerServicesLocator extends IServerServicesLocator {
  getAcsysClientProvider(): IAcsysClientProvider
}

export type InitialDataSeedingStatus = 'required' | 'running' | 'completed';
export interface IDataSeedingLogic {
  seed(event: H3Event): Promise<void>;
  getInitialSeedingStatus() : Promise<InitialDataSeedingStatus>;
}
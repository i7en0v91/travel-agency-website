import type { EntityId } from './interfaces';

export enum LogLevelEnum {
  'debug' = 10,
  'verbose' = 20,
  'info' = 30,
  'warn' = 40,
  'error' = 50,
  'never' = 100
}
export type LogLevel = keyof typeof LogLevelEnum;
export const LogAlwaysLevel = 'always';

export enum CmsType {
  acsys = 'acsys'
}

export enum UserNotificationLevel {
  INFO,
  WARN,
  ERROR
}

export enum ThemeEnum {
  LIGHT = 'light',
  DARK = 'dark'
}
export const AvailableThemeCodes = Object.keys(ThemeEnum).map(x => x.toLowerCase());
export type Theme = Lowercase<keyof typeof ThemeEnum>;
export const DefaultTheme: Theme = 'light';

export enum LocaleEnum {
  EN = 'en',
  RU = 'ru',
  FR = 'fr'
}
export const DefaultLocale = 'en';
export const AvailableLocaleCodes = Object.keys(LocaleEnum).map(x => x.toLowerCase() as Locale);
export type Locale = Lowercase<keyof typeof LocaleEnum>;

export const AdminUserEmail = 'admin@golobe.demo';

export const DataKeyImageSrcSizes = 'ImageSrcSizes';
export const DataKeyEntityCacheItems = 'EntityCacheItems';
export const DataKeyWorldMapData = 'WorldMapData';
export const DataKeySearchFlightOffers = 'SearchFlightOffers';
export const DataKeySearchStayOffers = 'SearchStayOffers';
export const DataKeyImageDetails = (ctrlKey: string, slug: string) => `ImageDetails-${ctrlKey}-${slug}`;

export const SessionThemeKey = 'theme';
export const SessionLocaleKey = 'locale';
export const SessionStaySearchHistory = 'stay-search-history';

export const HeaderSetCookie = 'set-cookie';
export const HeaderCookies = 'cookie';
export const HeaderAuthorization = 'Authorization';
export const HeaderContentType = 'Content-Type';
export const HeaderHost = 'Host';
export const HeaderUserAgent = 'user-agent';
export const HeaderCacheControl = 'cache-control';
export const HeaderEtag = 'etag';
export const HeaderDate = 'date';
export const HeaderLastModified = 'last-modified';
export const HeaderLocation = 'location';
export const HeaderAppVersion = 'x-golobe-app-version';
export const HeaderServerStartup = 'x-golobe-server-startup';

export const QueryInternalRequestParam = 'i'; // ...&i=1...
export const QueryPageTimestampParam = 't'; // ...&t=1717585420729...
export const QueryPagePreviewModeParam = 'drafts'; // ...&drafts=true...
export const QueryDraftRequestPathParam = 'reqPath';

export const PreviewModeParamEnabledValue = 'true';

export const CookieAuthSessionToken = 'next-auth.session-token';
export const CookieAuthCallbackUrl = 'next-auth.callback-url';
export const CookieAuthCsrfToken = 'next-auth.csrf-token';
export const CookieI18nLocale = 'i18n_redirected';
export const CookieSession = 'golobe.session';
export const CookiePolicyConsent = 'golobe.cookie_and_privacy_policies';
export const CookieLoginOrigin = 'golobe.login_origin';

/**
 * KB: Relative ordering is important, change carefully according to service's mutual dependencies
 */
export enum EntityChangeSubscribersOrder {
  ImageCategoryLogic = 5,
  ImageBytesProvider = 7,
  AirlineCompanyLogic = 9,
  AirplaneLogic = 10,
  HtmlPageCleaner = 100
};

export const ApiEndpointPrefix = 'api';
export const ApiAppEndpointPrefix = `${ApiEndpointPrefix}/app`;
export const ApiEndpointLogging = `${ApiAppEndpointPrefix}/log`;
export const ApiEndpointTestingInvlidatePage = `${ApiAppEndpointPrefix}/testing/invalidate-page`;
export const ApiEndpointTestingPageCacheAction = `${ApiAppEndpointPrefix}/testing/test-page-cache`;
export const ApiEndpointTestingCacheCleanup = `${ApiAppEndpointPrefix}/testing/cache-cleanup`;
export const ApiEndpointPurgeCache = `${ApiAppEndpointPrefix}/purge-cache`;
export const ApiEndpointAuthentication = `${ApiEndpointPrefix}/auth`;
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

export const MaxStayReviewLength = 8000;

export const LoadingStubFileName = 'db-seeding-loading-stub.html';

export const OgImageExt = 'png';
export const OgImagePathSegment = '__og-image__/image/';

export const NuxtIslandPathSegment = '__nuxt_island/';
export const NuxtImagePathSegment = '_ipx/';

export const DbVersionDraft = -1;
export const DbVersionInitial = 0;
export type UninitializedPageTimestamp = 0;
export const HtmlPageTimestampTable = 'HtmlPageTimestamp';
export const HtmlPageTimestampColumnName = 'timestamp';
export const IdColumnName = 'id';
export const ModifiedTimeColumnName = 'modifiedUtc';
export const CreatedTimeColumnName = 'createdUtc';
export const QuickStartDbFile = 'dbase.db'; //'golobe-demo.db';
export const QuickStartDir = '.acsys'; //'.tmp';
export const AcsysExecDir = '.acsys';
export const AcsysFilesDir = 'files';
export const AcsysSQLiteDbName = 'dbase.db';
export const AcsysDraftsEntityPrefix = 'AcsysDrafts';

export enum SignUpResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  AUTOVERIFIED = 'AUTOVERIFIED'
}

export enum SignUpCompleteResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}

export enum RecoverPasswordResultEnum {
  SUCCESS = 'SUCCESS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED'
}

export enum RecoverPasswordCompleteResultEnum {
  SUCCESS = 'SUCCESS',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  LINK_INVALID = 'LINK_INVALID',
  LINK_EXPIRED = 'LINK_EXPIRED'
}

export const DEV_ENV_MODE = 'development';

export const MimeTypeWebp = 'image/webp';

export const TabIndicesUpdateDefaultTimeout = 100;
export const CroppingImageDataKey = 'current-cropping-image-data';
export const CroppingImageFormat = MimeTypeWebp;
export const TooltipHideTimeout = 2000;
export const DefaultUserCoverSlug = 'default-user-cover';
export const DefaultUserAvatarSlug = 'default-user-avatar';
export const MainTitleSlug = 'main-title';
export const FlightsTitleSlug = 'flights-title';
export const StaysTitleSlug = 'stays-title';

export const SecretValueMask = '********';
export const MaxListPropertyElementsCount = 256;

export const UserAccountTabAccount = 'account';
export const UserAccountTabHistory = 'history';
export const UserAccountTabPayments = 'payments';
export const UserAccountOptionButtonGroup = 'accountOptionButtonsGroup';
export const UserAccountOptionButtonAccount = `${UserAccountOptionButtonGroup}-${UserAccountTabAccount}`;
export const UserAccountOptionButtonHistory = `${UserAccountOptionButtonGroup}-${UserAccountTabHistory}`;
export const UserAccountOptionButtonPayments = `${UserAccountOptionButtonGroup}-${UserAccountTabPayments}`;

export const SearchFlightOffersDisplayOptions = 'searchFlightOffers-DisplayOptions';
export const SearchStayOffersDisplayOptions = 'searchStayOffers-DisplayOptions';

export const FavouritesOptionButtonGroup = 'favouritesOptBtnGrp';
export const FavouritesOptionButtonFlights = `${FavouritesOptionButtonGroup}-Flights`;
export const FavouritesOptionButtonStays = `${FavouritesOptionButtonGroup}-Stays`;

export const TabHistoryOptionButtonGroup = 'tabHistoryOptBtnGrp';
export const TabHistoryOptionButtonFlights = `${TabHistoryOptionButtonGroup}-Flights`;
export const TabHistoryOptionButtonStays = `${TabHistoryOptionButtonGroup}-Stays`;

export const SearchOffersFilterTabGroupId = 'search-offers-filter-panel-gid';

export const FlightMinPassengers = 1;
export const FlightMaxPassengers = 8;
export const DefaultFlightClass = 'economy';
export const StaysMaxRoomsCount = 4;
export const StaysMaxGuestsCount = 10;

export const WorldMapCityLabelFlipX = 0.85;
export const DefaultEmailTheme = <Theme>'light';

export const TravelDetailsHtmlAnchor = 'travelDetails';

export const CurrentUserGeoLocation = { lon: 0.0, lat: 0.0 };

export const DefaultStayReviewScore = 5;

export const SearchOffersPriceRange = { min: 0, max: 25000 };
export const SearchOffersPrimeOfferIterator = 9721;
/**
 * Maximum number of (departCity; arriveCity) variant pairs in case one of depart or arrive destination was not specified.
 * Don't change it as it will break offer's links to owning users on existing database.
 */
export const MaxOfferGenerationCityPairCount = 25;
/**
 * Maximum number of generated flight offers for specified depart/arrive city and flight date.
 * Don't change it as it will break offer's links to owning users on existing database.
 */
export const MaxOfferGenerationRouteFlightsCount = 10;
/**
 * Maximum number of nearest airline companies used in flight generation algorithm
 */
export const MaxOfferGenerationRouteCompaniesCount = 10;
/**
 * Allowed depart/return date adjustment in days for searched offers when "My Dates Are Flexible" flag is set
 */
export const FlexibleDatesRangeDays = 2;
/**
 * Limit to prevent out of memory exception when generating offers in memory in case something goes wrong in algorithm
 * Approx ranges for worst case: departDate * returnDate * (fromCity, toCity) * numFlightsPerRoute
 */
export const MaxOfferGenerationMemoryBufferItems = (2 * FlexibleDatesRangeDays + 1) * ((2 * FlexibleDatesRangeDays + 1)) * MaxOfferGenerationCityPairCount * MaxOfferGenerationRouteFlightsCount;
/**
 * Minimum increment in minutes between two adjusted flights
 * Must be divisor of 60
 */
export const FlightTimeOfDayIntervalMinutes = 15;

export const NumMinutesInDay = 1440;
export const MaxSearchHistorySize = 8;

export const DefaultFlightOffersSorting = 'score';
export const FlightsAirlineCompanyFilterId = 'FlightOffersAirlineCompanyFilterId';
export const FlightsDepartureTimeFilterId = 'FlightsDepartureTimeFilterId';
export const FlightsTripTypeFilterId = 'FlightOffersTripTypeFilterId';
export const FlightsRatingFilterId = 'FlightsRatingFilterId';
export const FlightsPriceFilterId = 'FlightsPriceFilterId';
// Search flight offers - trip options
export const FlightsTripTypeFilterFlexibleDatesItemId = 'FlightsTripTypeFilterFlexibleDatesItemId';
export const CheckInOutDateUrlFormat = 'YYYY-MM-DD';

export const DefaultStayOffersSorting = 'score';
export const StaysPriceFilterId = 'StaysPriceFilterId';
export const StaysRatingFilterId = 'StaysRatingFilterId';
export const StaysFreebiesFilterId = 'StaysFreebiesFilterId';
export const StaysFreebiesFilterItemId = (itemLabel: string) => `StaysFreebiesFilterItemId-${itemLabel}`;
export const StaysAmenitiesFilterId = 'StaysAmenitiesFilterId';
export const StaysAmenitiesFilterItemId = (itemLabel: string) => `StaysAmenitiesFilterItemId-${itemLabel}`;

export enum DeviceSizeEnum {
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL'
}

/** breakpoints for adaptive layout in pixels, see $breakpoints map in _utils.scss */
export const DeviceSizeS = 550;
export const DeviceSizeM = 872;
export const DeviceSizeL = 1040;
export const DeviceSizeXL = 1376;

export const MinPageWidth = 375;
export const MaxPageWidth = 1800;

export const getBreakpointForDevice = function (deviceSize: DeviceSizeEnum): number {
  switch (deviceSize) {
    case DeviceSizeEnum.S:
      return DeviceSizeS;
    case DeviceSizeEnum.M:
      return DeviceSizeM;
    case DeviceSizeEnum.L:
      return DeviceSizeL;
    case DeviceSizeEnum.XL:
      return DeviceSizeXL;
    default:
      throw new Error('unexpected device size');
  }
};

export const KeyCodeEsc = 'Escape';

// Id value for objects which have been not saved to DB
export const TemporaryEntityId = "TempID";
export const EntityIdRadix = 20;
/**
 * Radix {@link EntityIdRadix}
 */
export const EntityIdTestRegEx = /^[a-j0-9]{12,24}$/;

export function isTestEnv (): boolean {
  return import.meta.env.VITE_VITEST || process.env?.VITEST || process.env?.VITE_VITEST;
}

export function isDevEnv (): boolean {
  return import.meta.env.MODE === DEV_ENV_MODE || process.env?.NODE_ENV === DEV_ENV_MODE;
}

export function isDevOrTestEnv (): boolean {
  return isDevEnv() || isTestEnv();
}

export function isQuickStartEnv (): boolean {
  return import.meta.env.VITE_QUICKSTART;
}

export function isPublishEnv (): boolean {
  return !!process.env.PUBLISH;
}

export const PdfFontRegularFile = 'regular.ttf';
export const PdfFontMediumFile = 'medium.ttf';
export const PdfFontSemiboldFile = 'semibold.ttf';

export const PdfFontSizeScaleBase = 0.75;
export const PdfFontPrimarySize = 14 * PdfFontSizeScaleBase;
export const PdfFontParagraphTitleSize = 20 * PdfFontSizeScaleBase;
export const PdfFontMainTitleSize = 26 * PdfFontSizeScaleBase;

export const PdfDocMargins = {
  top: 15,
  left: 25,
  bottom: 30,
  right: 25
};

/** A4 paper size */
export const PdfPaperWidth: number = 595.28;
export const PdfPaperHeight: number = 841.89;

export const PdfImgWidth = PdfPaperWidth;
export const PdfBulletSize = 2;



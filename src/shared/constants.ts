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
export const AvailableLocaleCodes = Object.keys(LocaleEnum).map(x => x.toLowerCase());
export type Locale = Lowercase<keyof typeof LocaleEnum>;

export const DataKeyImageSrcSizes = 'ImageSrcSizes';
export const DataKeyEntityCacheItems = 'EntityCacheItems';
export const DataKeyWorldMapData = 'WorldMapData';
export const DataKeySearchFlightOffers = 'SearchFlightOffers';
export const DataKeySearchStayOffers = 'SearchStayOffers';
export const DataKeyStayDetailsReviews = (stayId: EntityId) => `StayDetailsReviews_${stayId}`;

export const SessionThemeKey = 'theme';
export const SessionLocaleKey = 'locale';
export const SessionStaySearchHistory = 'stay-search-history';

export const HeaderSetCookie = 'set-cookie';
export const HeaderCookies = 'cookie';
export const HeaderUserAgent = 'user-agent';
export const HeaderCacheControl = 'cache-control';
export const HeaderEtag = 'etag';
export const HeaderLastModified = 'last-modified';
export const HeaderLocation = 'location';
export const HeaderVaryRenderCache = 'x-golobe-cache-vary';

export const CookieAuthSessionToken = 'next-auth.session-token';
export const CookieAuthCallbackUrl = 'next-auth.callback-url';
export const CookieAuthCsrfToken = 'next-auth.csrf-token';
export const CookieSession = 'golobe-session';
export const CookieI18nLocale = 'i18n_redirected';
export const CookiePolicyConsent = 'cookie_and_privacy_policies';

export const ApiEndpointPrefix = '/api';
export const ApiEndpointLogging = `${ApiEndpointPrefix}/log`;
export const ApiEndpointAuthentication = `${ApiEndpointPrefix}/auth`;
export const ApiEndpointImage = `${ApiEndpointPrefix}/img`;
export const ApiEndpointImageDetails = `${ApiEndpointPrefix}/img/details`;
export const ApiEndpointImageList = `${ApiEndpointPrefix}/img/list`;
export const ApiEndpointSignUp = `${ApiEndpointPrefix}/account/signup`;
export const ApiEndpointSignUpComplete = `${ApiEndpointPrefix}/account/signup-complete`;
export const ApiEndpointPasswordRecovery = `${ApiEndpointPrefix}/account/recover-password`;
export const ApiEndpointPasswordRecoveryComplete = `${ApiEndpointPrefix}/account/recover-password-complete`;
export const ApiEndpointEmailVerifyComplete = `${ApiEndpointPrefix}/account/email-verify-complete`;
export const ApiEndpointNewsletterSubscribe = `${ApiEndpointPrefix}/newsletter-subscribe`;
export const ApiEndpointUserAccount = `${ApiEndpointPrefix}/user/account`;
export const ApiEndpointUserFavourites = `${ApiEndpointPrefix}/user/favourites`;
export const ApiEndpointUserTickets = `${ApiEndpointPrefix}/user/tickets`;
export const ApiEndpointUserImageUpload = `${ApiEndpointPrefix}/user/upload-image`;
export const ApiEndpointCitiesSearch = `${ApiEndpointPrefix}/cities/search`;
export const ApiEndpointPopularCitiesList = `${ApiEndpointPrefix}/popular-cities`;
export const ApiEndpointPopularCityTravelDetails = `${ApiEndpointPrefix}/popular-cities/travel-details`;
export const ApiEndpointCompanyReviewsList = `${ApiEndpointPrefix}/company-reviews`;
export const ApiEndpointEntityCache = `${ApiEndpointPrefix}/entity-cache`;
export const ApiEndpointFlightOffersSearch = `${ApiEndpointPrefix}/flight-offers/search`;
export const ApiEndpointFlightOfferDetails = (id: EntityId) => `${ApiEndpointPrefix}/flight-offers/${id}/details`;
export const ApiEndpointFlightOfferFavourite = (id: EntityId) => `${ApiEndpointPrefix}/flight-offers/${id}/favourite`;
export const ApiEndpointFlightOfferBook = (id: EntityId) => `${ApiEndpointPrefix}/flight-offers/${id}/book`;
export const ApiEndpointStayOffersSearch = `${ApiEndpointPrefix}/stay-offers/search`;
export const ApiEndpointStayOfferDetails = (id: EntityId) => `${ApiEndpointPrefix}/stay-offers/${id}/details`;
export const ApiEndpointStayOfferFavourite = (id: EntityId) => `${ApiEndpointPrefix}/stay-offers/${id}/favourite`;
export const ApiEndpointStayOfferBook = (id: EntityId) => `${ApiEndpointPrefix}/stay-offers/${id}/book`;
export const ApiEndpointStayOffersSearchHistory = `${ApiEndpointPrefix}/stay-offers/search-history`;
export const ApiEndpointStayReviews = (id: EntityId) => `${ApiEndpointPrefix}/stays/${id}/reviews`;

export const ApiEndpointBookingDetails = (id: EntityId) => `${ApiEndpointPrefix}/booking/${id}`;
export const ApiEndpointBookingOffer = (id: EntityId) => `${ApiEndpointPrefix}/booking/${id}/offer`;
export const ApiEndpointBookingDownload = (id: EntityId) => `${ApiEndpointPrefix}/booking/${id}/download`;

export const MaxStayReviewLength = 8000;

export enum PagePath {
  Account = 'account',
  Favourites = 'favourites',
  EmailVerifyComplete = 'email-verify-complete',
  FindFlights = 'find-flights',
  FindStays = 'find-stays',
  FlightDetails = 'flight-details',
  BookFlight = 'flight-book',
  Flights = 'flights',
  ForgotPasswordComplete = 'forgot-password-complete',
  ForgotPasswordSet = 'forgot-password-set',
  ForgotPasswordVerify = 'forgot-password-verify',
  ForgotPassword = 'forgot-password',
  Index = '',
  Login = 'login',
  Privacy = 'privacy',
  SignupComplete = 'signup-complete',
  SignupVerify = 'signup-verify',
  Signup = 'signup',
  Stays = 'stays',
  StayDetails = 'stay-details',
  BookStay = 'stay-book',
  BookingDetails = 'booking'
}
export const AllPagePaths = Object.values(PagePath);
export const EntityIdPages: PagePath[] = [PagePath.FlightDetails, PagePath.BookFlight, PagePath.StayDetails, PagePath.BookStay, PagePath.BookingDetails];

export const OgImageExt = 'png';
export const OgImagePathSegment = '__og-image__/image/';

export const DbVersionDraft = -1;
export const DbVersionInitial = 0;

export const DEV_ENV_MODE = 'development';

export const TabIndicesUpdateDefaultTimeout = 100;
export const CroppingImageDataKey = 'current-cropping-image-data';
export const CroppingImageFormat = 'image/webp';
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
export const TemporaryEntityId = -1;

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

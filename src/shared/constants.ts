export enum LogLevelEnum {
  'debug' = 10,
  'verbose' = 20,
  'info' = 30,
  'warn' = 40,
  'error' = 50
}
export type LogLevel = keyof typeof LogLevelEnum;

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

export enum LocaleEnum {
  EN = 'en',
  RU = 'ru',
  FR = 'fr'
}
export const DefaultLocale = 'en';
export const AvailableLocaleCodes = Object.keys(LocaleEnum).map(x => x.toLowerCase());
export type Locale = Lowercase<keyof typeof LocaleEnum>;

export class NuxtDataKeys {
  public static readonly UserNotifications = 'UserNotifications';
  public static readonly BrowserSession = 'BrowserSession';
  public static readonly ImageSrcSizes = 'ImageSrcSizes';
  public static readonly EntityCacheItems = 'EntityCacheItems';
  public static readonly WorldMapData = 'WorldMapData';
  public static readonly SearchFlightOffers = 'SearchFlightOffers';
  public static readonly SearchStayOffers = 'SearchStayOffers';
}

export class SessionConstants {
  public static readonly ThemeKey = 'theme';
  public static readonly LocaleKey = 'locale';
}

export class CookieNames {
  public static readonly AuthSessionToken = 'next-auth.session-token';
  public static readonly AuthCallbackUrl = 'next-auth.callback-url';
  public static readonly AuthCsrfToken = 'next-auth.csrf-token';
  public static readonly SessionId = 'golobe-sessionId';
  public static readonly I18nLocale = 'i18n_redirected';
  public static readonly CookieAndPolicyConsent = 'cookie_and_privacy_policies';
}

export class WebApiRoutes {
  public static readonly Prefix = '/api';

  public static readonly Logging = `${this.Prefix}/log`;
  public static readonly Authentication = `${this.Prefix}/auth`;
  public static readonly SessionManagement = `${this.Prefix}/session`;
  public static readonly Image = `${this.Prefix}/img`;
  public static readonly ImageDetails = `${this.Prefix}/img/details`;
  public static readonly ImageList = `${this.Prefix}/img/list`;
  public static readonly SignUp = `${this.Prefix}/account/signup`;
  public static readonly SignUpComplete = `${this.Prefix}/account/signup-complete`;
  public static readonly PasswordRecovery = `${this.Prefix}/account/recover-password`;
  public static readonly PasswordRecoveryComplete = `${this.Prefix}/account/recover-password-complete`;
  public static readonly EmailVerifyComplete = `${this.Prefix}/account/email-verify-complete`;
  public static readonly NewsletterSubscribe = `${this.Prefix}/newsletter-subscribe`;
  public static readonly UserAccount = `${this.Prefix}/user/account`;
  public static readonly UserImageUpload = `${this.Prefix}/user/upload-image`;
  public static readonly CitiesSearch = `${this.Prefix}/cities/search`;
  public static readonly PopularCitiesList = `${this.Prefix}/popular-cities`;
  public static readonly PopularCityTravelDetails = `${this.Prefix}/popular-cities/travel-details`;
  public static readonly CompanyReviewsList = `${this.Prefix}/company-reviews`;
  public static readonly EntityCache = `${this.Prefix}/entity-cache`;
  public static readonly FlightsSearch = `${this.Prefix}/flights/search`;
  public static readonly FlightsFavourite = `${this.Prefix}/flights/favourite`;
  public static readonly StaysSearch = `${this.Prefix}/stays/search`;
  public static readonly StaysFavourite = `${this.Prefix}/stays/favourite`;

  public static readonly ImageCacheLatency = 5 * 60; // maxAge HTTP caching option
  public static readonly OneDayCacheLatency = 24 * 60 * 60; // maxAge HTTP caching option
  public static readonly OneHourCacheLatency = 60 * 60; // maxAge HTTP caching option
}

export class DbConcurrencyVersions {
  public static readonly DraftVersion = -1;
  public static readonly InitialVersion = 0;
}

export const DEV_ENV_MODE = 'development';

export const TabIndicesUpdateDefaultTimeout = 100;
export const CssVarPrefix = 'glb';
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
export class UIControlKeys {
  static readonly UserAccountOptionButtonAccount = 'accountOptBtnGrp-Account';
  static readonly UserAccountOptionButtonHistory = 'accountOptBtnGrp-History';
  static readonly UserAccountOptionButtonPayments = 'accountOptBtnGrp-Payments';

  static readonly SearchFlightOffersDisplayOptions = 'searchFlightOffers-DisplayOptions';
  static readonly SearchStayOffersDisplayOptions = 'searchStayOffers-DisplayOptions';
};

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

export const DefaultStayReviewScore = 4;

export class SearchOffersListConstants {
  public static readonly Price = { min: 0, max: 25000 };

  public static readonly PrimeOfferIterator = 9721;
  /**
   * Maximum number of (departCity; arriveCity) variant pairs in case one of depart or arrive destination was not specified.
   * Don't change it as it will break offer's links to owning users on existing database.
   */
  public static readonly MaxOfferGenerationCityPairCount = 25;
  /**
   * Maximum number of generated flight offers for specified depart/arrive city and flight date.
   * Don't change it as it will break offer's links to owning users on existing database.
   */
  public static readonly MaxOfferGenerationRouteFlightsCount = 10;
  /**
   * Maximum number of nearest airline companies used in flight generation algorithm
   */
  public static readonly MaxOfferGenerationRouteCompaniesCount = 10;
  /**
   * Allowed depart/return date adjustment in days for searched offers when "My Dates Are Flexible" flag is set
   */
  public static readonly FlexibleDatesRangeDays = 2;
  /**
   * Limit to prevent out of memory exception when generating offers in memory in case something goes wrong in algorithm
   * Approx ranges for worst case: departDate * returnDate * (fromCity, toCity) * numFlightsPerRoute
   */
  public static readonly MaxOfferGenerationMemoryBufferItems = (2 * this.FlexibleDatesRangeDays + 1) * ((2 * this.FlexibleDatesRangeDays + 1)) * this.MaxOfferGenerationCityPairCount * this.MaxOfferGenerationRouteFlightsCount;
  /**
   * Minimum increment in minutes between two adjusted flights
   * Must be divisor of 60
   */
  public static readonly FlightTimeOfDayIntervalMinutes = 15;

  public static readonly NumMinutesInDay = 1440;

  public static readonly DefaultFlightOffersSorting = 'score';
  public static readonly FlightsAirlineCompanyFilterId = 'FlightOffersAirlineCompanyFilterId';
  public static readonly FlightsDepartureTimeFilterId = 'FlightsDepartureTimeFilterId';
  public static readonly FlightsTripTypeFilterId = 'FlightOffersTripTypeFilterId';
  public static readonly FlightsRatingFilterId = 'FlightsRatingFilterId';
  public static readonly FlightsPriceFilterId = 'FlightsPriceFilterId';
  // Search flight offers - trip options
  public static readonly FlightsTripTypeFilterFlexibleDatesItemId = 'FlightsTripTypeFilterFlexibleDatesItemId';

  public static readonly DefaultStayOffersSorting = 'score';
  public static readonly StaysPriceFilterId = 'StaysPriceFilterId';
  public static readonly StaysRatingFilterId = 'StaysRatingFilterId';
  public static readonly StaysFreebiesFilterId = 'StaysFreebiesFilterId';
  public static readonly StaysFreebiesFilterItemId = (itemLabel: string) => `StaysFreebiesFilterItemId-${itemLabel}`;
  public static readonly StaysAmenitiesFilterId = 'StaysAmenitiesFilterId';
  public static readonly StaysAmenitiesFilterItemId = (itemLabel: string) => `StaysAmenitiesFilterItemId-${itemLabel}`;
};

export enum DeviceSizeEnum {
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL'
}

/** breakpoints for adaptive layout in pixels, see $breakpoints map in _utils.scss */
export class WindowBreakpoints {
  public static readonly S = 550;
  public static readonly M = 872;
  public static readonly L = 1040;
  public static readonly XL = 1376;

  public static readonly MinPageWidth = 375;
  public static readonly MaxPageWidth = 1800;

  public static readonly getBreakpointForDevice = function (deviceSize: DeviceSizeEnum): number {
    switch (deviceSize) {
      case DeviceSizeEnum.S:
        return WindowBreakpoints.S;
      case DeviceSizeEnum.M:
        return WindowBreakpoints.M;
      case DeviceSizeEnum.L:
        return WindowBreakpoints.L;
      case DeviceSizeEnum.XL:
        return WindowBreakpoints.XL;
      default:
        throw new Error('unexpected device size');
    }
  };
};

// Id value for objects which have been not saved to DB
export const TemporaryEntityId = -1;
